import { NextResponse } from "next/server";
import { getDb, requireDbMessage } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { ref: string } }) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: requireDbMessage() }, { status: 503 });
  }

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
}
