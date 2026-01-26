#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🎨 Настройка Frontend...${NC}"

# Создаем структуру (вы уже в calorie-ai)
mkdir -p frontend/src/{components,store,api}
cd frontend

# package.json
cat > package.json << 'EOF'
{
  "name": "calorie-ai-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@telegram-apps/sdk-react": "^1.1.3",
    "zustand": "^4.5.2",
    "axios": "^1.7.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.3.1",
    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19"
  }
}
EOF

# Configuration files
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' }
});
EOF

cat > tailwind.config.js << 'EOF'
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'tg-bg': 'var(--tg-theme-bg-color)',
        'tg-text': 'var(--tg-theme-text-color)',
        'tg-hint': 'var(--tg-theme-hint-color)',
        'tg-link': 'var(--tg-theme-link-color)',
        'tg-button': 'var(--tg-theme-button-color)',
        'tg-button-text': 'var(--tg-theme-button-text-color)'
      }
    }
  },
  plugins: []
}
EOF

cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
EOF

cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

echo "VITE_API_URL=http://localhost:3000/api" > .env

# index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CalorieAI</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# src/main.tsx
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# src/index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: var(--tg-theme-bg-color, #fff);
  color: var(--tg-theme-text-color, #000);
}

#root {
  min-height: 100vh;
}
EOF

# src/App.tsx
cat > src/App.tsx << 'EOF'
import { useEffect, useState } from 'react';
import { SDKProvider, useLaunchParams } from '@telegram-apps/sdk-react';
import Onboarding from './components/Onboarding';
import MainScreen from './components/MainScreen';
import { useStore } from './store/useStore';
import { authenticate, getTodayMeals } from './api';

function AppContent() {
  const launchParams = useLaunchParams();
  const { user, setUser, setMeals } = useStore();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.ready();
          window.Telegram.WebApp.expand();
        }

        const initData = launchParams.initDataRaw || '';
        const authenticatedUser = await authenticate(initData);
        setUser(authenticatedUser);

        if (authenticatedUser.dailyCalorieGoal === 2000) {
          setIsOnboarding(true);
        } else {
          const { meals, totals } = await getTodayMeals(authenticatedUser.id);
          setMeals(meals, totals);
        }
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleOnboardingComplete = async (goal: number) => {
    if (user) {
      const updatedUser = { ...user, dailyCalorieGoal: goal };
      setUser(updatedUser);
      setIsOnboarding(false);
      const { meals, totals } = await getTodayMeals(user.id);
      setMeals(meals, totals);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tg-button mx-auto mb-4"></div>
          <p className="text-tg-hint">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (isOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;
  return <MainScreen />;
}

function App() {
  return (
    <SDKProvider acceptCustomStyles>
      <AppContent />
    </SDKProvider>
  );
}

export default App;
EOF

# src/store/useStore.ts
cat > src/store/useStore.ts << 'EOF'
import { create } from 'zustand';

interface User {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  dailyCalorieGoal: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  photoUrl: string | null;
  date: string;
  createdAt: string;
}

interface Totals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface AppState {
  user: User | null;
  meals: Meal[];
  totals: Totals;
  isLoading: boolean;
  setUser: (user: User) => void;
  setMeals: (meals: Meal[], totals: Totals) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (mealId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  meals: [],
  totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  isLoading: false,
  setUser: (user) => set({ user }),
  setMeals: (meals, totals) => set({ meals, totals }),
  addMeal: (meal) => set((state) => {
    const newMeals = [meal, ...state.meals];
    const newTotals = {
      calories: state.totals.calories + meal.calories,
      protein: Math.round((state.totals.protein + meal.protein) * 10) / 10,
      fat: Math.round((state.totals.fat + meal.fat) * 10) / 10,
      carbs: Math.round((state.totals.carbs + meal.carbs) * 10) / 10
    };
    return { meals: newMeals, totals: newTotals };
  }),
  removeMeal: (mealId) => set((state) => {
    const meal = state.meals.find(m => m.id === mealId);
    if (!meal) return state;
    const newMeals = state.meals.filter(m => m.id !== mealId);
    const newTotals = {
      calories: state.totals.calories - meal.calories,
      protein: Math.round((state.totals.protein - meal.protein) * 10) / 10,
      fat: Math.round((state.totals.fat - meal.fat) * 10) / 10,
      carbs: Math.round((state.totals.carbs - meal.carbs) * 10) / 10
    };
    return { meals: newMeals, totals: newTotals };
  }),
  setLoading: (isLoading) => set({ isLoading })
}));
EOF

# src/api/index.ts
cat > src/api/index.ts << 'EOF'
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const api = axios.create({ baseURL: API_URL });

export interface User {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  dailyCalorieGoal: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  photoUrl: string | null;
  date: string;
  createdAt: string;
}

export interface Totals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const authenticate = async (initData: string) => {
  const response = await api.post<{ user: User }>('/auth', { initData });
  return response.data.user;
};

export const getProfile = async (userId: string) => {
  const response = await api.get<{ user: User }>(`/user/${userId}`);
  return response.data.user;
};

export const updateCalorieGoal = async (userId: string, goal: number) => {
  const response = await api.patch<{ user: User }>(`/user/${userId}`, { dailyCalorieGoal: goal });
  return response.data.user;
};

export const createMeal = async (userId: string, photo: File) => {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('photo', photo);
  const response = await api.post<{ meal: Meal }>('/meals', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.meal;
};

export const getTodayMeals = async (userId: string) => {
  const response = await api.get<{ meals: Meal[]; totals: Totals }>(`/meals/today/${userId}`);
  return response.data;
};

export const deleteMeal = async (mealId: string) => {
  await api.delete(`/meals/${mealId}`);
};
EOF

# src/components/Onboarding.tsx
cat > src/components/Onboarding.tsx << 'EOF'
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { updateCalorieGoal } from '../api';

interface Props {
  onComplete: (goal: number) => void;
}

export default function Onboarding({ onComplete }: Props) {
  const { user } = useStore();
  const [goal, setGoal] = useState('2000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const goalNum = parseInt(goal);
    if (goalNum < 500 || goalNum > 10000) {
      alert('Цель должна быть от 500 до 10000 калорий');
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      await updateCalorieGoal(user.id, goalNum);
      onComplete(goalNum);
    } catch (error) {
      alert('Ошибка при сохранении цели');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-tg-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold text-tg-text mb-2">Добро пожаловать в CalorieAI!</h1>
          <p className="text-tg-hint">Умный подсчет калорий с помощью AI</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <label className="block mb-2 text-sm font-medium text-tg-text">Ваша дневная цель калорий</label>
          <input type="number" value={goal} onChange={(e) => setGoal(e.target.value)}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-tg-button focus:outline-none bg-white dark:bg-gray-700 text-tg-text"
            placeholder="2000" min="500" max="10000" />
          <p className="mt-2 text-xs text-tg-hint">Рекомендуется: 1500-2500 ккал</p>
        </div>
        <button onClick={handleSubmit} disabled={isSubmitting}
          className="w-full mt-6 py-4 bg-tg-button text-tg-button-text rounded-xl font-semibold text-lg disabled:opacity-50">
          {isSubmitting ? 'Сохранение...' : 'Начать'}
        </button>
      </div>
    </div>
  );
}
EOF

# src/components/ProgressCircle.tsx
cat > src/components/ProgressCircle.tsx << 'EOF'
interface Props {
  current: number;
  goal: number;
  progress: number;
}

export default function ProgressCircle({ current, goal, progress }: Props) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;
  const color = progress > 100 ? '#ef4444' : progress > 80 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="200" height="200" className="transform -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-tg-text">{current}</div>
          <div className="text-sm text-tg-hint">из {goal} ккал</div>
          <div className="text-xs text-tg-hint mt-1">{Math.round(progress)}%</div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-lg font-semibold text-tg-text">
          {goal - current > 0 ? `Осталось ${goal - current} ккал` : `Превышение на ${current - goal} ккал`}
        </div>
      </div>
    </div>
  );
}
EOF

# src/components/MealCard.tsx
cat > src/components/MealCard.tsx << 'EOF'
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { deleteMeal } from '../api';

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  photoUrl: string | null;
  createdAt: string;
}

export default function MealCard({ meal }: { meal: Meal }) {
  const { removeMeal } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Удалить этот прием пищи?')) return;
    setIsDeleting(true);
    try {
      await deleteMeal(meal.id);
      removeMeal(meal.id);
    } catch (error) {
      alert('Ошибка при удалении');
    } finally {
      setIsDeleting(false);
    }
  };

  const time = new Date(meal.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md">
      <div className="flex gap-3 p-3">
        {meal.photoUrl && <img src={meal.photoUrl} alt={meal.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-tg-text truncate">{meal.name}</h3>
              <p className="text-xs text-tg-hint mt-1">{time}</p>
            </div>
            <button onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="flex gap-3 mt-2 text-xs">
            <div><span className="font-semibold text-tg-text">{meal.calories}</span><span className="text-tg-hint"> ккал</span></div>
            <div className="text-tg-hint">•</div>
            <div><span className="text-blue-500">Б: {meal.protein}г</span></div>
            <div><span className="text-yellow-500">Ж: {meal.fat}г</span></div>
            <div><span className="text-green-500">У: {meal.carbs}г</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

# src/components/MainScreen.tsx
cat > src/components/MainScreen.tsx << 'EOF'
import { useState } from 'react';
import { useStore } from '../store/useStore';
import ProgressCircle from './ProgressCircle';
import MealCard from './MealCard';
import AddMealModal from './AddMealModal';

export default function MainScreen() {
  const { user, meals, totals } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  if (!user) return null;

  const progress = (totals.calories / user.dailyCalorieGoal) * 100;

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-tg-text">Привет, {user.firstName || 'Пользователь'}! 👋</h1>
          <p className="text-tg-hint mt-1">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <ProgressCircle current={totals.calories} goal={user.dailyCalorieGoal} progress={progress} />
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center"><div className="text-2xl font-bold text-blue-500">{totals.protein}г</div><div className="text-xs text-tg-hint mt-1">Белки</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-yellow-500">{totals.fat}г</div><div className="text-xs text-tg-hint mt-1">Жиры</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-green-500">{totals.carbs}г</div><div className="text-xs text-tg-hint mt-1">Углеводы</div></div>
          </div>
        </div>
      </div>
      <div className="px-6">
        <h2 className="text-xl font-semibold text-tg-text mb-4">Приемы пищи ({meals.length})</h2>
        {meals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-tg-hint">Вы еще не добавили ни одного приема пищи</p>
            <p className="text-tg-hint text-sm mt-2">Нажмите кнопку внизу, чтобы добавить</p>
          </div>
        ) : (
          <div className="space-y-3">{meals.map(meal => <MealCard key={meal.id} meal={meal} />)}</div>
        )}
      </div>
      <button onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-tg-button text-tg-button-text px-8 py-4 rounded-full shadow-lg font-semibold text-lg flex items-center gap-2">
        <span className="text-2xl">+</span>Добавить еду
      </button>
      {showAddModal && <AddMealModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
EOF

# src/components/AddMealModal.tsx
cat > src/components/AddMealModal.tsx << 'EOF'
import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { createMeal } from '../api';

export default function AddMealModal({ onClose }: { onClose: () => void }) {
  const { user, addMeal } = useStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user) return;
    setIsAnalyzing(true);
    try {
      const meal = await createMeal(user.id, selectedFile);
      addMeal(meal);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      onClose();
    } catch (error) {
      alert('Не удалось распознать еду. Попробуйте другое фото.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-tg-text">Добавить еду</h2>
          <button onClick={onClose} disabled={isAnalyzing} className="text-tg-hint hover:text-tg-text">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {!preview ? (
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-tg-button">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-tg-text font-medium mb-2">Выберите фото еды</p>
              <p className="text-tg-hint text-sm">Нажмите, чтобы выбрать из галереи</p>
            </div>
          ) : (
            <div>
              <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-xl mb-4" />
              {!isAnalyzing && (
                <button onClick={() => { setSelectedFile(null); setPreview(null); }} className="text-tg-hint text-sm hover:text-tg-text mb-4">
                  ← Выбрать другое фото
                </button>
              )}
              {isAnalyzing && (
                <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Анализируем блюдо...</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">AI распознает еду и считает калории</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>
        {preview && !isAnalyzing && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleSubmit} className="w-full bg-tg-button text-tg-button-text py-3 rounded-xl font-semibold">
              Добавить в дневник
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

echo -e "${YELLOW}📦 Устанавливаем зависимости Frontend...${NC}"
npm install --silent

echo ""
echo -e "${GREEN}✅ Frontend создан!${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗"
echo "║  🎉 ВСЕ ФАЙЛЫ УСПЕШНО СОЗДАНЫ!                 ║"
echo "╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📂 Проект находится в:${NC} ~/Desktop/calorie-ai"
echo ""
echo -e "${YELLOW}⚠️  СЛЕДУЮЩИЕ ШАГИ:${NC}"
echo ""
echo "1️⃣  Настройте API ключи:"
echo "   ${GREEN}nano ~/Desktop/calorie-ai/backend/.env${NC}"
echo ""
echo "2️⃣  Создайте базу данных:"
echo "   ${GREEN}createdb calorieai${NC}"
echo ""
echo "3️⃣  Инициализируйте Prisma:"
echo "   ${GREEN}cd ~/Desktop/calorie-ai/backend${NC}"
echo "   ${GREEN}npx prisma generate${NC}"
echo "   ${GREEN}npx prisma db push${NC}"
echo ""
echo "4️⃣  Запустите Backend (Terminal 1):"
echo "   ${GREEN}cd ~/Desktop/calorie-ai/backend && npm run dev${NC}"
echo ""
echo "5️⃣  Запустите Frontend (Terminal 2):"
echo "   ${GREEN}cd ~/Desktop/calorie-ai/frontend && npm run dev${NC}"
echo ""
echo "6️⃣  Запустите ngrok (Terminal 3):"
echo "   ${GREEN}ngrok http 5173${NC}"
echo ""
echo -e "${GREEN}Готово! 🚀${NC}"