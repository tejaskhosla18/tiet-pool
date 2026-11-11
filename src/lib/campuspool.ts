export const TRANSIT_HUBS = [
  "Ambala Cantt Railway Station",
  "Chandigarh Airport (IXC)",
  "Delhi Kashmere Gate ISBT",
  "Patiala Railway Station",
] as const;

export const PICKUP_POINTS = [
  ...Array.from({ length: 13 }, (_, index) => `Hostel ${String.fromCharCode(65 + index)}`),
  "Main Campus Gate 1",
  "Main Campus Gate 2",
  "COS Complex",
] as const;

export type Direction = "Home" | "To campus";
export type Luggage = "Small bag" | "1 suitcase" | "Heavy luggage";
export type Passenger = {
  id: string;
  name: string;
  initials: string;
  rollNo: string;
  hostel: string;
  pickup: string;
  luggage: Luggage;
};
export type PoolMessage = { id: string; author: string; text: string; time: string };
export type Pool = {
  id: string;
  direction: Direction;
  destination: (typeof TRANSIT_HUBS)[number];
  date: string;
  departureStart: string;
  departureEnd: string;
  arrivalTime: string;
  transitDetail: string;
  capacity: 4 | 6;
  estimatedFare: number;
  passengers: Passenger[];
  messages: PoolMessage[];
};

export const CURRENT_STUDENT: Passenger = {
  id: "student-you",
  name: "Aarav Sharma",
  initials: "AS",
  rollNo: "22BCS104",
  hostel: "Hostel J",
  pickup: "Hostel J",
  luggage: "1 suitcase",
};

export const FARE_BY_HUB: Record<(typeof TRANSIT_HUBS)[number], number> = {
  "Ambala Cantt Railway Station": 1400,
  "Chandigarh Airport (IXC)": 1800,
  "Delhi Kashmere Gate ISBT": 2400,
  "Patiala Railway Station": 1200,
};

const passenger = (
  id: string,
  name: string,
  initials: string,
  rollNo: string,
  hostel: string,
  pickup: string,
  luggage: Luggage,
): Passenger => ({ id, name, initials, rollNo, hostel, pickup, luggage });

export const SEED_POOLS: Pool[] = [
  {
    id: "pool-ambala-1",
    direction: "Home",
    destination: TRANSIT_HUBS[0],
    date: "2026-11-14",
    departureStart: "05:45",
    departureEnd: "06:05",
    arrivalTime: "07:15",
    transitDetail: "Matches Vande Bharat 22448 · 07:40 AM",
    capacity: 4,
    estimatedFare: 1400,
    passengers: [
      CURRENT_STUDENT,
      passenger("p-riya", "Riya Mehta", "RM", "23ECE031", "Hostel M", "Hostel M", "Small bag"),
    ],
    messages: [
      { id: "m-1", author: "Riya", text: "I can bring the car charger!", time: "09:18" },
    ],
  },
  {
    id: "pool-ixc-1",
    direction: "Home",
    destination: TRANSIT_HUBS[1],
    date: "2026-11-14",
    departureStart: "08:10",
    departureEnd: "08:30",
    arrivalTime: "09:25",
    transitDetail: "Flight 6E-213 · 10:20 AM",
    capacity: 4,
    estimatedFare: 1800,
    passengers: [
      passenger("p-kabir", "Kabir Singh", "KS", "22ME118", "Hostel C", "Hostel C", "1 suitcase"),
      passenger("p-neha", "Neha Kapoor", "NK", "23CSE067", "Hostel J", "Hostel J", "Small bag"),
      passenger("p-ishaan", "Ishaan Gill", "IG", "22ECE045", "Hostel M", "Hostel M", "1 suitcase"),
    ],
    messages: [],
  },
  {
    id: "pool-delhi-1",
    direction: "To campus",
    destination: TRANSIT_HUBS[2],
    date: "2026-11-15",
    departureStart: "16:20",
    departureEnd: "16:40",
    arrivalTime: "17:45",
    transitDetail: "Matches Shatabdi 12046 · 06:15 PM",
    capacity: 4,
    estimatedFare: 2400,
    passengers: [
      passenger("p-simran", "Simran Kaur", "SK", "23BBA014", "Hostel A", "Hostel A", "Small bag"),
      passenger("p-arjun", "Arjun Bedi", "AB", "22CSE092", "Hostel J", "Hostel J", "1 suitcase"),
      passenger("p-meera", "Meera Sethi", "MS", "23ECE052", "Hostel M", "Hostel M", "1 suitcase"),
      passenger("p-dev", "Dev Malhotra", "DM", "22ME023", "Hostel D", "COS Complex", "Small bag"),
    ],
    messages: [],
  },
  {
    id: "pool-patiala-1",
    direction: "Home",
    destination: TRANSIT_HUBS[3],
    date: "2026-11-16",
    departureStart: "21:10",
    departureEnd: "21:30",
    arrivalTime: "22:20",
    transitDetail: "Train 14630 · 10:50 PM",
    capacity: 4,
    estimatedFare: 1200,
    passengers: [
      passenger("p-tara", "Tara Walia", "TW", "23CS042", "Hostel F", "Hostel F", "Heavy luggage"),
    ],
    messages: [],
  },
];

export function availableSeats(pool: Pick<Pool, "capacity" | "passengers">) {
  return Math.max(0, pool.capacity - pool.passengers.length);
}

export function farePerPerson(pool: Pick<Pool, "estimatedFare" | "passengers">) {
  return Math.ceil(pool.estimatedFare / Math.max(1, pool.passengers.length));
}

export function fareIfFull(pool: Pick<Pool, "estimatedFare" | "capacity">) {
  return Math.ceil(pool.estimatedFare / pool.capacity);
}

export function fareSavings(soloFare: number, members: number) {
  const sharedFare = Math.ceil(soloFare / Math.max(1, members));
  return { sharedFare, savings: soloFare - sharedFare };
}

export function pickupOrder(point: string) {
  const index = PICKUP_POINTS.indexOf(point as (typeof PICKUP_POINTS)[number]);
  return index < 0 ? PICKUP_POINTS.length : index;
}

export function orderedPassengers(passengers: Passenger[]) {
  return [...passengers].sort((a, b) => pickupOrder(a.pickup) - pickupOrder(b.pickup));
}

export function timePeriod(time: string): "Early morning" | "Afternoon" | "Evening" | "Late night" {
  const [hours] = time.split(":").map(Number);
  if (hours < 8) return "Early morning";
  if (hours >= 21 || hours < 4) return "Late night";
  if (hours < 17) return "Afternoon";
  return "Evening";
}

export function formatTime(time: string) {
  const [hoursValue, minutes] = time.split(":").map(Number);
  const hours = hoursValue % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${hoursValue >= 12 ? "PM" : "AM"}`;
}
