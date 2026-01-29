import { create } from 'zustand';
import { type User, type Meal, type Totals } from '../api';
import { type Language } from '../utils/i18n';



interface AppState {
  user: User | null;
  meals: Meal[];
  totals: Totals;
  selectedDate: Date;
  language: Language;
  setUser: (user: User) => void;
  setMeals: (meals: Meal[], totals: Totals) => void;
  setSelectedDate: (date: Date) => void;
  setLanguage: (lang: Language) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (mealId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  meals: [],
  totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  selectedDate: new Date(),
  language: 'ru' as Language,
  setUser: (user) => set({ user }),
  setMeals: (meals, totals) => set({ meals, totals }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLanguage: (language) => set({ language }),
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
  })
}));
