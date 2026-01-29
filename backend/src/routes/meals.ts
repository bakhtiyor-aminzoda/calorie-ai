import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { uploadImage, deleteImage } from '../services/cloudinary';
import { analyzeFoodImage } from '../services/openai';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { userId } = req.body;
    // Check if we have EITHER a file (legacy/direct) OR a pre-uploaded photoUrl
    if (!userId || (!req.file && !req.body.photoUrl)) {
      return res.status(400).json({ error: 'Missing data (photo or photoUrl required)' });
    }

    let photoUrl = req.body.photoUrl;

    // If file is provided, upload it (fallback behavior). 
    // If photoUrl is provided, we skip upload!
    if (req.file) {
      console.log('Uploading new photo file...');
      photoUrl = await uploadImage(req.file.buffer);
    } else {
      console.log('Using pre-uploaded photoUrl:', photoUrl);
    }

    let analysis;
    // Check if analysis data is provided in body (from frontend pre-analysis)
    if (req.body.name && req.body.calories) {
      let ingredients: string[] = [];
      if (req.body.ingredients) {
        try {
          const parsed = JSON.parse(req.body.ingredients);
          ingredients = Array.isArray(parsed)
            ? parsed.map((item: any) => String(item)).filter(Boolean)
            : parsed
              ? [String(parsed)]
              : [];
        } catch {
          ingredients = [String(req.body.ingredients)];
        }
      }

      analysis = {
        name: req.body.name,
        calories: Number(req.body.calories),
        protein: Number(req.body.protein),
        fat: Number(req.body.fat),
        carbs: Number(req.body.carbs),
        weightG: req.body.weightG ? Math.round(Number(req.body.weightG)) : null,
        confidence: req.body.confidence ? Number(req.body.confidence) : null,
        ingredients
      };
    } else {
      // Fallback to backend analysis if not provided
      analysis = await analyzeFoodImage(photoUrl);
    }

    const meal = await prisma.meal.create({
      data: {
        userId,
        ...analysis,
        photoUrl
      }
    });

    res.json({ meal });
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({ error: 'Failed to save meal' });
  }
});

router.get('/today/:userId', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await prisma.meal.findMany({
      where: { userId: req.params.userId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'desc' }
    });

    const totals = {
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: Math.round(meals.reduce((s, m) => s + m.protein, 0) * 10) / 10,
      fat: Math.round(meals.reduce((s, m) => s + m.fat, 0) * 10) / 10,
      carbs: Math.round(meals.reduce((s, m) => s + m.carbs, 0) * 10) / 10
    };

    res.json({ meals, totals });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/date/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const startOfDay = new Date(date);
    // Ensure we capture the full day in local time or UTC based on input
    // Assuming date string 'YYYY-MM-DD' implies midnight UTC if parsed directly,
    // BUT we want to match how Prisma stores dates.
    // Ideally, we construct the range explicitly.

    // Fix: Parse YYYY-MM-DD explicitly to avoid timezone shifts
    const [y, m, d] = date.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);

    const meals = await prisma.meal.findMany({
      where: {
        userId,
        date: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totals = {
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: Math.round(meals.reduce((s, m) => s + m.protein, 0) * 10) / 10,
      fat: Math.round(meals.reduce((s, m) => s + m.fat, 0) * 10) / 10,
      carbs: Math.round(meals.reduce((s, m) => s + m.carbs, 0) * 10) / 10
    };

    res.json({ meals, totals });
  } catch (error) {
    console.error('Get meals by date error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:mealId', async (req, res) => {
  try {
    const meal = await prisma.meal.findUnique({ where: { id: req.params.mealId } });
    if (!meal) return res.status(404).json({ error: 'Not found' });

    if (meal.photoUrl) await deleteImage(meal.photoUrl);
    await prisma.meal.delete({ where: { id: req.params.mealId } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
