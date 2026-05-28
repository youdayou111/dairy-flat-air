import { NextResponse } from "next/server";
import { getDb, requireDbMessage } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { ref: string } }) {
  let db;
  try {
    db = await getDb();
  } catch (error) {
    console.error("MongoDB connection failed", error);
    db = null;
  }

  if (!db) {
    return NextResponse.json({ error: requireDbMessage() }, { status: 503 });
  }

  try {
    const bookingRef = params.ref.toUpperCase();
    const result = await db.collection("bookings").findOneAndUpdate(
      { bookingRef, status: "confirmed" },
      { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    if (!result) {
      return NextResponse.json({ error: "No active booking found for that reference." }, { status: 404 });
    }

    return NextResponse.json({ booking: result });
  } catch (error) {
    console.error("Booking cancellation failed", error);
    return NextResponse.json({ error: "Unable to cancel booking in MongoDB." }, { status: 500 });
  }
}
