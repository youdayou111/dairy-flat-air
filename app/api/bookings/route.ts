import { NextResponse } from "next/server";
import { findFlightById } from "@/lib/airline";
import { getDb, requireDbMessage } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type PassengerInput = {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function bookingRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `DFA-${suffix}`;
}

function cleanPassenger(passenger: PassengerInput) {
  return {
    title: String(passenger.title || "").trim(),
    firstName: String(passenger.firstName || "").trim(),
    lastName: String(passenger.lastName || "").trim(),
    email: String(passenger.email || "").trim().toLowerCase()
  };
}

async function openDb() {
  try {
    return await getDb();
  } catch (error) {
    console.error("MongoDB connection failed", error);
    return null;
  }
}

export async function GET(request: Request) {
  const db = await openDb();
  if (!db) {
    return NextResponse.json({ error: requireDbMessage() }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const ref = searchParams.get("ref")?.trim().toUpperCase();

  if (!email && !ref) {
    return NextResponse.json({ error: "Provide an email address or booking reference." }, { status: 400 });
  }

  const query = ref ? { bookingRef: ref } : { "passenger.email": email };
  try {
    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ createdAt: -1 })
      .project({ _id: 0 })
      .toArray();

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Booking lookup failed", error);
    return NextResponse.json({ error: "Unable to fetch bookings from MongoDB." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const db = await openDb();
  if (!db) {
    return NextResponse.json({ error: requireDbMessage() }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const flightId = String(body?.flightId || "");
  const flight = findFlightById(flightId);
  const passenger = cleanPassenger(body?.passenger || {});

  if (!flight) {
    return NextResponse.json({ error: "The selected flight could not be found." }, { status: 400 });
  }

  if (!passenger.firstName || !passenger.lastName || !passenger.email.includes("@")) {
    return NextResponse.json({ error: "Passenger first name, last name, and email are required." }, { status: 400 });
  }

  try {
    const bookings = db.collection("bookings");
    const bookedSeats = await bookings.countDocuments({ flightId, status: "confirmed" });
    if (bookedSeats >= flight.capacity) {
      return NextResponse.json({ error: "This flight is full. Please select another service." }, { status: 409 });
    }

    let ref = bookingRef();
    while (await bookings.findOne({ bookingRef: ref })) {
      ref = bookingRef();
    }

    const booking = {
      bookingRef: ref,
      flightId,
      passenger,
      schedule: flight,
      price: flight.price,
      status: "confirmed",
      createdAt: new Date().toISOString()
    };

    await bookings.insertOne(booking);

    await db.collection("passengers").updateOne(
      { email: passenger.email },
      {
        $set: {
          ...passenger,
          updatedAt: new Date().toISOString()
        },
        $setOnInsert: { createdAt: new Date().toISOString() }
      },
      { upsert: true }
    );

    return NextResponse.json({ booking: { ...booking, _id: undefined } }, { status: 201 });
  } catch (error) {
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Unable to save booking in MongoDB." }, { status: 500 });
  }
}
