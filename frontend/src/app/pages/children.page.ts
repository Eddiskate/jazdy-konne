import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, apiErrorMessage } from '../api.service';
import { Child, personName } from '../models';

@Component({
  selector: 'app-children-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './children.page.html',
})
export class ChildrenPage implements OnInit {
  private readonly api = inject(ApiService);

  children: Child[] = [];
  editingId: string | null = null;
  firstName = '';
  lastName = '';
  hourlyRate: number | null = 80;
  from = '10:00';
  to = '16:00';
  error = '';
  saving = false;
  open = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.children().subscribe({
      next: (items) => (this.children = items),
      error: (error) => (this.error = apiErrorMessage(error)),
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.firstName = '';
    this.lastName = '';
    this.hourlyRate = 80;
    this.from = '10:00';
    this.to = '16:00';
    this.error = '';
    this.open = true;
  }

  startEdit(child: Child): void {
    this.editingId = child._id;
    this.firstName = child.firstName;
    this.lastName = child.lastName;
    this.hourlyRate = child.hourlyRate;
    this.from = child.preferredHours?.from || '10:00';
    this.to = child.preferredHours?.to || '16:00';
    this.error = '';
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  save(): void {
    if (!this.firstName.trim() || !this.lastName.trim() || this.hourlyRate == null) {
      this.error = 'Uzupełnij imię, nazwisko i stawkę.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.api
      .saveChild(
        {
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          hourlyRate: Number(this.hourlyRate),
          preferredHours: { from: this.from, to: this.to },
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

  remove(child: Child): void {
    if (!confirm(`Usunąć ${personName(child)}? Przypisane jazdy też znikną.`)) return;
    this.api.deleteChild(child._id).subscribe({
      next: () => this.reload(),
      error: (error) => (this.error = apiErrorMessage(error)),
    });
  }

  personName = personName;
}
