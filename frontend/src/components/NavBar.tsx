import { motion } from 'framer-motion';
import { Home, Calendar as CalendarIcon, User, Plus } from 'lucide-react';
import { useHapticFeedback } from '@telegram-apps/sdk-react';
import { cn } from '../utils/cn';

type Tab = 'home' | 'calendar' | 'profile';

export default function NavBar({ active, onChange, onAddClick }: { active: Tab; onChange: (t: Tab) => void; onAddClick?: () => void }) {
  const haptic = useHapticFeedback();

  const handleTabClick = (tab: Tab) => {
    if (active !== tab) {
      haptic.selectionChanged();
      onChange(tab);
    }
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pointer-events-none pb-8 px-4 flex justify-center">
      {/* Background Gradient */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent pointer-events-none" />

      {/* Stack Container */}
      <div className="relative flex items-end justify-center pointer-events-auto w-full max-w-sm mx-auto group/nav">

        {/* Layer 1: The HORIZON Button (Behind) */}
        {/* Polished: rounded-b-[2.5rem] for safety, active scale for tactile feel */}
        <div
          onClick={() => { haptic.impactOccurred('medium'); onAddClick?.(); }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[76%] h-28 bg-gradient-to-t from-brand-900 to-brand-400 rounded-t-[100%] rounded-b-[2.5rem] shadow-[0_-10px_40px_rgba(59,100,240,0.6)] z-0 flex items-start justify-center pt-1.5 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 cursor-pointer"
        >
          {/* Larger Icon: w-10 h-10 for perfect visibility */}
          <Plus className="w-10 h-10 text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] relative z-10" strokeWidth={3} />
        </div>

        {/* Layer 2: Compact Glass Menu (Front) */}
        {/* Polished: Crisper border (white/20), subtler shadow */}
        <div className="relative z-10 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-full h-16 w-[86%] flex items-center justify-between px-9 mb-4">

          {/* Home */}
          <button
            onClick={() => handleTabClick('home')}
            className={cn("flex flex-col items-center justify-center gap-1 transition-all active:scale-95 duration-200", active === 'home' ? "text-brand-500 scale-110 drop-shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300")}
          >
            <Home className="w-[1.6rem] h-[1.6rem]" strokeWidth={active === 'home' ? 2.5 : 2} />
          </button>

          {/* Calendar */}
          <button
            onClick={() => handleTabClick('calendar')}
            className={cn("flex flex-col items-center justify-center gap-1 transition-all active:scale-95 duration-200", active === 'calendar' ? "text-brand-500 scale-110 drop-shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300")}
          >
            <CalendarIcon className="w-[1.6rem] h-[1.6rem]" strokeWidth={active === 'calendar' ? 2.5 : 2} />
          </button>

          {/* Profile */}
          <button
            onClick={() => handleTabClick('profile')}
            className={cn("flex flex-col items-center justify-center gap-1 transition-all active:scale-95 duration-200", active === 'profile' ? "text-brand-500 scale-110 drop-shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300")}
          >
            <User className="w-[1.6rem] h-[1.6rem]" strokeWidth={active === 'profile' ? 2.5 : 2} />
          </button>

        </div>
      </div>
    </nav>
  );
}
