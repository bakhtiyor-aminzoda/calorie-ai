import { Router } from 'express';
import { PrismaClient, ActivityLevel, Gender, Goal } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) {
      console.log(`[GET /user/${req.params.userId}] User not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[GET /user/${req.params.userId}] User data:`, {
      id: user.id,
      firstName: user.firstName,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      activity: user.activity,
      goal: user.goal,
      dailyCalorieGoal: user.dailyCalorieGoal
    });

    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        dailyCalorieGoal: user.dailyCalorieGoal,
        language: user.language,
        age: user.age,
        gender: user.gender,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        activity: user.activity,
        goal: user.goal,
        isPremium: user.isPremium,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      }
    });
  } catch (error) {
    console.error(`[GET /user] Error:`, error);
    res.status(500).json({ error: 'Internal error' });
  }
});

function computeRecommendedCalories(params: {
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  gender?: Gender | null;
  activity?: ActivityLevel | null;
  goal?: Goal | null;
}): number | null {
  const { weightKg, heightCm, age, gender, activity, goal } = params;
  if (!weightKg || !heightCm || !age || !gender) return null;
  const bmr = gender === 'MALE'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const factor = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9
  }[activity || ActivityLevel.SEDENTARY];
  let tdee = bmr * factor;
  // adjust by goal
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  const g = goal || Goal.MAINTAIN;
  if (g === 'LOSS') {
    const deficit = bmi >= 30 ? 0.25 : bmi >= 25 ? 0.2 : 0.15;
    tdee = tdee * (1 - deficit);
  } else if (g === 'GAIN') {
    tdee = tdee * 1.1;
  }
  // floors/ceilings
  const min = gender === 'MALE' ? 1500 : 1200;
  const safe = Math.max(min, tdee);
  return Math.round(safe / 10) * 10;
}

router.patch('/:userId', async (req, res) => {
  try {
    const {
      firstName,
      dailyCalorieGoal,
      language,
      age,
      gender,
      heightCm,
      weightKg,
      activity,
      goal
    } = req.body;

    console.log(`[PATCH /user/${req.params.userId}] Received data:`, {
      firstName,
      age,
      gender,
      heightCm,
      weightKg,
      activity,
      goal
    });

    // Build update object
    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (language !== undefined) data.language = language;
    if (age !== undefined) data.age = parseInt(age);
    if (gender !== undefined) data.gender = gender as Gender;
    if (heightCm !== undefined) data.heightCm = parseInt(heightCm);
    if (weightKg !== undefined) data.weightKg = parseFloat(weightKg);
    if (activity !== undefined) data.activity = activity as ActivityLevel;
    if (goal !== undefined) data.goal = goal as Goal;

    console.log(`[PATCH /user/${req.params.userId}] Parsed data object:`, data);

    // If explicit goal provided, trust it. Otherwise compute recommended if enough inputs.
    let computed: number | null = null;
    computed = computeRecommendedCalories({
      weightKg: data.weightKg ?? undefined,
      heightCm: data.heightCm ?? undefined,
      age: data.age ?? undefined,
      gender: data.gender ?? undefined,
      activity: data.activity ?? undefined,
      goal: (data.goal as Goal) ?? undefined
    });

    if (dailyCalorieGoal !== undefined) {
      const goalNum = parseInt(dailyCalorieGoal);
      if (isNaN(goalNum) || goalNum < 800 || goalNum > 10000) {
        return res.status(400).json({ error: 'Invalid goal (800-10000)' });
      }
      data.dailyCalorieGoal = goalNum;
    } else if (computed) {
      data.dailyCalorieGoal = computed;
    }

    const user = await prisma.user.update({ where: { id: req.params.userId }, data });

    console.log(`[PATCH /user/${req.params.userId}] Updated user:`, {
      id: user.id,
      firstName: user.firstName,
      language: user.language,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      activity: user.activity,
      goal: user.goal,
      dailyCalorieGoal: user.dailyCalorieGoal
    });

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        username: user.username,
        dailyCalorieGoal: user.dailyCalorieGoal,
        language: user.language,
        age: user.age,
        gender: user.gender,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        activity: user.activity,
        goal: user.goal
      }, recommended: computed ?? null
    });
  } catch (error) {
    console.error(`[PATCH /user] Error:`, error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE endpoint to completely reset user data (admin only)
router.delete('/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

    // Get the user to check if they're admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the user is admin
    if (!adminTelegramId || user.telegramId.toString() !== adminTelegramId) {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

    console.log(`[DELETE /user/${userId}/reset] Admin user resetting their data`);

    // Delete all related data using cascade (meals and payment requests will be auto-deleted)
    // But we'll do it explicitly for clarity
    await prisma.meal.deleteMany({ where: { userId } });
    await prisma.paymentRequest.deleteMany({ where: { userId } });

    // Reset user profile to defaults
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyCalorieGoal: 2000,
        age: null,
        gender: null,
        heightCm: null,
        weightKg: null,
        activity: null,
        goal: null,
        isPremium: false,
        subscriptionExpiresAt: null,
        dailyRequestCount: 0,
        lastRequestDate: new Date()
      }
    });

    console.log(`[DELETE /user/${userId}/reset] Successfully reset admin user data`);
    res.json({ success: true, message: 'User data reset successfully' });
  } catch (error) {
    console.error(`[DELETE /user/reset] Error:`, error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
