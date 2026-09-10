import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, apiErrorMessage } from '../api.service';
import { Horse } from '../models';

@Component({
  selector: 'app-horses-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horses.page.html',
})
export class HorsesPage implements OnInit {
  private readonly api = inject(ApiService);

  horses: Horse[] = [];
  editingId: string | null = null;
  name = '';
  error = '';
  saving = false;
  open = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.horses().subscribe({
      next: (items) => (this.horses = items),
      error: (error) => (this.error = apiErrorMessage(error)),
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.name = '';
    this.error = '';
    this.open = true;
  }

  startEdit(horse: Horse): void {
    this.editingId = horse._id;
    this.name = horse.name;
    this.error = '';
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  save(): void {
    if (!this.name.trim()) {
      this.error = 'Podaj imię konia.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.api.saveHorse({ name: this.name.trim() }, this.editingId || undefined).subscribe({
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

  remove(horse: Horse): void {
    if (!confirm(`Usunąć konia ${horse.name}? Przypisane jazdy też znikną.`)) return;
    this.api.deleteHorse(horse._id).subscribe({
      next: () => this.reload(),
      error: (error) => (this.error = apiErrorMessage(error)),
    });
  }
}
