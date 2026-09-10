import mongoose from 'mongoose';

const timeRangeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false },
);

const preferredHoursSchema = new mongoose.Schema(
  {
    monday: { type: [timeRangeSchema], default: [] },
    tuesday: { type: [timeRangeSchema], default: [] },
    wednesday: { type: [timeRangeSchema], default: [] },
    thursday: { type: [timeRangeSchema], default: [] },
    friday: { type: [timeRangeSchema], default: [] },
    saturday: { type: [timeRangeSchema], default: [] },
    sunday: { type: [timeRangeSchema], default: [] },
  },
  { _id: false },
);

const instructorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    preferredHours: { type: preferredHoursSchema, default: () => ({}) },
  },
  { timestamps: true },
);

instructorSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    await mongoose.model('Booking').deleteMany({ instructorId: doc._id });
  }
});

export const Instructor = mongoose.model('Instructor', instructorSchema);
