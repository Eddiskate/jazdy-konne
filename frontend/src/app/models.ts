export interface TimeRange {
  from: string;
  to: string;
}

export interface WeekHours {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
}

export interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
  preferredHours: WeekHours;
}

export interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
  preferredHours: TimeRange;
}

export interface Horse {
  _id: string;
  name: string;
}

export interface SlotBooking {
  id: string;
  child: Pick<Child, 'firstName' | 'lastName' | 'hourlyRate' | 'preferredHours'> & { id: string };
  horse: { id: string; name: string };
  recurring: boolean;
  intervalDays: number | null;
  seriesStart: string;
  outsideChildPreference: boolean;
}

export interface CalendarSlot {
  start: string;
  end: string;
  booking: SlotBooking | null;
}

export interface CalendarResponse {
  instructor: Instructor;
  slotMinutes: number;
  from: string;
  to: string;
  slots: CalendarSlot[];
}

export const WEEKDAYS: { key: keyof WeekHours; label: string; short: string }[] = [
  { key: 'monday', label: 'Poniedziałek', short: 'Pn' },
  { key: 'tuesday', label: 'Wtorek', short: 'Wt' },
  { key: 'wednesday', label: 'Środa', short: 'Śr' },
  { key: 'thursday', label: 'Czwartek', short: 'Cz' },
  { key: 'friday', label: 'Piątek', short: 'Pt' },
  { key: 'saturday', label: 'Sobota', short: 'So' },
  { key: 'sunday', label: 'Niedziela', short: 'Nd' },
];

export function emptyWeekHours(): WeekHours {
  return {
    monday: [{ from: '09:00', to: '17:00' }],
    tuesday: [{ from: '09:00', to: '17:00' }],
    wednesday: [{ from: '09:00', to: '17:00' }],
    thursday: [{ from: '09:00', to: '17:00' }],
    friday: [{ from: '09:00', to: '17:00' }],
    saturday: [{ from: '09:00', to: '13:00' }],
    sunday: [],
  };
}

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}
