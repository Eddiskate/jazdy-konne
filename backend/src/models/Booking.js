import mongoose from 'mongoose';

const riderSchema = new mongoose.Schema(
  {
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    horseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Horse', required: true },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    riders: { type: [riderSchema], default: [] },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
    horseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Horse' },
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
