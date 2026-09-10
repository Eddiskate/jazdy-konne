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
import { CalendarSlot, Child, Horse, Instructor, personName } from '../models';

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
  childId = '';
  horseId = '';
  recurrence: 'none' | 'interval' = 'none';
  intervalDays = 7;
  saving = false;
  formError = '';

  get weekLabel(): string {
    return formatWeekRange(this.weekStart, addDays(this.weekStart, 6));
  }

  get selectedChild(): Child | undefined {
    return this.children.find((child) => child._id === this.childId);
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
    this.childId = this.children[0]?._id || '';
    this.horseId = this.horses[0]?._id || '';
    this.recurrence = 'none';
    this.intervalDays = 7;
    this.formError = '';
  }

  openDetail(slot: CalendarSlot): void {
    this.detailSlot = slot;
    this.bookingSlot = null;
    this.formError = '';
  }

  closePanels(): void {
    this.bookingSlot = null;
    this.detailSlot = null;
    this.formError = '';
    this.saving = false;
  }

  saveBooking(): void {
    if (!this.bookingSlot || !this.instructorId || !this.childId || !this.horseId) {
      this.formError = 'Wybierz dziecko i konia.';
      return;
    }
    this.saving = true;
    this.formError = '';
    this.api
      .createBooking({
        instructorId: this.instructorId,
        childId: this.childId,
        horseId: this.horseId,
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

  recurrenceLabel(slot: CalendarSlot): string {
    if (!slot.booking?.recurring) return 'Jednorazowo';
    const days = slot.booking.intervalDays || 1;
    return days === 1 ? 'Co dzień' : `Co ${days} dni`;
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
