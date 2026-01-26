#!/bin/bash

# CalorieAI - Полная автоматическая установка
# Запуск: bash install.sh

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   CalorieAI - Автоматическая установка  ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Проверки
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен. Установите: brew install node${NC}"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL не установлен. Установите: brew install postgresql@15${NC}"
    exit 1
fi

# Создание проекта
PROJECT_DIR="$HOME/Desktop/calorie-ai"
echo -e "${BLUE}📁 Создаем проект в $PROJECT_DIR${NC}"
rm -rf "$PROJECT_DIR" 2>/dev/null || true
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# ==================== BACKEND ====================
echo -e "${GREEN}🔧 Настройка Backend...${NC}"
mkdir -p backend/{prisma,src/{routes,services,utils}}
cd backend

# package.json
cat > package.json << 'EOF'
{
  "name": "calorie-ai-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.73.0",
    "cloudinary": "^2.5.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.12",
    "@types/node": "^20.14.9",
    "prisma": "^5.22.0",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3"
  }
}
EOF

# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# .env
cat > .env << EOF
DATABASE_URL="postgresql://$(whoami)@localhost:5432/calorieai"
BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
OPENAI_API_KEY="YOUR_OPENAI_KEY_HERE"
CLOUDINARY_CLOUD_NAME="YOUR_CLOUDINARY_NAME"
CLOUDINARY_API_KEY="YOUR_CLOUDINARY_KEY"
CLOUDINARY_API_SECRET="YOUR_CLOUDINARY_SECRET"
PORT=3000
NODE_ENV=development
EOF

# Prisma schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String   @id @default(uuid())
  telegramId        BigInt   @unique
  firstName         String?
  lastName          String?
  username          String?
  dailyCalorieGoal  Int      @default(2000)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  meals             Meal[]
  @@map("users")
}

model Meal {
  id          String   @id @default(uuid())
  userId      String
  name        String
  calories    Int
  protein     Float
  fat         Float
  carbs       Float
  photoUrl    String?
  date        DateTime @default(now())
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, date])
  @@map("meals")
}
EOF

# src/index.ts
cat > src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import mealRoutes from './routes/meals';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});
EOF

# src/utils/telegram.ts
cat > src/utils/telegram.ts << 'EOF'
import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export function validateTelegramData(initData: string): TelegramUser | null {
  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) throw new Error('BOT_TOKEN not configured');

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const userParam = urlParams.get('user');
    if (!userParam) return null;

    return JSON.parse(userParam);
  } catch (error) {
    console.error('Telegram validation error:', error);
    return null;
  }
}
EOF

# src/services/openai.ts  
cat > src/services/openai.ts << 'EOF'
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export async function analyzeFoodImage(imageUrl: string): Promise<FoodAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Проанализируй это фото еды и верни ТОЛЬКО JSON: {"name":"название","calories":число,"protein":число,"fat":число,"carbs":число}' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    const jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result: FoodAnalysis = JSON.parse(jsonString);

    return {
      name: result.name,
      calories: Math.round(result.calories),
      protein: Math.round(result.protein * 10) / 10,
      fat: Math.round(result.fat * 10) / 10,
      carbs: Math.round(result.carbs * 10) / 10
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error('Failed to analyze food');
  }
}
EOF

# src/services/cloudinary.ts
cat > src/services/cloudinary.ts << 'EOF'
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadImage(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'calorie-ai', transformation: [{ width: 800, height: 800, crop: 'limit' }] },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result.secure_url);
        else reject(new Error('Upload failed'));
      }
    ).end(buffer);
  });
}

export async function deleteImage(url: string): Promise<void> {
  try {
    const parts = url.split('/');
    const publicId = `calorie-ai/${parts[parts.length - 1].split('.')[0]}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Delete error:', error);
  }
}
EOF

# src/routes/auth.ts
cat > src/routes/auth.ts << 'EOF'
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
    }

    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        dailyCalorieGoal: user.dailyCalorieGoal
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
EOF

# src/routes/user.ts
cat > src/routes/user.ts << 'EOF'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

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
        dailyCalorieGoal: user.dailyCalorieGoal
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/:userId', async (req, res) => {
  try {
    const { dailyCalorieGoal } = req.body;
    if (!dailyCalorieGoal || dailyCalorieGoal < 500 || dailyCalorieGoal > 10000) {
      return res.status(400).json({ error: 'Invalid goal (500-10000)' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { dailyCalorieGoal: parseInt(dailyCalorieGoal) }
    });

    res.json({ user: { id: user.id, dailyCalorieGoal: user.dailyCalorieGoal } });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
EOF

# src/routes/meals.ts (shortened for brevity - will continue in next artifact)
cat > src/routes/meals.ts << 'EOF'
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
    if (!userId || !req.file) return res.status(400).json({ error: 'Missing data' });

    const photoUrl = await uploadImage(req.file.buffer);
    const analysis = await analyzeFoodImage(photoUrl);

    const meal = await prisma.meal.create({
      data: { userId, ...analysis, photoUrl }
    });

    res.json({ meal });
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({ error: 'Failed to analyze' });
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
EOF

echo -e "${YELLOW}📦 Устанавливаем зависимости Backend...${NC}"
npm install --silent

cd ..

# ==================== FRONTEND (продолжение в следующем артефакте) ====================

echo -e "${GREEN}✅ Backend создан!${NC}"
echo -e "${BLUE}Переходим к Frontend...${NC}"