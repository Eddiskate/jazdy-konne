import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ApiService, apiErrorMessage } from '../api.service';
import { FinanceSummary, personName } from '../models';

@Component({
  selector: 'app-finance-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.page.html',
  styleUrl: './finance.page.scss',
})
export class FinancePage implements OnInit {
  private readonly api = inject(ApiService);

  month = this.currentMonth();
  summary: FinanceSummary | null = null;
  loading = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.finance(this.month).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = apiErrorMessage(error, 'Nie udało się wczytać finansów.');
      },
    });
  }

  prevMonth(): void {
    this.month = this.shiftMonth(-1);
    this.load();
  }

  nextMonth(): void {
    this.month = this.shiftMonth(1);
    this.load();
  }

  personName = personName;

  money(value: number): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value || 0);
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private shiftMonth(delta: number): string {
    const [year, month] = this.month.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
