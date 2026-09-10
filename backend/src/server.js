import cors from 'cors';
import express from 'express';
import { connectDb, pingDb } from './db.js';
import { Child } from './models/Child.js';
import { Horse } from './models/Horse.js';
import { Instructor } from './models/Instructor.js';
import { bookingsRouter } from './routes/bookings.js';
import { calendarRouter } from './routes/calendar.js';
import { createCrudRouter } from './routes/crud.js';
import { seedIfEmpty } from './seed.js';

const app = express();
// Port może być ustawiony przez zmienną środowiskową PORT (np. w Easypanel)
const port = Number(process.env.PORT) || 3000;

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200,http://127.0.0.1:4200';
const allowedOrigins = new Set(
  corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || allowedOrigins.has('*')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());

// Zawsze HTTP 200 — Easypanel nie oznacza apki jako unreachable przy problemie z bazą
app.get('/api/health', async (_req, res) => {
  let mongo = false;
  try {
    mongo = await pingDb();
  } catch {
    mongo = false;
  }
  res.json({ ok: true, mongo });
});

app.use('/api/instructors', createCrudRouter(Instructor, { searchFields: ['firstName', 'lastName'] }));
app.use('/api/children', createCrudRouter(Child, { searchFields: ['firstName', 'lastName'] }));
app.use('/api/horses', createCrudRouter(Horse, { searchFields: ['name'] }));
app.use('/api/calendar', calendarRouter);
app.use('/api/bookings', bookingsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Taki rekord już istnieje.' });
  }
  res.status(400).json({ error: err.message || 'Nie udało się zapisać.' });
});

await connectDb();
await seedIfEmpty();

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
