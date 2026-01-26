import { useState, memo } from 'react';
import { Utensils } from 'lucide-react';

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

const MealCard = memo(({ meal, onDelete }: { meal: Meal; onDelete: (meal: Meal) => void }) => {
  const time = new Date(meal.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-[#1C1C1E] shadow-sm border border-gray-100 dark:border-white/5 transition-transform active:scale-[0.98]">
      <div className="flex p-3 gap-3">
        {/* Image / Icon */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 self-center">
          {meal.photoUrl ? (
            <img src={meal.photoUrl} alt={meal.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <Utensils className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          {/* Header: Title + Delete */}
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-tg-text text-[15px] leading-tight line-clamp-1 truncate">
              {meal.name}
            </h3>
            <button
              onClick={() => onDelete(meal)}
              className="text-gray-400 hover:text-red-500 transition-colors -mt-1 -mr-1 p-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Middle: Calories + Time */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-brand-500 leading-none">{Math.round(meal.calories)}</span>
              <span className="text-xs font-medium text-tg-hint">ккал</span>
            </div>
            <span className="text-[10px] text-tg-hint/40">•</span>
            <span className="text-xs text-tg-hint/60 font-medium">{time}</span>
          </div>

          {/* Bottom: Macros (Full Width) */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-lg px-2 py-1.5 flex flex-col items-center justify-center gap-0.5">
              <span className="text-[10px] uppercase font-bold text-blue-500/60 leading-none tracking-wider">Белки</span>
              <span className="text-xs font-black text-blue-500 leading-none">{Math.round(meal.protein)}</span>
            </div>
            <div className="bg-yellow-500/5 dark:bg-yellow-500/10 rounded-lg px-2 py-1.5 flex flex-col items-center justify-center gap-0.5">
              <span className="text-[10px] uppercase font-bold text-yellow-500/60 leading-none tracking-wider">Жиры</span>
              <span className="text-xs font-black text-yellow-500 leading-none">{Math.round(meal.fat)}</span>
            </div>
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-lg px-2 py-1.5 flex flex-col items-center justify-center gap-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-500/60 leading-none tracking-wider">Угли</span>
              <span className="text-xs font-black text-emerald-500 leading-none">{Math.round(meal.carbs)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

export default MealCard;
