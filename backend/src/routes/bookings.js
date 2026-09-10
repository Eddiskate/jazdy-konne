import { Router } from 'express';
import { DateTime } from 'luxon';
import { Booking } from '../models/Booking.js';
import { Child } from '../models/Child.js';
import { Horse } from '../models/Horse.js';
import { Instructor } from '../models/Instructor.js';
import {
  SLOT_MINUTES,
  findConflicts,
  instructorHasSlot,
  parseWarsaw,
} from '../services/slots.js';

export const bookingsRouter = Router();

function parseRecurrence(recurrence) {
  const type = recurrence?.type === 'interval' ? 'interval' : 'none';
  const intervalDays = type === 'interval' ? Number(recurrence.intervalDays) : null;
  if (type === 'interval' && (!intervalDays || intervalDays < 1)) {
    return { error: 'Podaj co ile dni ma się powtarzać jazda.' };
  }
  return { value: { type, intervalDays } };
}

function normalizeRiders(body) {
  const fallback = body.recurrence;
  if (Array.isArray(body.riders) && body.riders.length) {
    return body.riders
      .map((rider) => ({
        childId: rider.childId,
        horseId: rider.horseId,
        recurrence: rider.recurrence || fallback,
      }))
      .filter((rider) => rider.childId && rider.horseId);
  }
  if (body.childId && body.horseId) {
    return [{ childId: body.childId, horseId: body.horseId, recurrence: fallback }];
  }
  return [];
}

async function validateRiderIds(riders) {
  const [children, horses] = await Promise.all([
    Child.find({ _id: { $in: riders.map((rider) => rider.childId) } }),
    Horse.find({ _id: { $in: riders.map((rider) => rider.horseId) } }),
  ]);
  const childIds = new Set(children.map((child) => String(child._id)));
  const horseIds = new Set(horses.map((horse) => String(horse._id)));
  if (riders.some((rider) => !childIds.has(String(rider.childId)))) {
    return 'Nie znaleziono dziecka.';
  }
  if (riders.some((rider) => !horseIds.has(String(rider.horseId)))) {
    return 'Nie znaleziono konia.';
  }
  return null;
}

bookingsRouter.post('/', async (req, res, next) => {
  try {
    const { instructorId, start } = req.body;
    const riders = normalizeRiders(req.body);
    if (!instructorId || !start || !riders.length) {
      return res.status(400).json({ error: 'Wymagane: instruktor, termin oraz przynajmniej jeden zestaw dziecko + koń.' });
    }

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) return res.status(404).json({ error: 'Nie znaleziono instruktora.' });

    const invalid = await validateRiderIds(riders);
    if (invalid) return res.status(404).json({ error: invalid });

    const startDt = parseWarsaw(start);
    if (!startDt.isValid) {
      return res.status(400).json({ error: 'Nieprawidłowa data rozpoczęcia.' });
    }

    if (!instructorHasSlot(instructor, startDt.toISO())) {
      return res.status(400).json({ error: 'Ten termin nie mieści się w godzinach instruktora.' });
    }

    const drafts = [];
    for (const rider of riders) {
      const parsed = parseRecurrence(rider.recurrence);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      drafts.push({
        instructorId,
        riders: [{ childId: rider.childId, horseId: rider.horseId }],
        childId: rider.childId,
        horseId: rider.horseId,
        start: startDt.toJSDate(),
        durationMinutes: SLOT_MINUTES,
        recurrence: parsed.value,
        cancelledDates: [],
        seriesEndedAt: null,
      });
    }

    const horizon = startDt.plus({ weeks: 16 }).toISO();
    const existing = await Booking.find({
      $or: [{ seriesEndedAt: null }, { seriesEndedAt: { $gt: startDt.toJSDate() } }],
    });

    const createdSoFar = [];
    for (const draft of drafts) {
      const conflicts = findConflicts(draft, [...existing, ...createdSoFar], horizon);
      if (conflicts.length) {
        return res.status(409).json({
          error: conflicts[0].message,
          conflicts,
        });
      }
      createdSoFar.push(draft);
    }

    const bookings = await Booking.insertMany(drafts);
    res.status(201).json(bookings);
  } catch (error) {
    next(error);
  }
});

bookingsRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Nie znaleziono jazdy.' });

    const occurrence = parseWarsaw(req.body.date || req.body.start);
    if (!occurrence.isValid) {
      return res.status(400).json({ error: 'Podaj datę jazdy do anulowania.' });
    }

    if (booking.recurrence?.type !== 'interval') {
      await booking.deleteOne();
      return res.json({ ok: true, deleted: true });
    }

    const already = (booking.cancelledDates || []).some((date) =>
      parseWarsaw(date).hasSame(occurrence, 'minute'),
    );
    if (!already) {
      booking.cancelledDates.push(occurrence.toJSDate());
      await booking.save();
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

bookingsRouter.post('/:id/cancel-series', async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Nie znaleziono jazdy.' });

    const from = req.body.from ? parseWarsaw(req.body.from) : DateTime.now().setZone('Europe/Warsaw');
    booking.seriesEndedAt = from.toJSDate();
    await booking.save();
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

bookingsRouter.delete('/:id', async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Nie znaleziono jazdy.' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
