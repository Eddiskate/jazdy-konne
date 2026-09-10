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

bookingsRouter.post('/', async (req, res, next) => {
  try {
    const { instructorId, childId, horseId, start, recurrence } = req.body;
    if (!instructorId || !childId || !horseId || !start) {
      return res.status(400).json({ error: 'Wymagane: instruktor, dziecko, koń i termin.' });
    }

    const [instructor, child, horse] = await Promise.all([
      Instructor.findById(instructorId),
      Child.findById(childId),
      Horse.findById(horseId),
    ]);

    if (!instructor) return res.status(404).json({ error: 'Nie znaleziono instruktora.' });
    if (!child) return res.status(404).json({ error: 'Nie znaleziono dziecka.' });
    if (!horse) return res.status(404).json({ error: 'Nie znaleziono konia.' });

    const startDt = parseWarsaw(start);
    if (!startDt.isValid) {
      return res.status(400).json({ error: 'Nieprawidłowa data rozpoczęcia.' });
    }

    if (!instructorHasSlot(instructor, startDt.toISO())) {
      return res.status(400).json({ error: 'Ten termin nie mieści się w godzinach instruktora.' });
    }

    const recurrenceType = recurrence?.type === 'interval' ? 'interval' : 'none';
    const intervalDays = recurrenceType === 'interval' ? Number(recurrence.intervalDays) : null;
    if (recurrenceType === 'interval' && (!intervalDays || intervalDays < 1)) {
      return res.status(400).json({ error: 'Podaj co ile dni ma się powtarzać jazda.' });
    }

    const draft = {
      instructorId,
      childId,
      horseId,
      start: startDt.toJSDate(),
      durationMinutes: SLOT_MINUTES,
      recurrence: { type: recurrenceType, intervalDays },
      cancelledDates: [],
      seriesEndedAt: null,
    };

    const horizon = startDt.plus({ weeks: 16 }).toISO();
    const existing = await Booking.find({
      $or: [{ seriesEndedAt: null }, { seriesEndedAt: { $gt: startDt.toJSDate() } }],
    });

    const conflicts = findConflicts(draft, existing, horizon);
    if (conflicts.length) {
      return res.status(409).json({
        error: conflicts[0].message,
        conflicts,
      });
    }

    const booking = await Booking.create(draft);
    res.status(201).json(booking);
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
