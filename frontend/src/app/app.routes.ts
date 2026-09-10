import { Routes } from '@angular/router';
import { CalendarPage } from './pages/calendar.page';
import { ChildrenPage } from './pages/children.page';
import { FinancePage } from './pages/finance.page';
import { HorsesPage } from './pages/horses.page';
import { InstructorsPage } from './pages/instructors.page';

export const routes: Routes = [
  { path: '', component: CalendarPage },
  { path: 'instruktorzy', component: InstructorsPage },
  { path: 'dzieci', component: ChildrenPage },
  { path: 'konie', component: HorsesPage },
  { path: 'finanse', component: FinancePage },
];
