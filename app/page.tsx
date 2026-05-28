"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Airport = {
  code: string;
  name: string;
  city: string;
  timezone: string;
};

type Schedule = {
  flightId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;
  aircraft: string;
  capacity: number;
  price: number;
  departureLocal: string;
  arrivalLocal: string;
  durationMinutes: number;
  bookedSeats?: number;
  seatsLeft?: number;
};

type Booking = {
  bookingRef: string;
  flightId: string;
  passenger: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  schedule: Schedule;
  price: number;
  status: string;
  createdAt: string;
};

const airportOptions: Airport[] = [
  { code: "NZNE", name: "Dairy Flat Airport", city: "Auckland North", timezone: "Mainland New Zealand" },
  { code: "YSSY", name: "Sydney Kingsford Smith", city: "Sydney", timezone: "Sydney" },
  { code: "NZRO", name: "Rotorua Airport", city: "Rotorua", timezone: "Mainland New Zealand" },
  { code: "NZGB", name: "Claris Airport", city: "Great Barrier Island", timezone: "Mainland New Zealand" },
  { code: "NZCI", name: "Tuuta Airport", city: "Chatham Islands", timezone: "Chatham Islands" },
  { code: "NZTL", name: "Lake Tekapo Airport", city: "Lake Tekapo", timezone: "Mainland New Zealand" }
];

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

function money(value: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function minutes(value: number) {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() };
  }
}

export default function Home() {
  const [date1, setDate1] = useState(dateOnly(new Date()));
  const [date2, setDate2] = useState(addDays(21));
  const [orig, setOrig] = useState("NZNE");
  const [dest, setDest] = useState("YSSY");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [lookup, setLookup] = useState("");
  const [lookupResults, setLookupResults] = useState<Booking[]>([]);
  const [cancelRef, setCancelRef] = useState("");
  const [passenger, setPassenger] = useState({
    title: "Ms",
    firstName: "",
    lastName: "",
    email: ""
  });

  const routeText = useMemo(() => {
    const from = airportOptions.find((airport) => airport.code === orig)?.city;
    const to = airportOptions.find((airport) => airport.code === dest)?.city;
    return `${from} to ${to}`;
  }, [orig, dest]);

  async function searchFlights(event?: FormEvent, options?: { keepBooking?: boolean; keepSelected?: boolean }) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");
    if (!options?.keepBooking) setBooking(null);
    if (!options?.keepSelected) setSelected(null);

    try {
      const params = new URLSearchParams({ date1, date2, orig, dest });
      const response = await fetch(`/api/schedules?${params}`);
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to search schedules.");
      setSchedules(data.schedules);
      if (data.schedules.length === 0) {
        setMessage("No flights operate on that route in the selected dates. Try a wider date range.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function makeBooking(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightId: selected.flightId, passenger })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to create booking.");
      setBooking(data.booking);
      setCancelRef(data.booking.bookingRef);
      await searchFlights(undefined, { keepBooking: true });
      setMessage(`Booking ${data.booking.bookingRef} confirmed. Your invoice is shown on the right.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function findBookings(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const trimmed = lookup.trim();
      const isRef = trimmed.toUpperCase().startsWith("DFA-");
      const params = new URLSearchParams(isRef ? { ref: trimmed } : { email: trimmed });
      const response = await fetch(`/api/bookings?${params}`);
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "No bookings found.");
      setLookupResults(data.bookings);
      if (data.bookings.length === 0) setMessage("No matching bookings were found.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelByRef(refInput: string) {
    setLoading(true);
    setMessage("");

    try {
      const ref = refInput.trim().toUpperCase();
      const response = await fetch(`/api/bookings/${encodeURIComponent(ref)}`, { method: "DELETE" });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to cancel booking.");
      setMessage(`Booking ${data.booking.bookingRef} has been cancelled.`);
      setLookupResults((items) =>
        items.map((item) => (item.bookingRef === data.booking.bookingRef ? { ...item, status: "cancelled" } : item))
      );
      setBooking((current) => {
        if (!current) return current;
        return current.bookingRef === data.booking.bookingRef ? { ...current, status: "cancelled" } : current;
      });
      await searchFlights(undefined, { keepBooking: true, keepSelected: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(event: FormEvent) {
    event.preventDefault();
    await cancelByRef(cancelRef);
  }

  useEffect(() => {
    searchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (orig === dest) {
      setDest(orig === "NZNE" ? "YSSY" : "NZNE");
    }
  }, [orig, dest]);

  return (
    <main>
      <section className="hero">
        <nav className="topbar" aria-label="Main navigation">
          <div className="brand">
            <span className="brandMark">DF</span>
            <span>Dairy Flat Air</span>
          </div>
          <div className="navLinks">
            <a href="#search">Search</a>
            <a href="#booking">Book</a>
            <a href="#manage">Manage</a>
          </div>
        </nav>

        <div className="heroGrid">
          <div className="heroCopy">
            <p className="eyebrow">Online booking system</p>
            <h1>Dairy Flat Air</h1>
            <p>
              Search scheduled flights from Dairy Flat Airport, make a booking, view booking details, and cancel a
              booking using the reference number.
            </p>
          </div>

          <form id="search" className="searchPanel" onSubmit={searchFlights}>
            <label>
              From
              <select value={orig} onChange={(event) => setOrig(event.target.value)}>
                {airportOptions.map((airport) => (
                  <option key={airport.code} value={airport.code}>
                    {airport.city} ({airport.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              To
              <select value={dest} onChange={(event) => setDest(event.target.value)}>
                {airportOptions
                  .filter((airport) => airport.code !== orig)
                  .map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Depart from
              <input type="date" value={date1} onChange={(event) => setDate1(event.target.value)} />
            </label>
            <label>
              Depart until
              <input type="date" value={date2} onChange={(event) => setDate2(event.target.value)} />
            </label>
            <button className="primaryButton" disabled={loading}>
              {loading ? "Searching..." : "Search flights"}
            </button>
          </form>
        </div>
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="contentBand">
        <div className="sectionHeader">
          <p className="eyebrow">Available flights</p>
          <h2>{routeText}</h2>
        </div>
        <div className="flightGrid">
          {schedules.map((flight) => (
            <article className={`flightCard ${selected?.flightId === flight.flightId ? "selected" : ""}`} key={flight.flightId}>
              <div className="flightTop">
                <div>
                  <strong>{flight.flightNumber}</strong>
                  <span>{flight.aircraft}</span>
                </div>
                <span className={(flight.seatsLeft || 0) > 0 ? "seatBadge" : "seatBadge full"}>
                  {(flight.seatsLeft || 0) > 0 ? `${flight.seatsLeft} seats` : "Full"}
                </span>
              </div>
              <div className="routeLine">
                <span>{flight.origin}</span>
                <span aria-hidden="true">to</span>
                <span>{flight.destination}</span>
              </div>
              <dl>
                <div>
                  <dt>Departure</dt>
                  <dd>{flight.departureLocal}</dd>
                </div>
                <div>
                  <dt>Arrival</dt>
                  <dd>{flight.arrivalLocal}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{minutes(flight.durationMinutes)}</dd>
                </div>
                <div>
                  <dt>Fare</dt>
                  <dd>{money(flight.price)}</dd>
                </div>
              </dl>
              <button
                className="secondaryButton"
                disabled={(flight.seatsLeft || 0) < 1}
                onClick={() => setSelected(flight)}
                type="button"
              >
                Select flight
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="booking" className="twoColumn">
        <form className="workPanel" onSubmit={makeBooking}>
          <div className="sectionHeader compact">
            <p className="eyebrow">Passenger details</p>
            <h2>Make a booking</h2>
          </div>
          {selected ? (
            <div className="selectedFlight">
              <strong>{selected.flightNumber}</strong>
              <span>
                {selected.origin} to {selected.destination}, {selected.departureLocal}
              </span>
            </div>
          ) : (
            <p className="muted">Select an available scheduled flight first.</p>
          )}
          <div className="formGrid">
            <label>
              Title
              <select value={passenger.title} onChange={(event) => setPassenger({ ...passenger, title: event.target.value })}>
                <option>Ms</option>
                <option>Miss</option>
                <option>Mrs</option>
                <option>Mr</option>
                <option>Dr</option>
              </select>
            </label>
            <label>
              First name
              <input value={passenger.firstName} onChange={(event) => setPassenger({ ...passenger, firstName: event.target.value })} />
            </label>
            <label>
              Last name
              <input value={passenger.lastName} onChange={(event) => setPassenger({ ...passenger, lastName: event.target.value })} />
            </label>
            <label>
              Email
              <input
                type="email"
                value={passenger.email}
                onChange={(event) => setPassenger({ ...passenger, email: event.target.value })}
              />
            </label>
          </div>
          <button className="primaryButton" disabled={!selected || loading}>
            Confirm booking
          </button>
          {message && <p className="inlineNotice">{message}</p>}
        </form>

        <aside className="invoicePanel">
          <div className="sectionHeader compact">
            <p className="eyebrow">Invoice</p>
            <h2>{booking ? booking.bookingRef : "Awaiting booking"}</h2>
          </div>
          {booking ? (
            <div className="invoice">
              <p>
                {booking.passenger.title} {booking.passenger.firstName} {booking.passenger.lastName}
              </p>
              <p>{booking.passenger.email}</p>
              <hr />
              <p>
                {booking.schedule.originName} to {booking.schedule.destinationName}
              </p>
              <p>{booking.schedule.departureLocal}</p>
              <p>{booking.schedule.aircraft}</p>
              <strong>{money(booking.price)}</strong>
              <span className={`status ${booking.status}`}>{booking.status}</span>
            </div>
          ) : (
            <p className="muted">The invoice summary appears immediately after a successful booking.</p>
          )}
        </aside>
      </section>

      <section id="manage" className="twoColumn manageBand">
        <form className="workPanel" onSubmit={findBookings}>
          <div className="sectionHeader compact">
            <p className="eyebrow">Passenger lookup</p>
            <h2>Find booked flights</h2>
          </div>
          <label>
            Email or booking reference
            <input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="ella.lee@example.com or DFA-AB12CD" />
          </label>
          <button className="secondaryButton" disabled={loading}>
            Fetch bookings
          </button>
          {message && <p className="inlineNotice">{message}</p>}
          <div className="resultsList">
            {lookupResults.map((item) => (
              <article key={item.bookingRef} className="resultRow">
                <div className="resultHeader">
                  <div>
                    <strong>{item.bookingRef}</strong>
                    <span>
                      {item.passenger.title} {item.passenger.firstName} {item.passenger.lastName}
                    </span>
                  </div>
                  <span className={`status ${item.status}`}>{item.status}</span>
                </div>
                <dl className="bookingDetails">
                  <div>
                    <dt>Flight</dt>
                    <dd>
                      {item.schedule.flightNumber}: {item.schedule.origin} to {item.schedule.destination}
                    </dd>
                  </div>
                  <div>
                    <dt>Departure</dt>
                    <dd>{item.schedule.departureLocal}</dd>
                  </div>
                  <div>
                    <dt>Arrival</dt>
                    <dd>{item.schedule.arrivalLocal}</dd>
                  </div>
                  <div>
                    <dt>Aircraft</dt>
                    <dd>{item.schedule.aircraft}</dd>
                  </div>
                  <div>
                    <dt>Passenger email</dt>
                    <dd>{item.passenger.email}</dd>
                  </div>
                  <div>
                    <dt>Fare</dt>
                    <dd>{money(item.price)}</dd>
                  </div>
                </dl>
                {item.status === "confirmed" && (
                  <button className="dangerButton compactButton" disabled={loading} onClick={() => cancelByRef(item.bookingRef)} type="button">
                    Cancel this booking
                  </button>
                )}
              </article>
            ))}
          </div>
        </form>

        <form className="workPanel" onSubmit={cancelBooking}>
          <div className="sectionHeader compact">
            <p className="eyebrow">Cancellation</p>
            <h2>Cancel a booking</h2>
          </div>
          <label>
            Booking reference
            <input value={cancelRef} onChange={(event) => setCancelRef(event.target.value.toUpperCase())} placeholder="DFA-AB12CD" />
          </label>
          <button className="dangerButton" disabled={loading}>
            Cancel booking
          </button>
        </form>
      </section>
    </main>
  );
}
