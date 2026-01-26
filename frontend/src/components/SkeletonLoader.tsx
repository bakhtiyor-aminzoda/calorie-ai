export const MealCardSkeleton = () => {
  return (
    <article className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-[#1C1C1E] shadow-sm border border-gray-100 dark:border-white/5">
      <div className="flex p-3 gap-3">
        {/* Image skeleton */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10 animate-pulse" />

        {/* Content skeleton */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          {/* Title skeleton */}
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="h-5 bg-gray-200 dark:bg-white/10 rounded-lg w-32 animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
          </div>

          {/* Calories + time skeleton */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-lg w-20 animate-pulse" />
            <div className="h-3 w-3 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-lg w-16 animate-pulse" />
          </div>

          {/* Macros skeleton */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 dark:bg-white/5 rounded-lg px-2 py-1.5 flex flex-col items-center justify-center gap-1">
                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-10 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-6 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

export const MealListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MealCardSkeleton key={i} />
      ))}
    </div>
  );
};
