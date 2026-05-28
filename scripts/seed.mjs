import { MongoClient } from "mongodb";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "dairy-flat-air";

if (!uri) {
  console.error("Set MONGODB_URI before running npm run seed.");
  process.exit(1);
}

const airports = {
  NZNE: { name: "Dairy Flat Airport", offset: "+12:00", timezone: "Mainland New Zealand" },
  YSSY: { name: "Sydney Kingsford Smith", offset: "+10:00", timezone: "Sydney" },
  NZRO: { name: "Rotorua Airport", offset: "+12:00", timezone: "Mainland New Zealand" },
  NZCI: { name: "Tuuta Airport", offset: "+12:45", timezone: "Chatham Islands" },
  NZGB: { name: "Claris Airport", offset: "+12:00", timezone: "Mainland New Zealand" },
  NZTL: { name: "Lake Tekapo Airport", offset: "+12:00", timezone: "Mainland New Zealand" }
};

const rules = [
  ["DFA101", "NZNE", "YSSY", "SyberJet SJ30i", 6, 1320, [5], "10:30", 215],
  ["DFA102", "YSSY", "NZNE", "SyberJet SJ30i", 6, 1260, [0], "15:00", 195],
  ["DFA201", "NZNE", "NZRO", "Cirrus SF50", 4, 260, [1, 2, 3, 4, 5], "06:45", 45],
  ["DFA202", "NZRO", "NZNE", "Cirrus SF50", 4, 245, [1, 2, 3, 4, 5], "08:00", 50],
  ["DFA203", "NZNE", "NZRO", "Cirrus SF50", 4, 280, [1, 2, 3, 4, 5], "16:45", 45],
  ["DFA204", "NZRO", "NZNE", "Cirrus SF50", 4, 260, [1, 2, 3, 4, 5], "18:00", 50],
  ["DFA301", "NZNE", "NZGB", "Cirrus SF50", 4, 210, [1, 3, 5], "09:15", 35],
  ["DFA302", "NZGB", "NZNE", "Cirrus SF50", 4, 205, [2, 4, 6], "10:00", 35],
  ["DFA401", "NZNE", "NZCI", "HondaJet Elite", 5, 760, [2, 5], "09:00", 135],
  ["DFA402", "NZCI", "NZNE", "HondaJet Elite", 5, 740, [3, 6], "11:00", 150],
  ["DFA501", "NZNE", "NZTL", "HondaJet Elite", 5, 620, [1], "08:30", 110],
  ["DFA502", "NZTL", "NZNE", "HondaJet Elite", 5, 595, [2], "13:30", 125]
];

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function offsetToMinutes(offset) {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  return sign * (hours * 60 + minutes);
}

function localDisplay(date, airportCode) {
  const shifted = new Date(date.getTime() + offsetToMinutes(airports[airportCode].offset) * 60 * 1000);
  return `${dateOnly(shifted)} ${shifted.toISOString().slice(11, 16)} (${airports[airportCode].timezone})`;
}

function makeFlight(rule, date) {
  const [flightNumber, origin, destination, aircraft, capacity, price, , departureTime, durationMinutes] = rule;
  const departureIso = `${date}T${departureTime}:00${airports[origin].offset}`;
  const departure = new Date(departureIso);
  const arrival = new Date(departure.getTime() + durationMinutes * 60 * 1000);

  return {
    flightId: `${flightNumber}-${date}`,
    flightNumber,
    origin,
    destination,
    originName: airports[origin].name,
    destinationName: airports[destination].name,
    aircraft,
    capacity,
    price,
    departureLocal: localDisplay(departure, origin),
    arrivalLocal: localDisplay(arrival, destination),
    departureIso,
    arrivalIso: arrival.toISOString(),
    durationMinutes
  };
}

function generateSchedules(weeks = 12) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const flights = [];

  for (let day = 0; day < weeks * 7; day += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + day);
    const weekday = date.getUTCDay();
    for (const rule of rules) {
      if (rule[6].includes(weekday)) {
        flights.push(makeFlight(rule, dateOnly(date)));
      }
    }
  }
  return flights;
}

function parsePassengers(csv) {
  return csv
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [sourceId, title, firstName, lastName, gender, email] = line.split(",");
      return { sourceId, title, firstName, lastName, gender, email, createdAt: new Date().toISOString() };
    });
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const schedules = generateSchedules();
await db.collection("schedules").deleteMany({});
if (schedules.length) {
  await db.collection("schedules").insertMany(schedules);
}

const csv = await readFile(path.join(__dirname, "..", "data", "randomnames.csv"), "utf8");
const passengers = parsePassengers(csv);
await db.collection("passengers").deleteMany({});
if (passengers.length) {
  await db.collection("passengers").insertMany(passengers);
}

await db.collection("bookings").createIndex({ bookingRef: 1 }, { unique: true });
await db.collection("bookings").createIndex({ flightId: 1, status: 1 });
await db.collection("bookings").createIndex({ "passenger.email": 1 });

await client.close();
console.log(`Seeded ${schedules.length} schedules and ${passengers.length} passengers into ${dbName}.`);
