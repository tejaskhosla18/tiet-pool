# Tiet Pool

Build a complete, production-ready, mobile-responsive web application named "CampusPool" — a verified campus ride-sharing and fare-splitting platform designed for college students traveling to and from railway stations and transit hubs.

Use a modern, clean UI with Tailwind CSS, Lucide React icons, and accessible components (cards, badges, modals, tabs, and status pills). Use a collegiate, tech-forward color palette: slate/zinc backgrounds, deep indigo or emerald accents, and crisp typography.

1. Architecture & Mock State Management:
- Implement complete client-side mock data with React state so all actions (creating a ride, joining a cab, leaving a group, filtering, and messaging) work interactively without needing an external backend.
- Persist state across tabs or reloads using `localStorage`.
- Seed the application with realistic initial data:
  * 4 pre-existing ride groups with varying statuses (e.g., "1/4 seats filled", "3/4 seats filled - 1 spot left", "Full").
  * Real transit hubs: Ambala Cantt Railway Station (Train), Chandigarh Airport (IXC), Delhi Kashmiri Gate ISBT, Patiala Railway Station.
  * Campus pickup points: Hostel A to M, Main Campus Gate 1, Gate 2, COS Complex.

2. Core Pages & Layout:
- Top Navigation Bar:
  * Brand Logo: "CampusPool" with a sleek car/navigation badge.
  * Active Tabs: "Find a Cab", "Post a Trip", "My Active Pools", and "Fare Estimator".
  * User Profile Badge: Shows "Verified Student" pill with roll number and hostel tag.
- Main Dashboard ("Find a Cab"):
  * Search & Filter Header: Filter by Destination Hub, Date picker, Departure Time Range (Early Morning, Afternoon, Evening, Late Night), and Available Seats toggle.
  * Live Active Pools Grid/List: Cards displaying:
    - Destination hub badge and expected arrival time.
    - Departure time window (e.g., "05:45 AM – 06:05 AM").
    - Linked train or flight detail (e.g., "Matches Vande Bharat 22448" or "Flight 6E-213").
    - Visual Seat Indicator: 4 passenger avatar slots showing occupied (with student initials/hostel) and open slots.
    - Per-person fare split breakdown: Total estimated cab cost (e.g., ₹1,400) automatically divided by current members (e.g., "₹350/person if full").
    - Sequential Pickup Sequence badge based on hostel route order.
    - "Join Pool" button that updates state immediately.
- "Post a Ride / New Pool" Modal or Drawer:
  * Fields: Destination Dropdown, Travel Date, Target Arrival Time, Specific Train/Flight Number (optional), Luggage Size (Small Bag, 1 Suitcase, Heavy), Preferred Hostel Pickup Point, Max Cab Capacity (default 4, or 6 for XL cabs).
  * Auto-calculated estimated fare and suggested per-seat split.
  * Form validation with instant submission that adds the new pool directly to the dashboard state.
- "Pool Detail & Passenger Hub" Modal:
  * Opens when clicking on any active group card.
  * Lists all joined passengers, their verified hostel block, and luggage counts.
  * Sequential Route Timeline: Visual stop-by-stop itinerary (e.g., Pickup 1: Hostel J -> Pickup 2: Hostel M -> Pickup 3: Gate 2 -> Direct to Ambala Cantt).
  * Action buttons: "Open Group WhatsApp Link", "Copy Ride Share Link", and "Leave Pool".
- "Fare & Savings Calculator" Widget:
  * Interactive slider comparing Solo Taxi Cost (₹1,500) vs CampusPool 4-way split (₹375), highlighting "You Save: ₹1,125".

3. Edge Cases & Polish:
- Provide empty-state displays if no rides match the filter, with a clear "Be the first to create a cab for this train" call-to-action button.
- Include a safety pill modal highlighting campus security features: "Only @college.edu verified logins", "Hostel-to-station tracking", and emergency safety contact numbers.
- Ensure all interactive buttons (Join, Leave, Copy, Filter, Submit) trigger responsive UI toasts or micro-interactions.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tiet-pool.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/83826f56-b797-4faf-8e8e-5225f3d17d5c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
