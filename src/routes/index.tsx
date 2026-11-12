import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeCheck, BusFront, CalendarDays,
  CarFront, Check, ChevronDown, Clock3, Copy, MapPin, MessageCircle, Minus, Plus, Radio,
  Route as RouteIcon, ShieldCheck, SlidersHorizontal, Sparkles, TrainFront, Users, Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import campusRideImage from "@/assets/campuspool-ride.jpg";
import {
  availableSeats, CURRENT_STUDENT, fareIfFull, farePerPerson, fareSavings,
  formatTime, orderedPassengers, PICKUP_POINTS, SEED_POOLS, suggestedFare, timePeriod, TRANSIT_HUBS,
  type Direction, type Luggage, type Pool, type PoolMessage,
} from "@/lib/campuspool";

type Tab = "Find a Cab" | "Post a Trip" | "My Active Pools" | "Fare Estimator";
type Period = "Any time" | "Early morning" | "Afternoon" | "Evening" | "Late night";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusPool | TIET student rides, together" },
      { name: "description", content: "Find or create a verified student ride between TIET Patiala and nearby railway stations, airports, and transit hubs." },
      { property: "og:title", content: "CampusPool | TIET student rides, together" },
      { property: "og:description", content: "Share the ride, split the fare, and make every trip between TIET Patiala and home easier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampusPoolApp,
});

const TABS: Tab[] = ["Find a Cab", "Post a Trip", "My Active Pools", "Fare Estimator"];
const TIME_FILTERS: Period[] = ["Any time", "Early morning", "Afternoon", "Evening", "Late night"];
const formatRupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const niceDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function CampusPoolApp() {
  const [pools, setPools] = useState<Pool[]>(SEED_POOLS);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("Find a Cab");
  const [direction, setDirection] = useState<Direction>("Home");
  const [pickupPlace, setPickupPlace] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [period, setPeriod] = useState<Period>("Any time");
  const [seatsOnly, setSeatsOnly] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [members, setMembers] = useState(4);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("campuspool.pools.v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Pool[];
        if (Array.isArray(parsed)) setPools(parsed);
      }
    } catch {
      toast.error("Saved trips could not be restored. Showing the campus demo trips.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("campuspool.pools.v1", JSON.stringify(pools));
    } catch {
      toast.error("This browser could not save your latest pool changes.");
    }
  }, [pools, hydrated]);

  const selectedPool = pools.find((pool) => pool.id === selectedPoolId) ?? null;
  const myPools = pools.filter((pool) => pool.passengers.some((person) => person.id === CURRENT_STUDENT.id));
  const filteredPools = useMemo(() => pools.filter((pool) => {
    if (pool.direction !== direction) return false;
    const pickupQuery = pickupPlace.trim().toLowerCase();
    if (pickupQuery) {
      const matchesPickup = direction === "Home"
        ? pool.passengers.some((passenger) => passenger.pickup.toLowerCase().includes(pickupQuery)) || "tiet patiala".includes(pickupQuery)
        : pool.destination.toLowerCase().includes(pickupQuery);
      if (!matchesPickup) return false;
    }
    const destinationQuery = destination.trim().toLowerCase();
    if (destinationQuery) {
      const matchesDestination = direction === "Home"
        ? pool.destination.toLowerCase().includes(destinationQuery)
        : "tiet patiala".includes(destinationQuery) || "thapar institute of engineering & technology".includes(destinationQuery);
      if (!matchesDestination) return false;
    }
    if (travelDate && pool.date !== travelDate) return false;
    if (period !== "Any time" && timePeriod(pool.departureStart).toLowerCase() !== period.toLowerCase()) return false;
    if (seatsOnly && availableSeats(pool) === 0) return false;
    return true;
  }), [pools, direction, destination, travelDate, period, seatsOnly]);
  const savings = fareSavings(1500, members);

  const changeTab = (next: Tab) => {
    setTab(next);
    if (next === "Post a Trip") setNewMessage("");
  };

  const joinPool = (pool: Pool) => {
    if (pool.passengers.some((person) => person.id === CURRENT_STUDENT.id)) {
      setSelectedPoolId(pool.id);
      toast("You're already in this pool", { description: "Open your pool to see the route and group messages." });
      return;
    }
    if (availableSeats(pool) === 0) {
      toast.error("This pool is full", { description: "Try another departure or post a new trip." });
      return;
    }
    setPools((current) => current.map((item) => item.id === pool.id
      ? { ...item, passengers: [...item.passengers, CURRENT_STUDENT] }
      : item));
    setSelectedPoolId(pool.id);
    toast.success("You joined the ride", { description: `${pool.destination} · ${formatRupees(Math.ceil(pool.estimatedFare / (pool.passengers.length + 1)))}/person at the current size` });
  };

  const leavePool = (poolId: string) => {
    const leavingPool = pools.find((pool) => pool.id === poolId);
    setPools((current) => current.flatMap((pool) => {
      if (pool.id !== poolId) return [pool];
      const passengers = pool.passengers.filter((person) => person.id !== CURRENT_STUDENT.id);
      return passengers.length ? [{ ...pool, passengers }] : [];
    }));
    setSelectedPoolId(null);
    toast.success("You left the pool", { description: "Your seat is available to another student." });
    if (leavingPool) setTab("My Active Pools");
  };

  const copyPoolLink = async (pool: Pool) => {
    const shareText = `${pool.destination} · ${niceDate(pool.date)} · ${formatTime(pool.departureStart)}–${formatTime(pool.departureEnd)} — CampusPool at TIET Patiala`;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?pool=${encodeURIComponent(pool.id)}\n${shareText}`);
      toast.success("Ride link copied", { description: "Share it with a TIET friend joining the same trip." });
    } catch {
      toast.error("Could not copy the link", { description: shareText });
    }
  };

  const addMessage = (pool: Pool) => {
    const text = newMessage.trim();
    if (!text) return;
    const message: PoolMessage = { id: `m-${Date.now()}`, author: CURRENT_STUDENT.name.split(" ")[0] ?? "You", text, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) };
    setPools((current) => current.map((item) => item.id === pool.id ? { ...item, messages: [...item.messages, message] } : item));
    setNewMessage("");
    toast.success("Message sent to your pool");
  };

  const createPool = (pool: Pool) => {
    setPools((current) => [pool, ...current]);
    setDirection(pool.direction);
    setDestination("");
    setTravelDate("");
    setPeriod("Any time");
    setSeatsOnly(false);
    setTab("My Active Pools");
    setSelectedPoolId(pool.id);
    toast.success("Your trip is live", { description: "It’s now visible to students travelling from TIET." });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filteredPools.length) {
      toast.success(`${filteredPools.length} ${filteredPools.length === 1 ? "ride" : "rides"} match your trip`);
    } else {
      toast("No shared rides yet", { description: "Post your trip and invite fellow TIET students to join." });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10">
          <button type="button" onClick={() => changeTab("Find a Cab")} className="flex shrink-0 items-center gap-2.5 text-left" aria-label="CampusPool home">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><CarFront className="size-5" /></span>
            <span><span className="block font-display text-lg font-bold leading-tight">CampusPool</span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">TIET Patiala</span></span>
          </button>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {TABS.map((item) => <Button key={item} variant={tab === item ? "secondary" : "ghost"} size="sm" onClick={() => changeTab(item)} className={tab === item ? "font-semibold text-primary" : "text-muted-foreground"}>{item}</Button>)}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Campus safety" title="Campus safety" onClick={() => setShowSafety(true)} className="border-primary/20 text-primary"><ShieldCheck /></Button>
            <div className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
              <div className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">AS</div>
              <div className="leading-tight"><div className="flex items-center gap-1 text-xs font-semibold"><BadgeCheck className="size-3.5 text-primary" /> Verified student</div><div className="mt-1 text-[10px] text-muted-foreground">22BCS104 · Hostel J</div></div>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-1.5 lg:hidden" aria-label="Main navigation">
          {TABS.map((item) => <Button key={item} variant={tab === item ? "secondary" : "ghost"} size="sm" onClick={() => changeTab(item)} className="shrink-0 text-xs">{item}</Button>)}
        </nav>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-7 sm:pt-9 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5 text-primary" /><span className="font-semibold text-foreground">Thapar Institute of Engineering & Technology</span><span className="hidden sm:inline">· Patiala, Punjab</span></div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary" onClick={() => setShowSafety(true)}><ShieldCheck className="size-4" /> Campus safety <ArrowRight className="size-3" /></Button>
        </div>

        {tab === "Find a Cab" && <FindTrips
          direction={direction} setDirection={setDirection} pickupPlace={pickupPlace} setPickupPlace={setPickupPlace} destination={destination} setDestination={setDestination}
          travelDate={travelDate} setTravelDate={setTravelDate} period={period} setPeriod={setPeriod}
          seatsOnly={seatsOnly} setSeatsOnly={setSeatsOnly} pools={filteredPools} totalCount={pools.filter((p) => p.direction === direction).length}
          onJoin={joinPool} onDetails={setSelectedPoolId} onPost={() => changeTab("Post a Trip")} onFare={() => changeTab("Fare Estimator")} onSearch={submitSearch} myPoolIds={myPools.map((pool) => pool.id)}
        />}
        {tab === "Post a Trip" && <PostTrip onCreate={createPool} onBack={() => changeTab("Find a Cab")} />}
        {tab === "My Active Pools" && <MyPools pools={myPools} onDetails={setSelectedPoolId} onBrowse={() => changeTab("Find a Cab")} onPost={() => changeTab("Post a Trip")} />}
        {tab === "Fare Estimator" && <FareEstimator members={members} setMembers={setMembers} savings={savings} onFind={() => changeTab("Find a Cab")} />}
      </main>

      <PoolDetails pool={selectedPool} open={Boolean(selectedPool)} onOpenChange={(open) => !open && setSelectedPoolId(null)} onLeave={leavePool} onCopy={copyPoolLink} newMessage={newMessage} setNewMessage={setNewMessage} onMessage={addMessage} />
      <SafetyDialog open={showSafety} onOpenChange={setShowSafety} />
    </div>
  );
}

type FiltersProps = {
  direction: Direction; setDirection: (value: Direction) => void; pickupPlace: string; setPickupPlace: (value: string) => void; destination: string; setDestination: (value: string) => void;
  travelDate: string; setTravelDate: (value: string) => void; period: Period; setPeriod: (value: Period) => void;
  seatsOnly: boolean; setSeatsOnly: (value: boolean) => void; pools: Pool[]; totalCount: number;
  onJoin: (pool: Pool) => void; onDetails: (id: string) => void; onPost: () => void; onFare: () => void; onSearch: (event: React.FormEvent<HTMLFormElement>) => void; myPoolIds: string[];
};

function FindTrips(props: FiltersProps) {
  const { direction, setDirection, pickupPlace, setPickupPlace, destination, setDestination, travelDate, setTravelDate, period, setPeriod, seatsOnly, setSeatsOnly, pools, totalCount, onJoin, onDetails, onPost, onFare, onSearch, myPoolIds } = props;
  return <>
    <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-label="Find a shared ride">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 text-xs font-semibold text-primary"><BadgeCheck className="size-4" /> TIET Patiala student rides</div><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Where are you heading?</h1><p className="mt-1 text-sm text-muted-foreground">Find a ride with fellow students and split the fare.</p></div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1" aria-label="Trip direction">
              {(["Home", "To campus"] as const).map((value) => <Button key={value} type="button" size="sm" variant={direction === value ? "default" : "ghost"} onClick={() => { setDirection(value); setPickupPlace(""); setDestination(""); }} className="gap-1.5"><ArrowLeftRight className="size-3.5" />{value === "Home" ? "Going home" : "To campus"}</Button>)}
            </div>
          </div>
          <form onSubmit={onSearch} className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">PICKUP
                <span className="relative"><MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><Input list="place-suggestions" value={pickupPlace} onChange={(event) => setPickupPlace(event.target.value)} placeholder={direction === "Home" ? "TIET, hostel, gate or pickup point" : "Station, airport, bus stop or city"} aria-label="Pickup location" className="h-12 pl-9 text-sm" /><datalist id="place-suggestions">{["TIET Patiala", ...TRANSIT_HUBS, ...PICKUP_POINTS].map((place) => <option key={place} value={place} />)}</datalist></span>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">DROP-OFF
                <span className="relative"><MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><Input list="drop-suggestions" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder={direction === "Home" ? "Station, airport, bus stop or any city" : "TIET Patiala campus"} aria-label="Drop-off destination" className="h-12 pl-9 text-sm" /><datalist id="drop-suggestions">{[...TRANSIT_HUBS, "TIET Patiala", ...PICKUP_POINTS].map((place) => <option key={place} value={place} />)}</datalist></span>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">TRAVEL DATE<span className="relative"><CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><Input type="date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} className="h-12 pl-9 text-sm font-normal" aria-label="Travel date" /></span></label>
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">DEPARTURE WINDOW<span className="relative"><Clock3 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="h-12 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{TIME_FILTERS.map((time) => <option key={time}>{time}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></span></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={seatsOnly} onChange={(event) => setSeatsOnly(event.target.checked)} className="size-4 accent-primary" /> Seats available</label>
              <div className="flex w-full gap-2 sm:w-auto"><Button type="button" variant="outline" onClick={() => { setPickupPlace(""); setDestination(""); setTravelDate(""); setPeriod("Any time"); setSeatsOnly(false); }} className="gap-1.5"><SlidersHorizontal className="size-4" /> Reset</Button><Button type="submit" className="flex-1 gap-2 sm:min-w-40 sm:flex-none"><MapPin className="size-4" /> Find rides <ArrowRight className="size-4" /></Button></div>
            </div>
          </form>
        </div>
        <div className="relative min-h-40 overflow-hidden lg:min-h-full">
          <img src={campusRideImage} alt="Students sharing a ride from campus" width={1408} height={800} className="absolute inset-0 size-full object-cover object-[center_55%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/15 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-foreground/10 lg:to-foreground/60" />
          <div className="absolute inset-x-5 bottom-4 text-primary-foreground lg:inset-x-6 lg:bottom-6"><div className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheck className="size-4" /> Student community</div><p className="mt-1 text-sm font-medium">{totalCount} shared {totalCount === 1 ? "ride" : "rides"} open for this direction</p></div>
        </div>
      </div>
    </section>

    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Rides for your route</h2><p className="mt-1 text-sm text-muted-foreground">Browse student trips and see the fare before you join.</p></div><div className="flex items-center gap-2"><Badge variant="secondary" className="font-semibold">{pools.length} {pools.length === 1 ? "ride" : "rides"}</Badge><Button variant="ghost" size="sm" onClick={onPost} className="gap-1.5 text-primary"><Plus className="size-4" /> Post a trip</Button></div></div>
    {pools.length === 0 ? <EmptyRides onPost={onPost} /> : <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{pools.map((pool) => <PoolCard key={pool.id} pool={pool} isMine={myPoolIds.includes(pool.id)} onJoin={() => onJoin(pool)} onDetails={() => onDetails(pool.id)} />)}</div>}
    <section className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Wallet className="size-5" /></div><div><div className="text-sm font-semibold">Know your fare before you go</div><div className="text-xs text-muted-foreground">See how a shared ride compares with a solo taxi.</div></div></div><Button variant="outline" onClick={onFare} className="gap-2 self-start sm:self-auto">Open fare estimator <ArrowRight className="size-4" /></Button></section>
  </>;
}

function PoolCard({ pool, isMine, onJoin, onDetails }: { pool: Pool; isMine: boolean; onJoin: () => void; onDetails: () => void }) {
  const seats = availableSeats(pool);
  const full = seats === 0;
  return <Card className="group overflow-hidden rounded-xl border-border bg-card p-0 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="gap-1.5 bg-secondary text-secondary-foreground"><HubIcon hub={pool.destination} /><span className="truncate">{pool.destination}</span></Badge><Badge variant="outline" className={full ? "border-destructive/25 text-destructive" : "border-primary/25 text-primary"}>{full ? "Full" : `${seats} ${seats === 1 ? "seat" : "seats"} left`}</Badge></div><button type="button" onClick={onDetails} className="mt-2 block text-left text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">{pool.direction === "Home" ? "From TIET · going home" : "To TIET Patiala"}</button></div><div className="shrink-0 text-right"><div className="flex items-center justify-end gap-1 text-xs font-semibold"><Clock3 className="size-3.5 text-primary" /> Arrive {formatTime(pool.arrivalTime)}</div><div className="mt-1 text-[11px] text-muted-foreground">{niceDate(pool.date)}</div></div></div>
    <button type="button" onClick={onDetails} className="block w-full px-5 pt-4 text-left"><div className="flex items-center justify-between rounded-lg bg-secondary/70 px-3.5 py-3"><div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pickup window</div><div className="mt-1 font-display text-base font-bold">{formatTime(pool.departureStart)} <span className="font-sans text-xs font-normal text-muted-foreground">to</span> {formatTime(pool.departureEnd)}</div></div><div className="max-w-[48%] text-right"><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transit connection</div><div className="mt-1 truncate text-xs font-semibold text-primary">{pool.transitDetail}</div></div></div></button>
    <button type="button" onClick={onDetails} className="block w-full px-5 py-4 text-left"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-muted-foreground">PASSENGERS <span className="font-normal">· tap for pool details</span></span><span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary"><RouteIcon className="size-3" /> {orderedPassengers(pool.passengers).map((p) => p.pickup.split(" ").at(-1)).join(" → ")} → hub</span></div><div className="mt-2.5 flex items-center gap-2">{Array.from({ length: pool.capacity }, (_, index) => { const passenger = pool.passengers[index]; return <div key={passenger?.id ?? `seat-${index}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background p-2"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${passenger ? "bg-primary/10 text-primary" : "border border-dashed border-border text-muted-foreground"}`}>{passenger?.initials ?? <Plus className="size-3.5" />}</span><span className="min-w-0 truncate text-[10px] font-medium text-muted-foreground">{passenger ? passenger.hostel : "Open seat"}</span></div>; })}</div></button>
    <div className="flex items-end justify-between gap-3 border-t border-border px-5 py-4"><div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your estimated share</div><div className="mt-1 font-display text-xl font-bold">{formatRupees(farePerPerson(pool))}<span className="ml-1 font-sans text-[11px] font-medium text-muted-foreground">/person now</span></div><div className="mt-0.5 text-[10px] text-muted-foreground">{formatRupees(fareIfFull(pool))}/person when full · {formatRupees(pool.estimatedFare)} total</div></div><Button onClick={isMine ? onDetails : onJoin} disabled={!isMine && full} size="sm" className="shrink-0 gap-1.5">{isMine ? <><Check className="size-3.5" /> Your pool</> : full ? "Pool full" : "Join pool"}</Button></div>
  </Card>;
}

function HubIcon({ hub }: { hub: string }) {
  if (hub.toLowerCase().includes("airport")) return <ArrowUpRight className="size-3.5" />;
  if (hub.toLowerCase().includes("isbt")) return <BusFront className="size-3.5" />;
  return <TrainFront className="size-3.5" />;
}

function EmptyRides({ onPost }: { onPost: () => void }) {
  return <div className="soft-grid flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center"><div className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground"><CarFront className="size-6" /></div><h3 className="mt-4 text-lg font-semibold">No rides match those filters</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">Plans can start with one person. Create a pool and let your TIET travel buddies find you.</p><Button onClick={onPost} className="mt-5 gap-2"><Plus className="size-4" /> Be the first to post this trip</Button></div>;
}

function PostTrip({ onCreate, onBack }: { onCreate: (pool: Pool) => void; onBack: () => void }) {
  const [tripDirection, setTripDirection] = useState<Direction>("Home");
  const [hub, setHub] = useState<string>("");
  const [customFare, setCustomFare] = useState<string>("");
  const [date, setDate] = useState("2026-11-14");
  const [arrival, setArrival] = useState("08:00");
  const [transit, setTransit] = useState("");
  const [luggage, setLuggage] = useState<Luggage>("1 suitcase");
  const [pickup, setPickup] = useState<string>("Hostel J");
  const [capacity, setCapacity] = useState<4 | 6>(4);
  const fare = Number(customFare) > 0 ? Number(customFare) : suggestedFare(hub) + (capacity === 6 ? 800 : 0);
  const canSubmit = Boolean(date && arrival && pickup.trim() && hub.trim());

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) { toast.error("Add a destination, date, arrival time, and pickup point."); return; }
    const hours = Number(arrival.split(":")[0] ?? 0);
    const departureStart = `${String((hours + 22) % 24).padStart(2, "0")}:${arrival.split(":")[1]}`;
    const departureEnd = `${String((hours + 22) % 24).padStart(2, "0")}:${String((Number(arrival.split(":")[1]) + 20) % 60).padStart(2, "0")}`;
    const routePool: Pool = {
      id: `pool-${Date.now()}`, direction: tripDirection, destination: hub.trim(), date,
      departureStart, departureEnd, arrivalTime: arrival,
      transitDetail: transit.trim() ? `${transit.trim()} · connection details` : "Flexible connection · add transit details in your pool",
      capacity, estimatedFare: fare,
      passengers: [{ ...CURRENT_STUDENT, pickup: pickup.trim(), luggage }], messages: [],
    };
    onCreate(routePool);
  };

  return <section className="mx-auto max-w-5xl">
    <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">A good trip starts here</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Post a new trip</h1><p className="mt-2 text-sm text-muted-foreground">Create a pool for your journey from TIET Patiala. Fellow students can join right away.</p></div><Button variant="outline" onClick={onBack} className="shrink-0 gap-2"><X className="size-4" /><span className="hidden sm:inline">Cancel</span></Button></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
      <form onSubmit={submit} className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <fieldset><legend className="mb-3 text-sm font-semibold">Which way are you travelling?</legend><div className="grid grid-cols-2 gap-2">{(["Home", "To campus"] as const).map((item) => <Button type="button" key={item} variant={tripDirection === item ? "default" : "outline"} onClick={() => setTripDirection(item)} className="h-11 gap-2"><ArrowLeftRight className="size-4" /> {item === "Home" ? "Leaving campus" : "Returning to TIET"}</Button>)}</div></fieldset>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">{tripDirection === "Home" ? "Where are you going?" : "Where are you starting from?"}<Input required list="place-suggestions-post" value={hub} onChange={(event) => setHub(event.target.value)} placeholder="Type any station, airport, bus stand or city" className="h-11" /><datalist id="place-suggestions-post">{TRANSIT_HUBS.map((item) => <option key={item} value={item} />)}</datalist></label><label className="grid gap-1.5 text-sm font-medium">Travel date<Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} min="2026-11-11" className="h-11" /></label><label className="grid gap-1.5 text-sm font-medium">Target arrival time<Input required type="time" value={arrival} onChange={(event) => setArrival(event.target.value)} className="h-11" /></label><label className="grid gap-1.5 text-sm font-medium">Train / flight number <span className="font-normal text-muted-foreground">(optional)</span><Input value={transit} onChange={(event) => setTransit(event.target.value)} placeholder="e.g. Vande Bharat 22448" className="h-11" /></label><label className="grid gap-1.5 text-sm font-medium">Pickup point<Input required list="pickup-suggestions" value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder="Hostel, gate or any spot" className="h-11" /><datalist id="pickup-suggestions">{PICKUP_POINTS.map((point) => <option key={point} value={point} />)}</datalist></label><label className="grid gap-1.5 text-sm font-medium">Total cab fare (₹) <span className="font-normal text-muted-foreground">(optional, we suggest {formatRupees(suggestedFare(hub) + (capacity === 6 ? 800 : 0))})</span><Input type="number" min={100} inputMode="numeric" value={customFare} onChange={(event) => setCustomFare(event.target.value)} placeholder={String(suggestedFare(hub) + (capacity === 6 ? 800 : 0))} className="h-11" /></label><label className="grid gap-1.5 text-sm font-medium">Your luggage<span className="relative"><select value={luggage} onChange={(event) => setLuggage(event.target.value as Luggage)} className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{(["Small bag", "1 suitcase", "Heavy luggage"] as const).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></span></label></div>
        <fieldset><legend className="mb-3 text-sm font-semibold">Cab size</legend><div className="grid grid-cols-2 gap-2">{([4, 6] as const).map((size) => <Button type="button" key={size} variant={capacity === size ? "default" : "outline"} onClick={() => setCapacity(size)} className="h-auto justify-start gap-3 px-3.5 py-3"><Users className="size-4 shrink-0" /><span className="text-left">{size} seats <span className="block text-[10px] font-normal opacity-75">{size === 4 ? "Standard cab" : "XL cab"}</span></span></Button>)}</div></fieldset>
        <div className="flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center"><p className="text-xs text-muted-foreground">By posting, you agree to coordinate pickup with your pool.</p><Button type="submit" disabled={!canSubmit} className="gap-2"><Plus className="size-4" /> Create my pool</Button></div>
      </form>
      <aside className="space-y-4"><div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><img src={campusRideImage} alt="Students sharing a ride from campus" loading="lazy" width={1408} height={800} className="h-36 w-full object-cover object-[center_52%]" /><div className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Wallet className="size-4" /> Fare preview</div><div className="mt-4 flex items-end justify-between"><div><div className="text-[11px] text-muted-foreground">Estimated cab fare</div><div className="mt-1 font-display text-2xl font-bold">{formatRupees(fare)}</div></div><Badge variant="secondary" className="mb-1">{capacity} seats</Badge></div><div className="my-4 h-px bg-border" /><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Your share to start</span><span className="font-semibold">{formatRupees(fare)}</span></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">If every seat fills</span><span className="font-semibold text-primary">{formatRupees(Math.ceil(fare / capacity))} / person</span></div><p className="mt-4 text-[11px] leading-5 text-muted-foreground">Fare is an estimate for planning; confirm the final cab fare with your group before booking.</p></div></div><div className="rounded-xl border border-primary/15 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" /> Student-first travel</div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Your TIET student profile and pickup details help your pool coordinate. Always confirm the car and fare as a group.</p></div></aside>
    </div>
  </section>;
}

function MyPools({ pools, onDetails, onBrowse, onPost }: { pools: Pool[]; onDetails: (id: string) => void; onBrowse: () => void; onPost: () => void }) {
  return <section><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Your upcoming journeys</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">My active pools</h1><p className="mt-2 text-sm text-muted-foreground">The rides you’ve joined and the trips you’ve posted.</p></div><Button onClick={onPost} className="gap-2"><Plus className="size-4" /> Post a trip</Button></div>{pools.length ? <div className="grid gap-4 lg:grid-cols-2">{pools.map((pool) => <PoolCard key={pool.id} pool={pool} isMine onJoin={() => onDetails(pool.id)} onDetails={() => onDetails(pool.id)} />)}</div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center"><div className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground"><RouteIcon className="size-6" /></div><h2 className="mt-4 text-lg font-semibold">No trips in your list yet</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">Join a ride heading your way or post a new trip to find your travel group.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button onClick={onBrowse}>Find a cab</Button><Button variant="outline" onClick={onPost}>Post a trip</Button></div></div>}</section>;
}

function FareEstimator({ members, setMembers, savings, onFind }: { members: number; setMembers: (count: number) => void; savings: { sharedFare: number; savings: number }; onFind: () => void }) {
  return <section className="mx-auto max-w-5xl"><div className="mb-7"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">More friends, lighter fare</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Fare & savings calculator</h1><p className="mt-2 text-sm text-muted-foreground">Compare a solo ride with a shared campus pool.</p></div><div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[1.2fr_0.8fr]"><div className="p-5 sm:p-8"><div className="flex items-center gap-2 text-sm font-semibold"><CarFront className="size-4 text-primary" /> Estimated ride to the station</div><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-lg border border-border bg-background p-4"><div className="text-xs text-muted-foreground">Solo taxi</div><div className="mt-2 font-display text-2xl font-bold">₹1,500</div><div className="mt-1 text-[10px] text-muted-foreground">One person pays all</div></div><div className="rounded-lg border border-primary/25 bg-primary/5 p-4"><div className="text-xs text-muted-foreground">CampusPool share</div><div className="mt-2 font-display text-2xl font-bold text-primary">{formatRupees(savings.sharedFare)}</div><div className="mt-1 text-[10px] text-muted-foreground">Per person · {members} travelling</div></div></div><div className="mt-7"><div className="mb-4 flex items-center justify-between"><label htmlFor="member-count" className="text-sm font-semibold">People sharing the ride</label><Badge variant="secondary" className="gap-1"><Users className="size-3" /> {members} of 4</Badge></div><Slider id="member-count" min={1} max={4} step={1} value={[members]} onValueChange={(value) => setMembers(value[0] ?? 1)} aria-label="Number of people sharing the ride" /><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Solo</span><span>Full cab</span></div></div></div><div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-8"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/75"><Sparkles className="size-4" /> Your savings</div><div className="mt-5 font-display text-4xl font-bold sm:text-5xl">{formatRupees(savings.savings)}</div><p className="mt-2 text-sm text-primary-foreground/75">less than a solo cab for this trip</p><div className="my-6 h-px bg-primary-foreground/20" /><div className="flex items-center justify-between text-xs"><span className="text-primary-foreground/75">Solo fare</span><span>₹1,500</span></div><div className="mt-3 flex items-center justify-between text-xs"><span className="text-primary-foreground/75">Your shared share</span><span>{formatRupees(savings.sharedFare)}</span></div><div className="mt-3 flex items-center justify-between text-xs"><span className="text-primary-foreground/75">Your share of the savings</span><span className="font-semibold">{formatRupees(savings.savings)}</span></div></div><Button variant="secondary" onClick={onFind} className="mt-8 w-full gap-2">Find a ride <ArrowRight className="size-4" /></Button></div></div><div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Minus className="mt-0.5 size-3.5 shrink-0" />Illustrative estimate using a ₹1,500 solo taxi fare. Actual fares vary by hub, time, and cab provider; agree on the booking and split together.</div></section>;
}

function PoolDetails({ pool, open, onOpenChange, onLeave, onCopy, newMessage, setNewMessage, onMessage }: { pool: Pool | null; open: boolean; onOpenChange: (open: boolean) => void; onLeave: (id: string) => void; onCopy: (pool: Pool) => void; newMessage: string; setNewMessage: (value: string) => void; onMessage: (pool: Pool) => void }) {
  if (!pool) return null;
  const passengers = orderedPassengers(pool.passengers);
  const isMine = pool.passengers.some((person) => person.id === CURRENT_STUDENT.id);
  const stopNames = [...new Set(passengers.map((person) => person.pickup))];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0"><div className="border-b border-border bg-secondary/60 px-5 py-5 pr-12 sm:px-7"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="gap-1"><HubIcon hub={pool.destination} />{pool.destination}</Badge><Badge variant="outline" className="border-primary/25 text-primary">{niceDate(pool.date)}</Badge></div><DialogHeader className="mt-3 text-left"><DialogTitle className="text-xl sm:text-2xl">Your ride group</DialogTitle><DialogDescription>{pool.direction === "Home" ? "From TIET Patiala · going home" : "Heading to TIET Patiala"} · Pickup {formatTime(pool.departureStart)}–{formatTime(pool.departureEnd)}</DialogDescription></DialogHeader><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />Arrive {formatTime(pool.arrivalTime)}</span><span className="flex items-center gap-1.5"><TrainFront className="size-3.5 text-primary" />{pool.transitDetail}</span><span className="flex items-center gap-1.5"><Wallet className="size-3.5 text-primary" />~{formatRupees(farePerPerson(pool))}/person</span></div></div><div className="space-y-6 p-5 sm:p-7"><section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Passengers</h3><Badge variant="secondary">{pool.passengers.length}/{pool.capacity} seats</Badge></div><div className="space-y-2">{passengers.map((person, index) => <div key={person.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{person.initials}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{person.name} {person.id === CURRENT_STUDENT.id && <span className="font-normal text-muted-foreground">(you)</span>}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{person.hostel} · {person.rollNo}</div></div><div className="text-right"><Badge variant="outline" className="text-[10px]">Pickup {index + 1}</Badge><div className="mt-1 text-[10px] text-muted-foreground">{person.luggage}</div></div></div>)}</div></section><section><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><RouteIcon className="size-4 text-primary" /> Pickup sequence</div><div className="relative ml-2 space-y-0 border-l border-dashed border-primary/40 pl-5">{stopNames.map((stop, index) => <div key={stop} className="relative flex min-h-12 items-center justify-between gap-3 border-b border-border/70 last:border-0"><span className="absolute -left-[25px] grid size-3 place-items-center rounded-full border-2 border-primary bg-background" /><span className="text-xs font-medium">Pickup {index + 1}: {stop}</span><span className="text-[10px] text-muted-foreground">{passengers.filter((person) => person.pickup === stop).map((person) => person.initials).join(" · ")}</span></div>)}<div className="relative flex items-center gap-2 pt-3 text-xs font-semibold text-primary"><MapPin className="absolute -left-[27px] size-4 bg-card" />Direct to {pool.destination}</div></div></section><section><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="size-4 text-primary" />Group messages</h3><span className="text-[10px] text-muted-foreground">Shared on this browser</span></div><div className="max-h-44 space-y-2 overflow-y-auto rounded-lg bg-secondary/50 p-3">{pool.messages.length ? pool.messages.map((message) => <div key={message.id} className="rounded-lg border border-border/70 bg-card px-3 py-2"><div className="flex justify-between gap-3"><span className="text-[11px] font-semibold">{message.author}</span><span className="text-[10px] text-muted-foreground">{message.time}</span></div><p className="mt-1 break-words text-xs">{message.text}</p></div>) : <p className="py-3 text-center text-xs text-muted-foreground">No messages yet. Say hello to your ride group.</p>}</div>{isMine && <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); onMessage(pool); }}><Input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Message your group…" aria-label="Group message" maxLength={240} /><Button type="submit" size="sm" disabled={!newMessage.trim()} aria-label="Send message"><ArrowRight className="size-4" /></Button></form>}</section><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => toast("WhatsApp group links are not connected", { description: "Copy the ride share link and invite your passengers in your own chat." })} className="gap-2"><MessageCircle className="size-4" /> Open group WhatsApp link</Button><Button variant="outline" onClick={() => onCopy(pool)} className="gap-2"><Copy className="size-4" /> Copy ride share link</Button></div>{isMine && <Button variant="ghost" onClick={() => onLeave(pool.id)} className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">Leave this pool</Button>}</div></DialogContent></Dialog>;
}

function SafetyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader className="text-left"><div className="mb-2 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-6" /></div><DialogTitle>Look out for each other</DialogTitle><DialogDescription>Simple ways to make every TIET journey feel safer.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><SafetyItem icon={<BadgeCheck className="size-4" />} title="TIET student community" detail="Student profiles show a campus roll number. This preview uses sample profiles; email sign-in is not connected." /><SafetyItem icon={<RouteIcon className="size-4" />} title="Share your route" detail="Pool members can see the agreed pickup stops and destination. Share your live location with someone you trust before you leave." /><SafetyItem icon={<ShieldCheck className="size-4" />} title="Agree before you ride" detail="Confirm the vehicle, pickup order, and final fare with every passenger before booking." /><div className="rounded-lg border border-border bg-secondary/60 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emergency help</div><a href="tel:112" className="mt-2 flex items-center justify-between gap-3"><span className="text-sm">India emergency response</span><span className="font-display text-xl font-bold text-primary">112 <ArrowRight className="inline size-4" /></span></a><p className="mt-2 text-[10px] leading-4 text-muted-foreground">For TIET campus security, use the current number in the institute directory; no campus contact is configured in this preview.</p></div></div><Button onClick={() => onOpenChange(false)} className="w-full">Got it</Button></DialogContent></Dialog>;
}

function SafetyItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">{icon}</div><div><div className="text-sm font-semibold">{title}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></div>;
}