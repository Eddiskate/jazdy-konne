import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, apiErrorMessage } from '../api.service';
import {
  addDays,
  formatDateTime,
  formatDayHeading,
  formatTime,
  formatWeekRange,
  slotDateKey,
  startOfWeek,
  toIsoDate,
} from '../date.util';
import { CalendarSlot, Child, Horse, Instructor, bookingRiders, personName } from '../models';

interface RiderDraft {
  key: number;
  childId: string;
  horseId: string;
}

interface DayColumn {
  date: Date;
  key: string;
  label: string;
  slots: CalendarSlot[];
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage implements OnInit {
  private readonly api = inject(ApiService);

  instructors: Instructor[] = [];
  children: Child[] = [];
  horses: Horse[] = [];
  instructorId = '';
  weekStart = startOfWeek(new Date());
  days: DayColumn[] = [];
  loading = false;
  error = '';

  bookingSlot: CalendarSlot | null = null;
  detailSlot: CalendarSlot | null = null;
  pairs: RiderDraft[] = [];
  extraPairs: RiderDraft[] = [];
  recurrence: 'none' | 'interval' = 'none';
  intervalDays = 7;
  saving = false;
  formError = '';
  private pairKey = 1;

  get weekLabel(): string {
    return formatWeekRange(this.weekStart, addDays(this.weekStart, 6));
  }

  ngOnInit(): void {
    this.api.instructors().subscribe({
      next: (instructors) => {
        this.instructors = instructors;
        if (!this.instructorId && instructors[0]) {
          this.instructorId = instructors[0]._id;
        }
        this.loadCalendar();
      },
      error: (error) => {
        this.error = apiErrorMessage(error, 'Nie udało się pobrać instruktorów.');
      },
    });
    this.api.children().subscribe((children) => (this.children = children));
    this.api.horses().subscribe((horses) => (this.horses = horses));
  }

  loadCalendar(): void {
    if (!this.instructorId) {
      this.days = this.buildEmptyDays();
      return;
    }
    this.loading = true;
    this.error = '';
    const from = toIsoDate(this.weekStart);
    const to = toIsoDate(addDays(this.weekStart, 6));
    this.api.calendar(this.instructorId, from, to).subscribe({
      next: (response) => {
        this.days = this.buildEmptyDays().map((day) => ({
          ...day,
          slots: response.slots.filter((slot) => slotDateKey(slot.start) === day.key),
        }));
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = apiErrorMessage(error, 'Nie udało się wczytać kalendarza.');
      },
    });
  }

  prevWeek(): void {
    this.weekStart = addDays(this.weekStart, -7);
    this.loadCalendar();
  }

  nextWeek(): void {
    this.weekStart = addDays(this.weekStart, 7);
    this.loadCalendar();
  }

  today(): void {
    this.weekStart = startOfWeek(new Date());
    this.loadCalendar();
  }

  openBooking(slot: CalendarSlot): void {
    this.bookingSlot = slot;
    this.detailSlot = null;
    this.pairs = [this.newPair()];
    this.recurrence = 'none';
    this.intervalDays = 7;
    this.formError = '';
  }

  addPair(): void {
    if (this.detailSlot) {
      this.extraPairs = [...this.extraPairs, this.newPair()];
      return;
    }
    this.pairs = [...this.pairs, this.newPair()];
  }

  removePair(key: number): void {
    if (this.detailSlot) {
      this.extraPairs = this.extraPairs.filter((pair) => pair.key !== key);
      return;
    }
    if (this.pairs.length <= 1) return;
    this.pairs = this.pairs.filter((pair) => pair.key !== key);
  }

  openDetail(slot: CalendarSlot): void {
    this.detailSlot = slot;
    this.bookingSlot = null;
    this.extraPairs = [];
    this.formError = '';
  }

  closePanels(): void {
    this.bookingSlot = null;
    this.detailSlot = null;
    this.extraPairs = [];
    this.formError = '';
    this.saving = false;
  }

  saveBooking(): void {
    const riders = this.pairs
      .map((pair) => ({ childId: pair.childId, horseId: pair.horseId }))
      .filter((pair) => pair.childId && pair.horseId);
    if (!this.bookingSlot || !this.instructorId || !riders.length) {
      this.formError = 'Wybierz dziecko i konia.';
      return;
    }
    const childIds = riders.map((rider) => rider.childId);
    const horseIds = riders.map((rider) => rider.horseId);
    if (new Set(childIds).size !== childIds.length) {
      this.formError = 'To samo dziecko nie może być dwa razy w jednym slocie.';
      return;
    }
    if (new Set(horseIds).size !== horseIds.length) {
      this.formError = 'Ten sam koń nie może być dwa razy w jednym slocie.';
      return;
    }
    this.saving = true;
    this.formError = '';
    this.api
      .createBooking({
        instructorId: this.instructorId,
        riders,
        start: this.bookingSlot.start,
        recurrence:
          this.recurrence === 'interval'
            ? { type: 'interval', intervalDays: Number(this.intervalDays) }
            : { type: 'none' },
      })
      .subscribe({
        next: () => {
          this.closePanels();
          this.loadCalendar();
        },
        error: (error) => {
          this.saving = false;
          this.formError = apiErrorMessage(error, 'Nie udało się obsadzić slotu.');
        },
      });
  }

  saveExtraRiders(): void {
    if (!this.detailSlot?.booking) return;
    const existing = bookingRiders(this.detailSlot.booking).map((rider) => ({
      childId: rider.child.id,
      horseId: rider.horse.id,
    }));
    const added = this.extraPairs
      .map((pair) => ({ childId: pair.childId, horseId: pair.horseId }))
      .filter((pair) => pair.childId && pair.horseId);
    const riders = [...existing, ...added];
    const childIds = riders.map((rider) => rider.childId);
    const horseIds = riders.map((rider) => rider.horseId);
    if (!added.length) {
      this.formError = 'Dodaj przynajmniej jeden nowy zestaw.';
      return;
    }
    if (new Set(childIds).size !== childIds.length) {
      this.formError = 'To samo dziecko nie może być dwa razy w jednym slocie.';
      return;
    }
    if (new Set(horseIds).size !== horseIds.length) {
      this.formError = 'Ten sam koń nie może być dwa razy w jednym slocie.';
      return;
    }
    this.saving = true;
    this.formError = '';
    this.api.updateBooking(this.detailSlot.booking.id, { riders }).subscribe({
      next: () => {
        this.closePanels();
        this.loadCalendar();
      },
      error: (error) => {
        this.saving = false;
        this.formError = apiErrorMessage(error, 'Nie udało się dodać zestawu.');
      },
    });
  }

  cancelOccurrence(): void {
    if (!this.detailSlot?.booking) return;
    this.saving = true;
    this.formError = '';
    this.api.cancelOccurrence(this.detailSlot.booking.id, this.detailSlot.start).subscribe({
      next: () => {
        this.closePanels();
        this.loadCalendar();
      },
      error: (error) => {
        this.saving = false;
        this.formError = apiErrorMessage(error, 'Nie udało się anulować jazdy.');
      },
    });
  }

  cancelSeries(): void {
    if (!this.detailSlot?.booking) return;
    this.saving = true;
    this.formError = '';
    this.api.cancelSeries(this.detailSlot.booking.id, this.detailSlot.start).subscribe({
      next: () => {
        this.closePanels();
        this.loadCalendar();
      },
      error: (error) => {
        this.saving = false;
        this.formError = apiErrorMessage(error, 'Nie udało się anulować serii.');
      },
    });
  }

  personName = personName;
  formatTime = formatTime;
  formatDateTime = formatDateTime;
  ridersOf = bookingRiders;

  slotTitle(slot: CalendarSlot): string {
    const riders = bookingRiders(slot.booking);
    if (!riders.length) return 'Jazda';
    if (riders.length === 1) return personName(riders[0].child);
    return `${riders.length} × dziecko + koń`;
  }

  recurrenceLabel(slot: CalendarSlot): string {
    if (!slot.booking?.recurring) return 'Jednorazowo';
    const days = slot.booking.intervalDays || 1;
    return days === 1 ? 'Co dzień' : `Co ${days} dni`;
  }

  private newPair(): RiderDraft {
    const used = this.usedRiderIds();
    const child = this.children.find((item) => !used.children.has(item._id)) || this.children[0];
    const horse = this.horses.find((item) => !used.horses.has(item._id)) || this.horses[0];
    return {
      key: this.pairKey++,
      childId: child?._id || '',
      horseId: horse?._id || '',
    };
  }

  private usedRiderIds(): { children: Set<string>; horses: Set<string> } {
    if (this.detailSlot?.booking) {
      const riders = bookingRiders(this.detailSlot.booking);
      return {
        children: new Set([...riders.map((rider) => rider.child.id), ...this.extraPairs.map((pair) => pair.childId)]),
        horses: new Set([...riders.map((rider) => rider.horse.id), ...this.extraPairs.map((pair) => pair.horseId)]),
      };
    }
    return {
      children: new Set(this.pairs.map((pair) => pair.childId)),
      horses: new Set(this.pairs.map((pair) => pair.horseId)),
    };
  }

  private buildEmptyDays(): DayColumn[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(this.weekStart, index);
      return {
        date,
        key: toIsoDate(date),
        label: formatDayHeading(date),
        slots: [],
      };
    });
  }
}
