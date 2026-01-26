import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import ProgressCircle from './ProgressCircle';
import MealCard from './MealCard';
import { MealListSkeleton } from './SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Utensils, RefreshCw } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useMealsQuery } from '../hooks/useMealsQuery';
import { useDeleteMealMutation } from '../hooks/useDeleteMealMutation';

export default function MainScreen({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const user = useStore(state => state.user);
  const meals = useStore(state => state.meals);
  const totals = useStore(state => state.totals);
  const selectedDate = useStore(state => state.selectedDate);
  const setMeals = useStore(state => state.setMeals);
  const [mealToDelete, setMealToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateTime = useRef(0);

  const mealsQuery = useMealsQuery(user?.id, selectedDate);
  const deleteMutation = useDeleteMealMutation(user?.id);

  useEffect(() => {
    if (mealsQuery.data) {
      setMeals(mealsQuery.data.meals, mealsQuery.data.totals);
    }
  }, [mealsQuery.data, setMeals]);

  if (!user) return null;

  const progress = useMemo(() => 
    Math.min((totals.calories / user.dailyCalorieGoal) * 100, 100),
    [totals.calories, user.dailyCalorieGoal]
  );
  
  const diff = useMemo(() => 
    Math.abs(user.dailyCalorieGoal - totals.calories),
    [user.dailyCalorieGoal, totals.calories]
  );
  
  const isOverLimit = useMemo(() => 
    totals.calories > user.dailyCalorieGoal,
    [totals.calories, user.dailyCalorieGoal]
  );

  const isToday = new Date().toDateString() === new Date(selectedDate).toDateString();
  const dateTitle = isToday ? 'Сегодня' : new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const handleDelete = async () => {
    if (!mealToDelete) return;
    setIsDeleting(true);
    deleteMutation.mutate(mealToDelete, {
      onSuccess: () => setMealToDelete(null),
      onError: () => alert('Ошибка при удалении'),
      onSettled: () => setIsDeleting(false)
    });
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await mealsQuery.refetch();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    }
  }, [mealsQuery, isRefreshing]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && !isRefreshing) {
      const now = Date.now();
      // Throttle to 16ms (~60fps)
      if (now - lastUpdateTime.current < 16) return;
      lastUpdateTime.current = now;
      
      const touchY = e.touches[0].clientY;
      const pull = Math.max(0, touchY - touchStartY.current);
      if (pull > 0 && pull < 120) {
        setPullDistance(pull);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen pb-32 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none' }}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{ 
          transform: `translateY(${Math.min(pullDistance - 40, 40)}px)`,
          opacity: Math.min(pullDistance / 80, 1),
          transition: 'transform 0.1s ease, opacity 0.1s ease'
        }}
      >
        <div className="bg-white dark:bg-[#1C1C1E] rounded-full p-2 shadow-lg">
          <RefreshCw 
            className={`w-5 h-5 text-brand-500 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      </div>

      {/* Background Ambience */}

      {/* Header Section */}
      <header className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4 px-2">
          <div
            onClick={() => onNavigate('profile')}
            className="group cursor-pointer flex items-center gap-3 transition-opacity active:opacity-60"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-sm font-bold shadow-glow group-hover:scale-105 transition-transform">
              {(user.firstName || user.username || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-tg-hint uppercase tracking-wide leading-none mb-0.5">{dateTitle}</p>
              <h1 className="text-xl font-bold text-tg-text leading-none">Обзор калорий</h1>
            </div>
          </div>
          <div className="bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 p-2 rounded-full">
            <Flame className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* Glass Card Summary */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 shadow-glow-lg text-white">
          {/* Animated Gradient Background - Turns RED if over limit */}
          <div
            className={`absolute -inset-10 transition-colors duration-1000 ${isOverLimit ? 'bg-gradient-to-br from-red-600 via-red-500 to-orange-900' : 'bg-gradient-to-br from-[#557EFF] via-[#3B64F0] to-[#111E4D] animate-gradient-xy'}`}
          />

          {/* Card Content */}
          <div className="relative z-10 flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-white/80 text-sm font-medium mb-1">
                {isOverLimit ? 'Перебор' : 'Осталось'}
              </p>
              <div className="text-4xl font-black tracking-tight">{diff}</div>
              <p className="text-xs text-white/60 mt-1 font-medium">ккал из {user.dailyCalorieGoal}</p>
            </div>

            {/* Custom Progress Circle (White theme) & Rotating DOT */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              {/* SVG Track & Progress */}
              <svg className="w-full h-full -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-white/20" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6"
                  className={`transition-colors duration-500 ${isOverLimit ? 'text-white' : (diff < 300 ? 'text-orange-500' : 'text-white')}`}
                  fill="none"
                  strokeDasharray="301.59"
                  strokeDashoffset={301.59 - (301.59 * (isOverLimit ? 100 : progress)) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {/* Rotating Dot Container */}
              <div
                className="absolute inset-0"
                style={{ transform: `rotate(${isOverLimit ? 360 : progress * 3.6}deg)` }}
              >
                {/* The Dot itself (positioned at top center of rotating container) */}
                <div className="absolute top-[8px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] z-10 transition-colors duration-500 flex items-center justify-center">
                  {isOverLimit ? (
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  ) : diff < 300 && (
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Macros Grid */}
          <div className="relative z-10 grid grid-cols-3 gap-2 mt-6">
            {[
              { label: 'Белки', val: totals.protein, color: 'bg-white/10 dark:bg-white/5' },
              { label: 'Жиры', val: totals.fat, color: 'bg-white/10 dark:bg-white/5' },
              { label: 'Угли', val: totals.carbs, color: 'bg-white/10 dark:bg-white/5' },
            ].map((m, i) => (
              <div key={i} className={`rounded-xl ${m.color} p-2 text-center`}>
                <div className="text-lg font-bold">{m.val}г</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Meals List */}
      <section className="px-5">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-lg font-bold text-tg-text">Приемы пищи</h2>
          <span className="text-xs font-medium text-tg-hint bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">{meals.length}</span>
        </div>

        <div className="space-y-4">
          {mealsQuery.isLoading && meals.length === 0 ? (
            <MealListSkeleton count={3} />
          ) : (
            <div className="space-y-4">
              {meals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-brand-500 blur-2xl opacity-10 animate-pulse" />
                    <div className="relative p-5 bg-white dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
                      <Utensils className="w-10 h-10 text-brand-500 opacity-40" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-tg-text mb-1">Ни одной записи</h3>
                  <p className="text-sm text-tg-hint max-w-[200px] mx-auto">
                    Сфотографируй завтрак или обед, чтобы начать расчет
                  </p>
                </motion.div>
              ) : (
                meals.map((meal, i) => (
                  <div
                    key={meal.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                  >
                    <MealCard meal={meal} onDelete={setMealToDelete} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={!!mealToDelete}
        onClose={() => setMealToDelete(null)}
        onConfirm={handleDelete}
        title="Удалить запись?"
        message={`Вы уверены, что хотите удалить "${mealToDelete?.name}"? Это действие нельзя отменить.`}
      />
    </div>
  );
}
