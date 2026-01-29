import { useMemo, useState, useEffect, memo } from 'react';
import { useStore } from '../store/useStore';
import { t, localeForLanguage } from '../utils/i18n';
import { ChevronLeft, ChevronRight, Flame, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MealCard from './MealCard';
import ConfirmModal from './ConfirmModal';
import { useMealsQuery } from '../hooks/useMealsQuery';
import { useDeleteMealMutation } from '../hooks/useDeleteMealMutation';

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addDays(d: Date, days: number) { const nd = new Date(d); nd.setDate(d.getDate() + days); return nd; }
function isSameDate(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

const DayCell = memo(({ date, cursor, selectedDate, today, onClick }: any) => {
  const inMonth = date.getMonth() === cursor.getMonth();
  const isToday = isSameDate(date, today);
  const isSelected = isSameDate(date, selectedDate);
  const isFuture = date > today;

  return (
    <button
      onClick={() => !isFuture && onClick(date)}
      disabled={isFuture}
      className={`
        aspect-square rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300
        ${isFuture
          ? 'opacity-20 cursor-not-allowed bg-gray-50 dark:bg-white/5'
          : isSelected
            ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/40 scale-105 z-10'
            : isToday
              ? 'bg-white dark:bg-white/10 text-brand-500 border-2 border-brand-500'
              : inMonth
                ? 'bg-white dark:bg-white/5 text-tg-text hover:bg-gray-50 dark:hover:bg-white/10'
                : 'text-tg-hint/20'
        }
      `}
    >
      <span className={`text-[13px] font-medium ${isSelected || isToday ? 'font-bold' : ''}`}>
        {date.getDate()}
      </span>
      {isToday && !isSelected && (
        <div className="w-1 h-1 rounded-full bg-brand-500 mt-0.5" />
      )}
    </button>
  );
}, (prev, next) => {
  const prevSel = isSameDate(prev.date, prev.selectedDate);
  const nextSel = isSameDate(next.date, next.selectedDate);
  const prevCursor = prev.cursor.getMonth();
  const nextCursor = next.cursor.getMonth();

  if (prevCursor !== nextCursor) return false;
  return prevSel === nextSel;
});

export default function Calendar() {
  const today = new Date();
  const [cursor, setCursor] = useState<Date>(new Date());

  const user = useStore(state => state.user);
  const language = useStore(state => state.language);
  const meals = useStore(state => state.meals);
  const totals = useStore(state => state.totals);
  const selectedDate = useStore(state => state.selectedDate);
  const setMeals = useStore(state => state.setMeals);
  const setSelectedDate = useStore(state => state.setSelectedDate);
  const [mealToDelete, setMealToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const mealsQuery = useMealsQuery(user?.id, selectedDate);
  const deleteMutation = useDeleteMealMutation(user?.id);

  useEffect(() => {
    if (mealsQuery.data) {
      setMeals(mealsQuery.data.meals, mealsQuery.data.totals);
    }
  }, [mealsQuery.data, setMeals]);

  // Reset scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const grid = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const startWeek = start.getDay() === 0 ? 6 : start.getDay() - 1; // Mon=0
    const days: Date[] = [];
    const first = addDays(start, -startWeek);
    for (let i = 0; i < 42; i++) days.push(addDays(first, i));
    return days;
  }, [cursor]);

  const openDay = (d: Date) => {
    if (!user) return;
    if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback?.selectionChanged();
    setSelectedDate(d);
    mealsQuery.prefetchAdjacentDates();
  };

  const handleDelete = async () => {
    if (!mealToDelete) return;
    setIsDeleting(true);
    deleteMutation.mutate(mealToDelete, {
      onSuccess: () => setMealToDelete(null),
      onError: () => alert(t('common.deleteError', language)),
      onSettled: () => setIsDeleting(false)
    });
  };

  const monthLabel = cursor.toLocaleDateString(localeForLanguage(language), { month: 'long', year: 'numeric' });
  const selectedDateLabel = selectedDate.toLocaleDateString(localeForLanguage(language), { day: 'numeric', month: 'long' });
  const isSelectedToday = isSameDate(selectedDate, today);
  const isLoadingHistory = mealsQuery.isLoading || mealsQuery.isFetching;

  return (
    <div className="min-h-screen pb-32 px-5 pt-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold text-tg-hint uppercase tracking-widest mb-1">{t('calendar.historyTitle', language)}</p>
          <h1 className="text-2xl font-bold text-tg-text capitalize">{monthLabel}</h1>
        </div>
        <div className="flex bg-white/50 dark:bg-white/5 rounded-full p-1 shadow-soft">
          <button
            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="w-5 h-5 text-tg-text" />
          </button>
          <button
            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="w-5 h-5 text-tg-text" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {[
          t('calendar.weekday.mon', language),
          t('calendar.weekday.tue', language),
          t('calendar.weekday.wed', language),
          t('calendar.weekday.thu', language),
          t('calendar.weekday.fri', language),
          t('calendar.weekday.sat', language),
          t('calendar.weekday.sun', language)
        ].map(d => (
          <div key={d} className="text-[10px] font-bold text-tg-hint/50 uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-8 px-1">
        {grid.map((d, i) => (
          <DayCell
            key={d.toISOString()}
            date={d}
            cursor={cursor}
            selectedDate={selectedDate}
            today={today}
            onClick={openDay}
          />
        ))}
      </div>

      {/* SELECTED DATE SUMMARY */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-tg-text capitalize">{isSelectedToday ? t('common.today', language) : selectedDateLabel}</h2>
          {isLoadingHistory && <div className="animate-spin w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full" />}
        </div>

        {/* Unified Dashboard Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Flame className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="text-2xl font-black text-tg-text leading-none">{Math.round(totals.calories)}</div>
                <div className="text-xs font-medium text-tg-hint mt-1">{t('common.kcalOf', language)} {user ? user.dailyCalorieGoal : 2000}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-medium text-tg-hint">
                <span>{t('common.protein', language)}</span>
                <span className="text-blue-500">{Math.round(totals.protein)}{t('common.unit.gram', language)}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totals.protein / 150) * 100, 100)}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-medium text-tg-hint">
                <span>{t('common.fat', language)}</span>
                <span className="text-yellow-500">{Math.round(totals.fat)}{t('common.unit.gram', language)}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totals.fat / 80) * 100, 100)}%` }}
                  className="h-full bg-yellow-500 rounded-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-medium text-tg-hint">
                <span>{t('common.carbs', language)}</span>
                <span className="text-emerald-500">{Math.round(totals.carbs)}{t('common.unit.gram', language)}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totals.carbs / 250) * 100, 100)}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Meals List for Selected Date */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {meals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center gap-4 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Utensils className="w-8 h-8 text-tg-hint/30" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-tg-text">{t('calendar.emptyTitle', language)}</h3>
                  <p className="text-xs text-tg-hint max-w-[160px] mx-auto mt-1">{t('calendar.emptyText', language)}</p>
                </div>
              </motion.div>
            ) : (
              meals.map((meal, i) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MealCard meal={meal} onDelete={setMealToDelete} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!mealToDelete}
        onClose={() => setMealToDelete(null)}
        onConfirm={handleDelete}
        title={t('common.deleteTitle', language)}
        message={t('common.deleteMessage', language).replace('{name}', mealToDelete?.name || '')}
        confirmLabel={t('common.delete', language)}
        cancelLabel={t('common.cancel', language)}
      />
    </div>
  );
}
