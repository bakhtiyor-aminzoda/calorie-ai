import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMealsByDate, getTodayMeals, type Meal, type Totals } from '../api';

const emptyTotals: Totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useMealsQuery(userId?: string, date?: Date) {
  const queryClient = useQueryClient();
  const dateKey = date ? formatDateKey(date) : undefined;
  const isToday = date ? new Date().toDateString() === date.toDateString() : false;

  const query = useQuery<{ meals: Meal[]; totals: Totals }>({
    queryKey: ['meals', userId, isToday ? 'today' : dateKey],
    queryFn: async () => {
      if (!userId || !date) return { meals: [], totals: emptyTotals };
      return isToday ? getTodayMeals(userId) : getMealsByDate(userId, dateKey!);
    },
    enabled: Boolean(userId && date),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false
  });

  // Prefetch adjacent dates (before & after current) to avoid loading spinners
  const prefetchAdjacentDates = () => {
    if (!userId || !date) return;
    
    const prev = addDays(date, -1);
    const next = addDays(date, 1);
    
    [prev, next].forEach((d) => {
      const key = formatDateKey(d);
      const isTodayCheck = new Date().toDateString() === d.toDateString();
      queryClient.prefetchQuery({
        queryKey: ['meals', userId, isTodayCheck ? 'today' : key],
        queryFn: () => isTodayCheck ? getTodayMeals(userId) : getMealsByDate(userId, key),
        staleTime: 1000 * 60 * 3,
      });
    });
  };

  const invalidateMeals = () => queryClient.invalidateQueries({ queryKey: ['meals', userId] });

  return { ...query, dateKey, isToday, invalidateMeals, prefetchAdjacentDates };
}
