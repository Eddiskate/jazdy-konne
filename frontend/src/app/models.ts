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

export interface SlotRider {
  bookingId: string;
  child: Pick<Child, 'firstName' | 'lastName' | 'hourlyRate' | 'preferredHours'> & { id: string };
  horse: { id: string; name: string };
  recurring: boolean;
  intervalDays: number | null;
  outsideChildPreference: boolean;
}

export interface SlotBooking {
  id: string;
  riders: SlotRider[];
  child: SlotRider['child'];
  horse: SlotRider['horse'];
  recurring: boolean;
  intervalDays: number | null;
  seriesStart: string;
  outsideChildPreference: boolean;
}

export function bookingRiders(booking: SlotBooking | null | undefined): SlotRider[] {
  if (booking?.riders?.length) return booking.riders;
  if (booking?.child && booking?.horse) {
    return [{
      bookingId: booking.id,
      child: booking.child,
      horse: booking.horse,
      recurring: booking.recurring,
      intervalDays: booking.intervalDays,
      outsideChildPreference: booking.outsideChildPreference,
    }];
  }
  return [];
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

export interface FinanceChildRow {
  childId: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
  rides: number;
  amount: number;
}

export interface FinanceSummary {
  month: string;
  label: string;
  rideCount: number;
  total: number;
  children: FinanceChildRow[];
}

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}
