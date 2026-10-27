import crypto from 'node:crypto';
import { Router } from 'express';
import { DateTime } from 'luxon';
import { Booking } from '../models/Booking.js';
import { Child } from '../models/Child.js';
import { Horse } from '../models/Horse.js';
import { Instructor } from '../models/Instructor.js';
import {
  SLOT_MINUTES,
  ZONE,
  bookingOccursAt,
  bookingRiders,
  findConflicts,
  generateSlotsForInstructor,
  instructorHasSlot,
  parseWarsaw,
} from '../services/slots.js';

export const publicRouter = Router();

function keyVerdict(given) {
  const expected = process.env.PUBLIC_API_KEY || '';
  if (expected.length < 16) return 'disabled';
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(String(given || '')).digest();
  return crypto.timingSafeEqual(a, b) ? 'ok' : 'denied';
}

publicRouter.use((req, res, next) => {
  const verdict = keyVerdict(req.get('x-api-key'));
  if (verdict === 'disabled') {
    return res.status(503).json({ error: 'Rezerwacje online są wyłączone.' });
  }
  if (verdict === 'denied') {
    return res.status(401).json({ error: 'Brak dostępu do kalendarza.' });
  }
  next();
});

function leadHours() {
  const value = Number(process.env.PUBLIC_BOOKING_LEAD_HOURS ?? 12);
  if (!Number.isFinite(value)) return 12;
  return Math.min(72, Math.max(0, value));
}

function defaultHourlyRate() {
  const value = Number(process.env.PUBLIC_HOURLY_RATE ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanName(value) {
  const text = clean(value, 60);
  if (!/^[\p{L}][\p{L}\s.'-]{1,59}$/u.test(text)) return '';
  return text;
}

function cleanPhone(value) {
  const text = clean(value, 20);
  const digits = text.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return '';
  return text;
}

function cleanEmail(value) {
  const text = clean(value, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return '';
  return text;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dateWindow(query) {
  const now = DateTime.now().setZone(ZONE);
  const earliest = now.plus({ hours: leadHours() });
  let from = query.from ? parseWarsaw(query.from).startOf('day') : now.startOf('day');
  let to = query.to ? parseWarsaw(query.to).endOf('day') : from.plus({ days: 13 }).endOf('day');
  if (!from.isValid || !to.isValid) {
    return { error: 'Podaj poprawny zakres dat.' };
  }
  const maxTo = now.plus({ days: 21 }).endOf('day');
  if (to > maxTo) to = maxTo;
  if (to < from) return { error: 'Zakres dat jest pusty.' };
  return { from, to, earliest, lead: leadHours() };
}

function horsesFreeAt(horses, bookings, startIso) {
  const busy = new Set();
  for (const booking of bookings) {
    if (!bookingOccursAt(booking, startIso)) continue;
    for (const rider of bookingRiders(booking)) busy.add(String(rider.horseId));
  }
  return horses.filter((horse) => !busy.has(String(horse._id)));
}

function riderLoad(instructor, bookings, startIso) {
  let count = 0;
  for (const booking of bookings) {
    if (String(booking.instructorId) !== String(instructor._id)) continue;
    if (!bookingOccursAt(booking, startIso)) continue;
    count += Math.max(1, bookingRiders(booking).length);
  }
  return count;
}

function pickInstructor(instructors, bookings, startIso) {
  const onDuty = instructors.filter((instructor) => instructorHasSlot(instructor, startIso));
  onDuty.sort((a, b) => {
    const diff = riderLoad(a, bookings, startIso) - riderLoad(b, bookings, startIso);
    if (diff !== 0) return diff;
    return String(a.lastName).localeCompare(String(b.lastName), 'pl');
  });
  return onDuty[0] || null;
}

async function loadBoard(from, to) {
  const [instructors, horses, bookings] = await Promise.all([
    Instructor.find().sort({ lastName: 1, firstName: 1 }),
    Horse.find({ available: { $ne: false } }).sort({ name: 1 }),
    Booking.find({
      $or: [{ seriesEndedAt: null }, { seriesEndedAt: { $gt: from.toJSDate() } }],
    }),
  ]);
  return { instructors, horses, bookings };
}

function openSlots(instructors, horses, bookings, from, to, earliest) {
  const seen = new Set();
  for (const instructor of instructors) {
    for (const slot of generateSlotsForInstructor(instructor, from.toISO(), to.toISO())) {
      const start = parseWarsaw(slot.start);
      if (!start.isValid || start < earliest || seen.has(slot.start)) continue;
      if (!instructorHasSlot(instructor, slot.start)) continue;
      seen.add(slot.start);
    }
  }

  const rows = [];
  for (const startIso of seen) {
    const start = parseWarsaw(startIso);
    if (!pickInstructor(instructors, bookings, startIso)) continue;
    const free = horsesFreeAt(horses, bookings, startIso);
    if (!free.length) continue;
    rows.push({
      start: start.toISO(),
      end: start.plus({ minutes: SLOT_MINUTES }).toISO(),
      horses: free.map((horse) => ({ id: String(horse._id), name: horse.name })),
    });
  }
  rows.sort((a, b) => a.start.localeCompare(b.start));
  return rows;
}

publicRouter.get('/slots', async (req, res, next) => {
  try {
    const range = dateWindow(req.query);
    if (range.error) return res.status(400).json({ error: range.error });

    const board = await loadBoard(range.from, range.to);
    const slots = openSlots(board.instructors, board.horses, board.bookings, range.from, range.to, range.earliest);

    res.json({
      slotMinutes: SLOT_MINUTES,
      leadHours: range.lead,
      from: range.from.toISODate(),
      to: range.to.toISODate(),
      slots,
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.post('/reservations', async (req, res, next) => {
  try {
    const body = req.body || {};
    const riderKind = body.riderKind === 'adult' ? 'adult' : body.riderKind === 'child' ? 'child' : '';
    const firstName = cleanName(body.firstName);
    const lastName = cleanName(body.lastName);
    const guardianName = cleanName(body.guardianName);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const note = clean(body.note, 500);
    const horseId = clean(body.horseId, 32);

    if (!riderKind || !firstName || !phone || !email) {
      return res.status(400).json({ error: 'Uzupełnij imię, telefon i e-mail.' });
    }
    if (riderKind === 'child' && !guardianName) {
      return res.status(400).json({ error: 'Przy dziecku podaj imię i nazwisko opiekuna.' });
    }
    if (horseId && !/^[a-f0-9]{24}$/i.test(horseId)) {
      return res.status(400).json({ error: 'Wybierz konia z listy.' });
    }

    const wanted = parseWarsaw(body.start);
    if (!wanted.isValid) {
      return res.status(400).json({ error: 'Wybierz termin z listy.' });
    }

    const range = dateWindow({
      from: wanted.toISODate(),
      to: wanted.toISODate(),
    });
    if (range.error) return res.status(400).json({ error: range.error });

    const board = await loadBoard(range.from, range.to);
    const slots = openSlots(board.instructors, board.horses, board.bookings, range.from, range.to, range.earliest);
    const windowSlot = slots.find((slot) => parseWarsaw(slot.start).hasSame(wanted, 'minute'));
    if (!windowSlot) {
      return res.status(409).json({ error: 'Ten termin nie jest już wolny. Wybierz inny.' });
    }

    const chosen = horseId
      ? windowSlot.horses.find((horse) => horse.id === horseId)
      : windowSlot.horses[0];
    if (!chosen) {
      return res.status(409).json({ error: 'Ten koń jest już zajęty w wybranym terminie.' });
    }

    const instructor = pickInstructor(board.instructors, board.bookings, windowSlot.start);
    if (!instructor) {
      return res.status(409).json({ error: 'Ten termin nie jest już wolny. Wybierz inny.' });
    }

    let child = await Child.findOne({
      email,
      source: 'website',
      firstName: new RegExp(`^${escapeRegex(firstName)}$`, 'i'),
      lastName: new RegExp(`^${escapeRegex(lastName)}$`, 'i'),
    });

    if (child) {
      child.phone = phone;
      child.riderKind = riderKind;
      if (guardianName) child.guardianName = guardianName;
      if (note) child.note = note;
      await child.save();
    } else {
      const recent = await Child.countDocuments({
        email,
        source: 'website',
        createdAt: { $gte: DateTime.now().minus({ hours: 24 }).toJSDate() },
      });
      if (recent >= 4) {
        return res.status(429).json({ error: 'Z tego adresu jest już kilka zapisów z ostatniej doby. Napisz do nas na Instagramie.' });
      }
      child = await Child.create({
        firstName,
        lastName,
        hourlyRate: defaultHourlyRate(),
        preferredHours: { from: '08:00', to: '20:00' },
        phone,
        email,
        guardianName: guardianName || '',
        note,
        source: 'website',
        riderKind,
      });
    }

    const draft = {
      instructorId: instructor._id,
      riders: [{ childId: child._id, horseId: chosen.id }],
      childId: child._id,
      horseId: chosen.id,
      start: wanted.toJSDate(),
      durationMinutes: SLOT_MINUTES,
      recurrence: { type: 'none', intervalDays: null },
      cancelledDates: [],
      seriesEndedAt: null,
    };

    const freshBookings = await Booking.find({
      $or: [{ seriesEndedAt: null }, { seriesEndedAt: { $gt: wanted.startOf('day').toJSDate() } }],
    });
    const stillFree = horsesFreeAt(board.horses, freshBookings, windowSlot.start)
      .some((horse) => String(horse._id) === chosen.id);
    if (!stillFree) {
      return res.status(409).json({ error: 'Ten koń jest już zajęty w wybranym terminie.' });
    }

    const conflicts = findConflicts(draft, freshBookings, wanted.plus({ days: 1 }).toISO());
    if (conflicts.length) {
      const horseConflict = conflicts.some((item) => item.type === 'horse');
      return res.status(409).json({
        error: horseConflict
          ? 'Ten koń jest już zajęty w wybranym terminie.'
          : 'Ta osoba ma już jazdę o tej godzinie.',
      });
    }

    const booking = await Booking.create(draft);
    res.status(201).json({
      ok: true,
      reservation: {
        id: String(booking._id),
        start: windowSlot.start,
        end: windowSlot.end,
        horse: chosen.name,
        rider: [child.firstName, child.lastName].filter(Boolean).join(' '),
        kind: riderKind,
      },
    });
  } catch (error) {
    next(error);
  }
});
