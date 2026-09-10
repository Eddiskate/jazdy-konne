import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, apiErrorMessage } from '../api.service';
import { Instructor, WEEKDAYS, WeekHours, emptyWeekHours, personName } from '../models';

@Component({
  selector: 'app-instructors-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructors.page.html',
})
export class InstructorsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly weekdays = WEEKDAYS;

  instructors: Instructor[] = [];
  editingId: string | null = null;
  firstName = '';
  lastName = '';
  preferredHours: WeekHours = emptyWeekHours();
  error = '';
  saving = false;
  open = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.instructors().subscribe({
      next: (items) => (this.instructors = items),
      error: (error) => (this.error = apiErrorMessage(error)),
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.firstName = '';
    this.lastName = '';
    this.preferredHours = emptyWeekHours();
    this.error = '';
    this.open = true;
  }

  startEdit(instructor: Instructor): void {
    this.editingId = instructor._id;
    this.firstName = instructor.firstName;
    this.lastName = instructor.lastName;
    this.preferredHours = structuredClone({
      ...emptyWeekHours(),
      ...instructor.preferredHours,
    });
    this.error = '';
    this.open = true;
  }

  addRange(day: keyof WeekHours): void {
    this.preferredHours[day] = [...this.preferredHours[day], { from: '09:00', to: '13:00' }];
  }

  removeRange(day: keyof WeekHours, index: number): void {
    this.preferredHours[day] = this.preferredHours[day].filter((_, i) => i !== index);
  }

  close(): void {
    this.open = false;
  }

  save(): void {
    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.error = 'Podaj imię i nazwisko.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.api
      .saveInstructor(
        {
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          preferredHours: this.preferredHours,
        },
        this.editingId || undefined,
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.open = false;
          this.reload();
        },
        error: (error) => {
          this.saving = false;
          this.error = apiErrorMessage(error);
        },
      });
  }

  remove(instructor: Instructor): void {
    if (!confirm(`Usunąć instruktora ${personName(instructor)}? Jego jazdy też znikną.`)) return;
    this.api.deleteInstructor(instructor._id).subscribe({
      next: () => this.reload(),
      error: (error) => (this.error = apiErrorMessage(error)),
    });
  }

  hoursSummary(instructor: Instructor): string {
    return WEEKDAYS
      .filter((day) => (instructor.preferredHours?.[day.key] || []).length)
      .map((day) => {
        const ranges = instructor.preferredHours[day.key]
          .map((range) => `${range.from}–${range.to}`)
          .join(', ');
        return `${day.short} ${ranges}`;
      })
      .join(' · ') || 'Brak godzin';
  }

  personName = personName;
}
