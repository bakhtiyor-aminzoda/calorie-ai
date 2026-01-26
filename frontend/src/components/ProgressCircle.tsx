interface Props {
  current: number;
  goal: number;
  progress: number;
}

export default function ProgressCircle({ current, goal, progress }: Props) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(progress, 120);
  const strokeDashoffset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const overLimit = pct > 100;

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <div className="relative">
        <svg width="220" height="220" className="-rotate-90">
          <defs>
            <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={overLimit ? '#fb7185' : '#7D9EFF'} />
              <stop offset="100%" stopColor={overLimit ? '#ef4444' : '#557EFF'} />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(148,163,184,.25)" strokeWidth="14" />
          <circle cx="110" cy="110" r={radius} fill="none" stroke="url(#ring)" strokeWidth="14"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out drop-shadow" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="text-[40px] leading-none font-extrabold text-tg-text tracking-tight">{current}</div>
          <div className="text-xs text-tg-hint">ккал из {goal}</div>
          <div className={`text-xs mt-1 ${overLimit ? 'text-red-400' : 'text-brand-500'}`}>{Math.round(progress)}%</div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-tg-hint">
          {goal - current > 0 ? (
            <span>Осталось <span className="text-tg-text font-semibold">{goal - current}</span> ккал</span>
          ) : (
            <span>Превышение на <span className="text-red-500 font-semibold">{current - goal}</span> ккал</span>
          )}
        </div>
      </div>
    </div>
  );
}
