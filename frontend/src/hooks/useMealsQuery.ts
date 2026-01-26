import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMealsByDate, getTodayMeals, type Meal, type Totals } from '../api';

const emptyTotals: Totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };

export function useMealsQuery(userId?: string, date?: Date) {
  const queryClient = useQueryClient();
  const dateKey = date ? date.toISOString().split('T')[0] : undefined;
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

  const invalidateMeals = () => queryClient.invalidateQueries({ queryKey: ['meals', userId] });

  return { ...query, dateKey, isToday, invalidateMeals };
}
