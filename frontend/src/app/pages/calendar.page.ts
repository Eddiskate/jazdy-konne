import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
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
import { CalendarSlot, Child, Horse, Instructor, SlotRider, bookingRiders, personName } from '../models';

interface RiderDraft {
  key: number;
  childId: string;
  horseId: string;
  recurrence: 'none' | 'interval';
  intervalDays: number;
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
    const riders = this.toPayload(this.pairs);
    if (!this.bookingSlot || !this.instructorId || !riders.length) {
      this.formError = 'Wybierz dziecko i konia.';
      return;
    }
    const error = this.duplicateError(riders);
    if (error) {
      this.formError = error;
      return;
    }
    this.saving = true;
    this.formError = '';
    this.api
      .createBooking({
        instructorId: this.instructorId,
        start: this.bookingSlot.start,
        riders,
      })
      .subscribe({
        next: () => {
          this.closePanels();
          this.loadCalendar();
        },
        error: (err) => {
          this.saving = false;
          this.formError = apiErrorMessage(err, 'Nie udało się obsadzić slotu.');
        },
      });
  }

  saveExtraRiders(): void {
    if (!this.detailSlot || !this.instructorId) return;
    const existing = bookingRiders(this.detailSlot.booking);
    const added = this.toPayload(this.extraPairs);
    if (!added.length) {
      this.formError = 'Dodaj przynajmniej jeden nowy zestaw.';
      return;
    }
    const combined = [
      ...existing.map((rider) => ({ childId: rider.child.id, horseId: rider.horse.id })),
      ...added,
    ];
    const error = this.duplicateError(combined);
    if (error) {
      this.formError = error;
      return;
    }
    this.saving = true;
    this.formError = '';
    this.api
      .createBooking({
        instructorId: this.instructorId,
        start: this.detailSlot.start,
        riders: added,
      })
      .subscribe({
        next: () => {
          this.closePanels();
          this.loadCalendar();
        },
        error: (err) => {
          this.saving = false;
          this.formError = apiErrorMessage(err, 'Nie udało się dodać zestawu.');
        },
      });
  }

  cancelRider(rider: SlotRider): void {
    if (!this.detailSlot) return;
    this.saving = true;
    this.formError = '';
    this.api.cancelOccurrence(rider.bookingId, this.detailSlot.start).subscribe({
      next: () => {
        this.closePanels();
        this.loadCalendar();
      },
      error: (error) => {
        this.saving = false;
        this.formError = apiErrorMessage(error, 'Nie udało się anulować zestawu.');
      },
    });
  }

  cancelRiderSeries(rider: SlotRider): void {
    if (!this.detailSlot) return;
    this.saving = true;
    this.formError = '';
    this.api.cancelSeries(rider.bookingId, this.detailSlot.start).subscribe({
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

  cancelAllInSlot(): void {
    if (!this.detailSlot?.booking) return;
    const riders = bookingRiders(this.detailSlot.booking);
    if (!riders.length) return;
    this.saving = true;
    this.formError = '';
    forkJoin(
      riders.map((rider) => this.api.cancelOccurrence(rider.bookingId, this.detailSlot!.start)),
    ).subscribe({
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

  riderRecurrence(rider: SlotRider): string {
    if (!rider.recurring) return 'Jednorazowo';
    const days = rider.intervalDays || 1;
    return days === 1 ? 'Co dzień' : `Co ${days} dni`;
  }

  private toPayload(pairs: RiderDraft[]) {
    return pairs
      .filter((pair) => pair.childId && pair.horseId)
      .map((pair) => ({
        childId: pair.childId,
        horseId: pair.horseId,
        recurrence:
          pair.recurrence === 'interval'
            ? { type: 'interval' as const, intervalDays: Number(pair.intervalDays) }
            : { type: 'none' as const },
      }));
  }

  private duplicateError(riders: { childId: string; horseId: string }[]): string | null {
    const childIds = riders.map((rider) => rider.childId);
    const horseIds = riders.map((rider) => rider.horseId);
    if (new Set(childIds).size !== childIds.length) {
      return 'To samo dziecko nie może być dwa razy w jednym slocie.';
    }
    if (new Set(horseIds).size !== horseIds.length) {
      return 'Ten sam koń nie może być dwa razy w jednym slocie.';
    }
    return null;
  }

  private newPair(): RiderDraft {
    const used = this.usedRiderIds();
    const child = this.children.find((item) => !used.children.has(item._id)) || this.children[0];
    const horse = this.horses.find((item) => !used.horses.has(item._id)) || this.horses[0];
    return {
      key: this.pairKey++,
      childId: child?._id || '',
      horseId: horse?._id || '',
      recurrence: 'none',
      intervalDays: 7,
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
