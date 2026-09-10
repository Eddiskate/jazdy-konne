import mongoose from 'mongoose';

const childSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    preferredHours: {
      from: { type: String, required: true },
      to: { type: String, required: true },
    },
  },
  { timestamps: true },
);

childSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    await mongoose.model('Booking').deleteMany({ childId: doc._id });
  }
});

export const Child = mongoose.model('Child', childSchema);
