import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { CalendarResponse, Child, FinanceSummary, Horse, Instructor } from './models';

export function apiErrorMessage(error: unknown, fallback = 'Coś poszło nie tak.'): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.error || error.message || fallback;
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private url(path: string): string {
    return `${environment.apiUrl}${path}`;
  }

  instructors(): Observable<Instructor[]> {
    return this.http.get<Instructor[]>(this.url('/api/instructors'));
  }

  saveInstructor(payload: Partial<Instructor>, id?: string): Observable<Instructor> {
    return id
      ? this.http.put<Instructor>(this.url(`/api/instructors/${id}`), payload)
      : this.http.post<Instructor>(this.url('/api/instructors'), payload);
  }

  deleteInstructor(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/api/instructors/${id}`));
  }

  children(): Observable<Child[]> {
    return this.http.get<Child[]>(this.url('/api/children'));
  }

  saveChild(payload: Partial<Child>, id?: string): Observable<Child> {
    return id
      ? this.http.put<Child>(this.url(`/api/children/${id}`), payload)
      : this.http.post<Child>(this.url('/api/children'), payload);
  }

  deleteChild(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/api/children/${id}`));
  }

  horses(): Observable<Horse[]> {
    return this.http.get<Horse[]>(this.url('/api/horses'));
  }

  saveHorse(payload: Partial<Horse>, id?: string): Observable<Horse> {
    return id
      ? this.http.put<Horse>(this.url(`/api/horses/${id}`), payload)
      : this.http.post<Horse>(this.url('/api/horses'), payload);
  }

  deleteHorse(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/api/horses/${id}`));
  }

  finance(month: string): Observable<FinanceSummary> {
    return this.http.get<FinanceSummary>(this.url('/api/finance'), { params: { month } });
  }

  calendar(instructorId: string, from: string, to: string): Observable<CalendarResponse> {
    return this.http.get<CalendarResponse>(this.url('/api/calendar'), {
      params: { instructorId, from, to },
    });
  }

  createBooking(payload: {
    instructorId: string;
    start: string;
    riders: {
      childId: string;
      horseId: string;
      recurrence: { type: 'none' } | { type: 'interval'; intervalDays: number };
    }[];
  }) {
    return this.http.post(this.url('/api/bookings'), payload).pipe(
      catchError((error) => throwError(() => error)),
    );
  }

  cancelOccurrence(bookingId: string, date: string) {
    return this.http.post(this.url(`/api/bookings/${bookingId}/cancel`), { date });
  }

  cancelSeries(bookingId: string, from: string) {
    return this.http.post(this.url(`/api/bookings/${bookingId}/cancel-series`), { from });
  }

}
