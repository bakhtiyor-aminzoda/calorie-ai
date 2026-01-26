import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMeal, type Meal, type Totals } from '../api';

export function useDeleteMealMutation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meal: Meal) => {
      await deleteMeal(meal.id);
      return meal;
    },
    onMutate: async (meal) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ['meals', userId] });

      const impacted = queryClient.getQueriesData<{ meals: Meal[]; totals: Totals }>({ queryKey: ['meals', userId] });
      const previous = impacted.map(([key, data]) => ({ key, data }));

      impacted.forEach(([key, data]) => {
        if (!data) return;
        const exists = data.meals.find((m) => m.id === meal.id);
        if (!exists) return;

        const meals = data.meals.filter((m) => m.id !== meal.id);
        const totals = {
          calories: Math.max(0, data.totals.calories - meal.calories),
          protein: Math.max(0, data.totals.protein - meal.protein),
          fat: Math.max(0, data.totals.fat - meal.fat),
          carbs: Math.max(0, data.totals.carbs - meal.carbs)
        };
        queryClient.setQueryData(key, { meals, totals });
      });

      return { previous };
    },
    onError: (_err, _meal, context) => {
      context?.previous?.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: ['meals', userId] });
    }
  });
}
