import { NextResponse } from "next/server";
import { AIRPORTS, generateSchedules, isAirportCode, type AirportCode, type Flight } from "@/lib/airline";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

async function bookingCounts(flights: Flight[]) {
  const db = await getDb();
  if (!db || flights.length === 0) return new Map<string, number>();

  const rows = await db
    .collection("bookings")
    .aggregate<{ _id: string; seats: number }>([
      { $match: { status: "confirmed", flightId: { $in: flights.map((flight) => flight.flightId) } } },
      { $group: { _id: "$flightId", seats: { $sum: 1 } } }
    ])
    .toArray();

  return new Map(rows.map((row) => [row._id, row.seats]));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date1 = searchParams.get("date1");
  const date2 = searchParams.get("date2");
  const orig = searchParams.get("orig");
  const dest = searchParams.get("dest");

  if (!date1 || !date2) {
    return NextResponse.json({ error: "date1 and date2 are required." }, { status: 400 });
  }

  if (orig && !isAirportCode(orig)) {
    return NextResponse.json({ error: "Unknown origin airport." }, { status: 400 });
  }

  if (dest && !isAirportCode(dest)) {
    return NextResponse.json({ error: "Unknown destination airport." }, { status: 400 });
  }

  const originCode = orig && isAirportCode(orig) ? orig : undefined;
  const destinationCode = dest && isAirportCode(dest) ? dest : undefined;
  const db = await getDb();
  let flights: Flight[] = [];

  if (db) {
    flights = (await db
      .collection<Flight>("schedules")
      .find({
        ...(originCode ? { origin: originCode as AirportCode } : {}),
        ...(destinationCode ? { destination: destinationCode as AirportCode } : {}),
        departureIso: { $gte: `${date1}T00:00:00`, $lte: `${date2}T23:59:59~` }
      })
      .sort({ departureIso: 1 })
      .project({ _id: 0 })
      .toArray()) as Flight[];
  }

  if (flights.length === 0) {
    flights = generateSchedules(date1, date2, originCode, destinationCode);
  }

  const counts = await bookingCounts(flights);
  const schedules = flights.map((flight) => {
    const bookedSeats = counts.get(flight.flightId) || 0;
    return { ...flight, bookedSeats, seatsLeft: Math.max(flight.capacity - bookedSeats, 0) };
  });

  return NextResponse.json({
    airports: Object.values(AIRPORTS),
    schedules
  });
}
