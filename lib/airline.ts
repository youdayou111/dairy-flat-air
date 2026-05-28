export type AirportCode = "NZNE" | "YSSY" | "NZRO" | "NZCI" | "NZGB" | "NZTL";

export type Airport = {
  code: AirportCode;
  name: string;
  city: string;
  timezone: string;
  offset: string;
};

export type Flight = {
  flightId: string;
  flightNumber: string;
  origin: AirportCode;
  destination: AirportCode;
  originName: string;
  destinationName: string;
  aircraft: string;
  capacity: number;
  price: number;
  departureLocal: string;
  arrivalLocal: string;
  departureIso: string;
  arrivalIso: string;
  durationMinutes: number;
};

type Rule = {
  flightNumber: string;
  origin: AirportCode;
  destination: AirportCode;
  aircraft: string;
  capacity: number;
  price: number;
  days: number[];
  departureTime: string;
  durationMinutes: number;
};

export const AIRPORTS: Record<AirportCode, Airport> = {
  NZNE: {
    code: "NZNE",
    name: "Dairy Flat Airport",
    city: "Auckland North",
    timezone: "Mainland New Zealand",
    offset: "+12:00"
  },
  YSSY: {
    code: "YSSY",
    name: "Sydney Kingsford Smith",
    city: "Sydney",
    timezone: "Sydney",
    offset: "+10:00"
  },
  NZRO: {
    code: "NZRO",
    name: "Rotorua Airport",
    city: "Rotorua",
    timezone: "Mainland New Zealand",
    offset: "+12:00"
  },
  NZCI: {
    code: "NZCI",
    name: "Tuuta Airport",
    city: "Chatham Islands",
    timezone: "Chatham Islands",
    offset: "+12:45"
  },
  NZGB: {
    code: "NZGB",
    name: "Claris Airport",
    city: "Great Barrier Island",
    timezone: "Mainland New Zealand",
    offset: "+12:00"
  },
  NZTL: {
    code: "NZTL",
    name: "Lake Tekapo Airport",
    city: "Lake Tekapo",
    timezone: "Mainland New Zealand",
    offset: "+12:00"
  }
};

export const ROUTE_RULES: Rule[] = [
  { flightNumber: "DFA101", origin: "NZNE", destination: "YSSY", aircraft: "SyberJet SJ30i", capacity: 6, price: 1320, days: [5], departureTime: "10:30", durationMinutes: 215 },
  { flightNumber: "DFA102", origin: "YSSY", destination: "NZNE", aircraft: "SyberJet SJ30i", capacity: 6, price: 1260, days: [0], departureTime: "15:00", durationMinutes: 195 },
  { flightNumber: "DFA201", origin: "NZNE", destination: "NZRO", aircraft: "Cirrus SF50", capacity: 4, price: 260, days: [1, 2, 3, 4, 5], departureTime: "06:45", durationMinutes: 45 },
  { flightNumber: "DFA202", origin: "NZRO", destination: "NZNE", aircraft: "Cirrus SF50", capacity: 4, price: 245, days: [1, 2, 3, 4, 5], departureTime: "08:00", durationMinutes: 50 },
  { flightNumber: "DFA203", origin: "NZNE", destination: "NZRO", aircraft: "Cirrus SF50", capacity: 4, price: 280, days: [1, 2, 3, 4, 5], departureTime: "16:45", durationMinutes: 45 },
  { flightNumber: "DFA204", origin: "NZRO", destination: "NZNE", aircraft: "Cirrus SF50", capacity: 4, price: 260, days: [1, 2, 3, 4, 5], departureTime: "18:00", durationMinutes: 50 },
  { flightNumber: "DFA301", origin: "NZNE", destination: "NZGB", aircraft: "Cirrus SF50", capacity: 4, price: 210, days: [1, 3, 5], departureTime: "09:15", durationMinutes: 35 },
  { flightNumber: "DFA302", origin: "NZGB", destination: "NZNE", aircraft: "Cirrus SF50", capacity: 4, price: 205, days: [2, 4, 6], departureTime: "10:00", durationMinutes: 35 },
  { flightNumber: "DFA401", origin: "NZNE", destination: "NZCI", aircraft: "HondaJet Elite", capacity: 5, price: 760, days: [2, 5], departureTime: "09:00", durationMinutes: 135 },
  { flightNumber: "DFA402", origin: "NZCI", destination: "NZNE", aircraft: "HondaJet Elite", capacity: 5, price: 740, days: [3, 6], departureTime: "11:00", durationMinutes: 150 },
  { flightNumber: "DFA501", origin: "NZNE", destination: "NZTL", aircraft: "HondaJet Elite", capacity: 5, price: 620, days: [1], departureTime: "08:30", durationMinutes: 110 },
  { flightNumber: "DFA502", origin: "NZTL", destination: "NZNE", aircraft: "HondaJet Elite", capacity: 5, price: 595, days: [2], departureTime: "13:30", durationMinutes: 125 }
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function isAirportCode(value: string | null): value is AirportCode {
  return Boolean(value && value in AIRPORTS);
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

function localIso(dateOnly: string, time: string, offset: string): string {
  return `${dateOnly}T${time}:00${offset}`;
}

function localDisplay(date: Date, airportCode: AirportCode): string {
  const airport = AIRPORTS[airportCode];
  const shifted = new Date(date.getTime() + offsetToMinutes(airport.offset) * 60 * 1000);
  return `${toDateOnly(shifted)} ${shifted.toISOString().slice(11, 16)} (${airport.timezone})`;
}

function offsetToMinutes(offset: string): number {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  return sign * (hours * 60 + minutes);
}

function makeFlight(rule: Rule, dateOnly: string): Flight {
  const departureIso = localIso(dateOnly, rule.departureTime, AIRPORTS[rule.origin].offset);
  const departureDate = new Date(departureIso);
  const arrivalDate = new Date(departureDate.getTime() + rule.durationMinutes * 60 * 1000);
  const arrivalIso = arrivalDate.toISOString();

  return {
    flightId: `${rule.flightNumber}-${dateOnly}`,
    flightNumber: rule.flightNumber,
    origin: rule.origin,
    destination: rule.destination,
    originName: AIRPORTS[rule.origin].name,
    destinationName: AIRPORTS[rule.destination].name,
    aircraft: rule.aircraft,
    capacity: rule.capacity,
    price: rule.price,
    departureLocal: localDisplay(departureDate, rule.origin),
    arrivalLocal: localDisplay(arrivalDate, rule.destination),
    departureIso,
    arrivalIso,
    durationMinutes: rule.durationMinutes
  };
}

export function generateSchedules(date1: string, date2: string, orig?: AirportCode, dest?: AirportCode): Flight[] {
  const start = new Date(`${date1}T00:00:00Z`);
  const end = new Date(`${date2}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const flights: Flight[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const date = new Date(time);
    const dateOnly = toDateOnly(date);
    const weekday = date.getUTCDay();
    for (const rule of ROUTE_RULES) {
      if (!rule.days.includes(weekday)) continue;
      if (orig && rule.origin !== orig) continue;
      if (dest && rule.destination !== dest) continue;
      flights.push(makeFlight(rule, dateOnly));
    }
  }

  return flights.sort((a, b) => a.departureIso.localeCompare(b.departureIso));
}

export function findFlightById(flightId: string): Flight | null {
  const match = /^([A-Z]{3}\d{3})-(\d{4}-\d{2}-\d{2})$/.exec(flightId);
  if (!match) return null;
  const [, flightNumber, dateOnly] = match;
  const rule = ROUTE_RULES.find((item) => item.flightNumber === flightNumber);
  if (!rule) return null;
  const weekday = new Date(`${dateOnly}T00:00:00Z`).getUTCDay();
  return rule.days.includes(weekday) ? makeFlight(rule, dateOnly) : null;
}

export function defaultSearchRange() {
  const start = todayDateOnly();
  return { start, end: addDays(start, 21) };
}
