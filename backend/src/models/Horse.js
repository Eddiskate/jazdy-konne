import mongoose from 'mongoose';

const horseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    /** false = ukryty w kalendarzu jazd i w publicznym API strony */
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

horseSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    await mongoose.model('Booking').deleteMany({ horseId: doc._id });
  }
});

export const Horse = mongoose.model('Horse', horseSchema);
