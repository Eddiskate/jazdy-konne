import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    horseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Horse', required: true },
    start: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    recurrence: {
      type: { type: String, enum: ['none', 'interval'], default: 'none' },
      intervalDays: { type: Number, min: 1, default: null },
    },
    cancelledDates: { type: [Date], default: [] },
    seriesEndedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ instructorId: 1, start: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
