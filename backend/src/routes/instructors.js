import { Router } from 'express';
import { Horse } from '../models/Horse.js';
import { Instructor } from '../models/Instructor.js';
import { WEEKDAYS } from '../services/slots.js';

export const instructorsExtraRouter = Router();

instructorsExtraRouter.patch('/:id/weekday-horses', async (req, res, next) => {
  try {
    const weekday = String(req.body.weekday || '');
    if (!WEEKDAYS.includes(weekday)) {
      return res.status(400).json({ error: 'Podaj dzień tygodnia.' });
    }

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) return res.status(404).json({ error: 'Nie znaleziono instruktora.' });

    const nextMap = { ...(instructor.availableHorsesByWeekday || {}) };

    if (req.body.horseIds == null) {
      delete nextMap[weekday];
    } else {
      if (!Array.isArray(req.body.horseIds)) {
        return res.status(400).json({ error: 'Podaj listę koni.' });
      }
      const ids = [...new Set(req.body.horseIds.map(String).filter(Boolean))];
      if (ids.length) {
        const found = await Horse.find({ _id: { $in: ids } }).select('_id');
        if (found.length !== ids.length) {
          return res.status(404).json({ error: 'Nie znaleziono konia.' });
        }
      }
      nextMap[weekday] = ids;
    }

    instructor.availableHorsesByWeekday = nextMap;
    instructor.markModified('availableHorsesByWeekday');
    await instructor.save();
    res.json(instructor);
  } catch (error) {
    next(error);
  }
});
