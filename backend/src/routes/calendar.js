import { Router } from 'express';
import { Booking } from '../models/Booking.js';
import { Child } from '../models/Child.js';
import { Horse } from '../models/Horse.js';
import { Instructor } from '../models/Instructor.js';
import {
  SLOT_MINUTES,
  bookingOccursAt,
  generateSlotsForInstructor,
  isOutsideChildPreference,
  parseWarsaw,
} from '../services/slots.js';

export const calendarRouter = Router();

calendarRouter.get('/', async (req, res, next) => {
  try {
    const { instructorId, from, to } = req.query;
    if (!instructorId || !from || !to) {
      return res.status(400).json({ error: 'Wymagane: instructorId, from, to.' });
    }

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) return res.status(404).json({ error: 'Nie znaleziono instruktora.' });

    const fromDt = parseWarsaw(from).startOf('day');
    const toDt = parseWarsaw(to).endOf('day');
    const bookings = await Booking.find({
      instructorId,
      $or: [{ seriesEndedAt: null }, { seriesEndedAt: { $gt: fromDt.toJSDate() } }],
    });

    const [children, horses] = await Promise.all([Child.find(), Horse.find()]);
    const childMap = Object.fromEntries(children.map((child) => [String(child._id), child]));
    const horseMap = Object.fromEntries(horses.map((horse) => [String(horse._id), horse]));

    const slots = generateSlotsForInstructor(instructor, fromDt.toISO(), toDt.toISO()).map((slot) => {
      const match = bookings.find((booking) => bookingOccursAt(booking, slot.start));
      if (!match) {
        return { ...slot, booking: null };
      }

      const child = childMap[String(match.childId)];
      const horse = horseMap[String(match.horseId)];
      return {
        ...slot,
        booking: {
          id: match._id,
          child: child
            ? {
                id: child._id,
                firstName: child.firstName,
                lastName: child.lastName,
                hourlyRate: child.hourlyRate,
                preferredHours: child.preferredHours,
              }
            : null,
          horse: horse ? { id: horse._id, name: horse.name } : null,
          recurring: match.recurrence?.type === 'interval',
          intervalDays: match.recurrence?.intervalDays || null,
          seriesStart: match.start,
          outsideChildPreference: child
            ? isOutsideChildPreference(child, slot.start, match.durationMinutes || SLOT_MINUTES)
            : false,
        },
      };
    });

    res.json({
      instructor,
      slotMinutes: SLOT_MINUTES,
      from: fromDt.toISODate(),
      to: toDt.toISODate(),
      slots,
    });
  } catch (error) {
    next(error);
  }
});
