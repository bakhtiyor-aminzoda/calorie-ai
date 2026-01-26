import { create } from 'zustand';
import { type User, type Meal, type Totals } from '../api';



interface AppState {
  user: User | null;
  meals: Meal[];
  totals: Totals;
  isLoading: boolean;
  selectedDate: Date;
  setUser: (user: User) => void;
  setMeals: (meals: Meal[], totals: Totals) => void;
  setSelectedDate: (date: Date) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (mealId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  meals: [],
  totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
  selectedDate: new Date(),
  isLoading: false,
  setUser: (user) => set({ user }),
  setMeals: (meals, totals) => set({ meals, totals }),
  setSelectedDate: (date) => set({ selectedDate: date }),
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
