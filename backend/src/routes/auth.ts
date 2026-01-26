import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateTelegramData } from '../utils/telegram';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'initData required' });

    const telegramUser = validateTelegramData(initData);
    if (!telegramUser) return res.status(401).json({ error: 'Invalid Telegram data' });

    let user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramUser.id) } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(telegramUser.id),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username
        }
      });
    } else {
      // Sync username if changed
      if (user.username !== telegramUser.username) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { username: telegramUser.username }
        });
      }
    }

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
        goal: user.goal
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
