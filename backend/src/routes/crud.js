import { Router } from 'express';

export function createCrudRouter(Model, { searchFields = [] } = {}) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.q && searchFields.length) {
        filter.$or = searchFields.map((field) => ({
          [field]: { $regex: String(req.query.q), $options: 'i' },
        }));
      }
      const items = await Model.find(filter).sort({ lastName: 1, firstName: 1, name: 1 });
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const item = await Model.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Nie znaleziono.' });
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const item = await Model.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!item) return res.status(404).json({ error: 'Nie znaleziono.' });
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: 'Nie znaleziono.' });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
