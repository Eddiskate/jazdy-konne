import { DateTime } from 'luxon';

export const ZONE = 'Europe/Warsaw';
export const SLOT_MINUTES = 60;
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const WEEKDAY_LABELS = {
  monday: 'Poniedziałek',
  tuesday: 'Wtorek',
  wednesday: 'Środa',
  thursday: 'Czwartek',
  friday: 'Piątek',
  saturday: 'Sobota',
  sunday: 'Niedziela',
};

export function parseWarsaw(value) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: ZONE });
  }
  return DateTime.fromISO(String(value), { zone: ZONE });
}

export function weekdayKey(dt) {
  return WEEKDAYS[dt.weekday - 1];
}

export function generateSlotsForInstructor(instructor, fromIso, toIso, slotMinutes = SLOT_MINUTES) {
  const slots = [];
  let day = parseWarsaw(fromIso).startOf('day');
  const end = parseWarsaw(toIso).endOf('day');

  while (day <= end) {
    const ranges = instructor.preferredHours?.[weekdayKey(day)] || [];
    for (const range of ranges) {
      const [fromH, fromM] = range.from.split(':').map(Number);
      const [toH, toM] = range.to.split(':').map(Number);
      let cursor = day.set({ hour: fromH, minute: fromM, second: 0, millisecond: 0 });
      const rangeEnd = day.set({ hour: toH, minute: toM, second: 0, millisecond: 0 });

      while (cursor.plus({ minutes: slotMinutes }) <= rangeEnd) {
        slots.push({
          start: cursor.toISO(),
          end: cursor.plus({ minutes: slotMinutes }).toISO(),
        });
        cursor = cursor.plus({ minutes: slotMinutes });
      }
    }
    day = day.plus({ days: 1 });
  }

  return slots;
}

export function isOccurrenceCancelled(booking, occurrence) {
  return (booking.cancelledDates || []).some((cancelled) =>
    parseWarsaw(cancelled).hasSame(occurrence, 'minute'),
  );
}

export function isSeriesEnded(booking, occurrence) {
  if (!booking.seriesEndedAt) return false;
  return occurrence >= parseWarsaw(booking.seriesEndedAt);
}

export function bookingOccursAt(booking, slotStart) {
  const slot = parseWarsaw(slotStart);
  const first = parseWarsaw(booking.start);

  if (isSeriesEnded(booking, slot) || isOccurrenceCancelled(booking, slot)) {
    return false;
  }

  if (booking.recurrence?.type === 'interval' && booking.recurrence.intervalDays) {
    const diff = Math.round(slot.startOf('day').diff(first.startOf('day'), 'days').days);
    if (diff < 0) return false;
    if (diff % booking.recurrence.intervalDays !== 0) return false;
    return slot.hour === first.hour && slot.minute === first.minute;
  }

  return slot.hasSame(first, 'minute');
}

export function expandOccurrences(booking, untilIso, horizonWeeks = 16) {
  const first = parseWarsaw(booking.start);
  const until = untilIso
    ? parseWarsaw(untilIso)
    : first.plus({ weeks: horizonWeeks });
  const dates = [];

  if (booking.recurrence?.type === 'interval' && booking.recurrence.intervalDays) {
    let cursor = first;
    while (cursor <= until) {
      if (!isSeriesEnded(booking, cursor) && !isOccurrenceCancelled(booking, cursor)) {
        dates.push(cursor);
      }
      cursor = cursor.plus({ days: booking.recurrence.intervalDays });
    }
  } else if (!isSeriesEnded(booking, first) && !isOccurrenceCancelled(booking, first)) {
    dates.push(first);
  }

  return dates;
}

export function instructorHasSlot(instructor, startIso, slotMinutes = SLOT_MINUTES) {
  const start = parseWarsaw(startIso);
  const ranges = instructor.preferredHours?.[weekdayKey(start)] || [];
  const end = start.plus({ minutes: slotMinutes });

  return ranges.some((range) => {
    const [fromH, fromM] = range.from.split(':').map(Number);
    const [toH, toM] = range.to.split(':').map(Number);
    const rangeStart = start.set({ hour: fromH, minute: fromM, second: 0, millisecond: 0 });
    const rangeEnd = start.set({ hour: toH, minute: toM, second: 0, millisecond: 0 });
    return start >= rangeStart && end <= rangeEnd;
  });
}

export function isOutsideChildPreference(child, startIso, slotMinutes = SLOT_MINUTES) {
  if (!child?.preferredHours?.from || !child?.preferredHours?.to) return false;
  const start = parseWarsaw(startIso);
  const end = start.plus({ minutes: slotMinutes });
  const [fromH, fromM] = child.preferredHours.from.split(':').map(Number);
  const [toH, toM] = child.preferredHours.to.split(':').map(Number);
  const prefStart = start.set({ hour: fromH, minute: fromM, second: 0, millisecond: 0 });
  const prefEnd = start.set({ hour: toH, minute: toM, second: 0, millisecond: 0 });
  return start < prefStart || end > prefEnd;
}

function sameInstant(a, b) {
  return a.hasSame(b, 'minute');
}

export function bookingRiders(booking) {
  if (Array.isArray(booking?.riders) && booking.riders.length) {
    return booking.riders;
  }
  if (booking?.childId && booking?.horseId) {
    return [{ childId: booking.childId, horseId: booking.horseId }];
  }
  return [];
}

export function findConflicts(newBooking, existingBookings, untilIso) {
  const newOccurrences = expandOccurrences(newBooking, untilIso);
  const newRiders = bookingRiders(newBooking);
  const conflicts = [];

  const childIds = newRiders.map((rider) => String(rider.childId));
  const horseIds = newRiders.map((rider) => String(rider.horseId));
  if (new Set(childIds).size !== childIds.length) {
    conflicts.push({ type: 'child', message: 'To samo dziecko nie może być dwa razy w jednym slocie.' });
  }
  if (new Set(horseIds).size !== horseIds.length) {
    conflicts.push({ type: 'horse', message: 'Ten sam koń nie może być dwa razy w jednym slocie.' });
  }

  for (const existing of existingBookings) {
    if (newBooking._id && String(existing._id) === String(newBooking._id)) continue;
    const existingOccurrences = expandOccurrences(existing, untilIso);
    const existingRiders = bookingRiders(existing);
    for (const next of newOccurrences) {
      for (const taken of existingOccurrences) {
        if (!sameInstant(next, taken)) continue;

        for (const rider of newRiders) {
          if (existingRiders.some((takenRider) => String(takenRider.childId) === String(rider.childId))) {
            conflicts.push({
              type: 'child',
              at: next.toISO(),
              message: 'Dziecko ma już jazdę o tej godzinie.',
            });
          }
          if (existingRiders.some((takenRider) => String(takenRider.horseId) === String(rider.horseId))) {
            conflicts.push({
              type: 'horse',
              at: next.toISO(),
              message: 'Koń jest już zajęty o tej godzinie.',
            });
          }
        }
      }
    }
  }

  return conflicts;
}
