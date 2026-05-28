# Dairy Flat Air

Next.js booking system for the fictitious Dairy Flat airline assignment.

## Features

- Flight search over real calendar dates using the weekly timetable rules.
- Booking creation with unique booking references and capacity checks.
- Invoice-style booking confirmation.
- Booking cancellation.
- Passenger lookup by email address or booking reference.
- MongoDB Atlas persistence for bookings and optional seeded schedules/passengers.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `MONGODB_URI` and `MONGODB_DB` in `.env.local` for MongoDB Atlas.

## Seed MongoDB

The app can generate schedules at request time, but the seed script loads passengers from `data/randomnames.csv` and schedules for the next 12 weeks into MongoDB.

```bash
npm run seed
```

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import it in Vercel.
3. Add `MONGODB_URI` and `MONGODB_DB` as Environment Variables.
4. Deploy and submit the short Vercel URL, for example `https://dairy-flat-air.vercel.app`.

## Submission archive

From the directory above this project:

```bash
tar --exclude='node_modules' --exclude='.*' -cvzf dairy-flat-air.tar dairy-flat-air/
```
