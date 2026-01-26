import { Router } from 'express';
import { PrismaClient, ActivityLevel, Gender, Goal } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        dailyCalorieGoal: user.dailyCalorieGoal,
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
      age,
      gender,
      heightCm,
      weightKg,
      activity,
      goal
    } = req.body;

    // Build update object
    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (age !== undefined) data.age = parseInt(age);
    if (gender !== undefined) data.gender = gender as Gender;
    if (heightCm !== undefined) data.heightCm = parseInt(heightCm);
    if (weightKg !== undefined) data.weightKg = parseFloat(weightKg);
    if (activity !== undefined) data.activity = activity as ActivityLevel;
    if (goal !== undefined) data.goal = goal as Goal;

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

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        username: user.username,
        dailyCalorieGoal: user.dailyCalorieGoal,
        age: user.age,
        gender: user.gender,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        activity: user.activity,
        goal: user.goal
      }, recommended: computed ?? null
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
