import { Router } from 'express';
import { Booking } from '../models/Booking.js';
import { Child } from '../models/Child.js';
import {
  SLOT_MINUTES,
  bookingRiders,
  expandOccurrencesInRange,
  parseWarsaw,
} from '../services/slots.js';

export const financeRouter = Router();

financeRouter.get('/', async (req, res, next) => {
  try {
    const raw = String(req.query.month || parseWarsaw(new Date()).toFormat('yyyy-MM'));
    const month = parseWarsaw(/^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw);
    const monthStart = month.startOf('month');
    const monthEnd = month.endOf('month');

    const bookings = await Booking.find({
      start: { $lte: monthEnd.toJSDate() },
      $or: [{ seriesEndedAt: null }, { seriesEndedAt: { $gt: monthStart.toJSDate() } }],
    });

    const children = await Child.find();
    const childMap = Object.fromEntries(children.map((child) => [String(child._id), child]));

    const byChild = new Map();
    let rideCount = 0;
    let total = 0;

    for (const booking of bookings) {
      const occurrences = expandOccurrencesInRange(booking, monthStart.toISO(), monthEnd.toISO());
      if (!occurrences.length) continue;
      const hours = (booking.durationMinutes || SLOT_MINUTES) / 60;

      for (const rider of bookingRiders(booking)) {
        const child = childMap[String(rider.childId)];
        const rate = Number(child?.hourlyRate) || 0;
        const amount = occurrences.length * rate * hours;
        rideCount += occurrences.length;
        total += amount;

        const key = String(rider.childId);
        const current = byChild.get(key) || {
          childId: key,
          firstName: child?.firstName || 'Nieznane',
          lastName: child?.lastName || 'dziecko',
          hourlyRate: rate,
          rides: 0,
          amount: 0,
        };
        current.rides += occurrences.length;
        current.amount += amount;
        byChild.set(key, current);
      }
    }

    const childrenSummary = [...byChild.values()].sort((a, b) => b.amount - a.amount);

    res.json({
      month: monthStart.toFormat('yyyy-MM'),
      label: monthStart.setLocale('pl').toFormat('LLLL yyyy'),
      rideCount,
      total: Math.round(total * 100) / 100,
      children: childrenSummary,
    });
  } catch (error) {
    next(error);
  }
});
