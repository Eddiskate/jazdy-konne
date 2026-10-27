import mongoose from 'mongoose';

const childSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    preferredHours: {
      from: { type: String, required: true },
      to: { type: String, required: true },
    },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 120 },
    guardianName: { type: String, default: '', trim: true, maxlength: 60 },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    source: { type: String, default: '', trim: true, maxlength: 40 },
    riderKind: { type: String, enum: ['child', 'adult'], required: false },
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
