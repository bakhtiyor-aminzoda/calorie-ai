import { useRef, useEffect, useState, memo } from 'react';
import { useHapticFeedback } from '@telegram-apps/sdk-react';
import { cn } from '../utils/cn';

interface Props {
    items: string[] | number[];
    value: string | number;
    onChange: (value: any) => void;
    label?: string;
}

const WheelPicker = memo(function WheelPicker({ items, value, onChange, label, height = 200 }: Props & { height?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const haptic = useHapticFeedback();
    const [activeIndex, setActiveIndex] = useState(0);
    const itemHeight = 50;
    const isScrolling = useRef(false);

    // Calculate padding
    const padding = (height - itemHeight) / 2;

    // Initial scroll
    useEffect(() => {
        if (containerRef.current) {
            const idx = items.indexOf(value as never);
            if (idx !== -1) {
                // Initial snap without animation for instant load
                containerRef.current.scrollTop = idx * itemHeight;
                setActiveIndex(idx);
            }
        }
    }, [height]); // Only on mount/height change

    const handleScroll = () => {
        if (!containerRef.current) return;

        const scrollTop = containerRef.current.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

        if (clampedIndex !== activeIndex) {
            setActiveIndex(clampedIndex);
        }
    };

    // Debounced selection
    useEffect(() => {
        const timer = setTimeout(() => {
            if (items[activeIndex] !== value) {
                onChange(items[activeIndex]);
                haptic.selectionChanged();
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [activeIndex, items, onChange, value]);

    return (
        <div
            className="relative w-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ height }}
        >
            {/* Label */}
            {label && (
                <div className="absolute top-2 z-30 pointer-events-none">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-tg-hint/50 bg-tg-bg px-2 py-1 rounded-lg border border-gray-100 dark:border-white/5">
                        {label}
                    </span>
                </div>
            )}

            {/* Selection Area Highlight - background removed */}
            <div className="absolute top-1/2 -translate-y-1/2 h-[50px] w-full pointer-events-none z-0">
                <div className="mx-auto w-[80%] h-full border-y border-black/5 dark:border-white/5" />
            </div>

            {/* Scrollable Container with CSS Mask for fading edges */}
            <div
                ref={containerRef}
                className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-10"
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
                }}
                onScroll={() => { isScrolling.current = true; handleScroll(); }}
                onTouchEnd={() => { isScrolling.current = false; }}
            >
                <div
                    className="flex flex-col items-center w-full"
                    style={{ paddingTop: padding, paddingBottom: padding }}
                >
                    {items.map((item, i) => {
                        const isActive = i === activeIndex;
                        const distance = Math.abs(i - activeIndex);

                        // Style calculation based on distance
                        // 0 = Active
                        // 1 = Neighbor
                        // >1 = Distant (hidden/very faded)

                        return (
                            <div
                                key={i}
                                className="h-[50px] w-full flex items-center justify-center snap-center shrink-0 cursor-pointer"
                                onClick={() => {
                                    if (containerRef.current) {
                                        containerRef.current.scrollTo({ top: i * itemHeight, behavior: 'auto' });
                                    }
                                }}
                            >
                                <span
                                    style={{ willChange: 'transform, opacity' }}
                                    className={cn(
                                        "font-monospaced tabular-nums leading-none select-none transition-all duration-200",
                                        isActive
                                            ? "text-3xl font-black text-tg-text scale-110"
                                            : distance === 1
                                                ? "text-xl font-bold text-tg-hint/40 scale-90"
                                                : "text-base text-tg-hint/10 scale-75"
                                    )}
                                >
                                    {item}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default WheelPicker;
