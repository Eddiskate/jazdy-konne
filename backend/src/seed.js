import { connectDb } from './db.js';
import { Booking } from './models/Booking.js';
import { Child } from './models/Child.js';
import { Horse } from './models/Horse.js';
import { Instructor } from './models/Instructor.js';

const weekday = (from, to) => [{ from, to }];

const fullWeek = {
  monday: weekday('08:00', '16:00'),
  tuesday: weekday('08:00', '16:00'),
  wednesday: weekday('08:00', '16:00'),
  thursday: weekday('08:00', '16:00'),
  friday: weekday('08:00', '16:00'),
  saturday: weekday('09:00', '13:00'),
  sunday: [],
};

const afternoonWeek = {
  monday: [],
  tuesday: weekday('10:00', '18:00'),
  wednesday: weekday('10:00', '18:00'),
  thursday: weekday('10:00', '18:00'),
  friday: weekday('10:00', '18:00'),
  saturday: weekday('09:00', '15:00'),
  sunday: weekday('10:00', '14:00'),
};

export async function seedIfEmpty() {
  const [instructors, children, horses] = await Promise.all([
    Instructor.countDocuments(),
    Child.countDocuments(),
    Horse.countDocuments(),
  ]);

  if (instructors || children || horses) return false;

  const createdInstructors = await Instructor.insertMany([
    { firstName: 'Anna', lastName: 'Kowalska', preferredHours: fullWeek },
    { firstName: 'Marek', lastName: 'Nowak', preferredHours: afternoonWeek },
  ]);

  await Child.insertMany([
    { firstName: 'Zosia', lastName: 'Wiśniewska', hourlyRate: 80, preferredHours: { from: '10:00', to: '16:00' } },
    { firstName: 'Antoni', lastName: 'Zieliński', hourlyRate: 90, preferredHours: { from: '14:00', to: '18:00' } },
    { firstName: 'Lena', lastName: 'Dąbrowska', hourlyRate: 80, preferredHours: { from: '09:00', to: '13:00' } },
    { firstName: 'Jakub', lastName: 'Wójcik', hourlyRate: 100, preferredHours: { from: '15:00', to: '19:00' } },
  ]);

  await Horse.insertMany([
    { name: 'Błyskawica' },
    { name: 'Grafit' },
    { name: 'Mila' },
    { name: 'Orion' },
  ]);

  console.log(
    `Seed: ${createdInstructors.length} instruktorów, 4 dzieci, 4 konie. Rezerwacje dodaj w kalendarzu.`,
  );
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  await connectDb();
  await Booking.deleteMany({});
  await Child.deleteMany({});
  await Horse.deleteMany({});
  await Instructor.deleteMany({});
  await seedIfEmpty();
  process.exit(0);
}
