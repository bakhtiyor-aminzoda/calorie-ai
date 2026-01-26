import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useHapticFeedback } from '@telegram-apps/sdk-react';
import { memo, useEffect } from 'react';
import logoAmini from '../images/logo-amini.jpeg';

interface WelcomePageProps {
    onStart: () => void;
}

const WelcomePage = ({ onStart }: WelcomePageProps) => {
    const haptic = useHapticFeedback();

    useEffect(() => {
        // Automatic transition after 4 seconds
        const timer = setTimeout(() => {
            onStart();
        }, 4000);

        return () => clearTimeout(timer);
    }, [onStart]);

    return (
        <div className="fixed inset-0 bg-[#F2F4F8] dark:bg-black overflow-hidden flex flex-col items-center justify-between p-8">
            {/* Optimized Background Animation */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div
                    animate={{
                        opacity: [0.2, 0.3, 0.2],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    style={{ willChange: 'opacity, transform' }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(85,126,255,0.08)_0%,transparent_70%)]"
                />
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col h-full items-center justify-center">
                {/* Main Branding Block */}
                <div className="flex flex-col items-center gap-10">
                    {/* App Logo & Title */}
                    <div className="flex flex-col items-center gap-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{ willChange: 'transform, opacity' }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-brand-500 blur-2xl opacity-10" />
                            <div className="relative w-28 h-28 bg-brand-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                                <Sparkles className="w-14 h-14 text-white" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            style={{ willChange: 'transform, opacity' }}
                            className="text-center space-y-2"
                        >
                            <h1 className="text-4xl font-black tracking-tight text-tg-text">
                                Calorie <span className="text-brand-500">AI</span>
                            </h1>
                            <p className="text-sm font-medium text-tg-hint max-w-[240px] leading-relaxed mx-auto">
                                Твой персональный ассистент для контроля питания через камеру
                            </p>
                        </motion.div>
                    </div>

                    {/* Developer Branding - Now more prominent and centered */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center gap-4 bg-white/50 dark:bg-white/5 p-6 rounded-[2rem] border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm"
                    >
                        <span className="text-[9px] font-bold text-tg-hint uppercase tracking-[0.2em] opacity-60">
                            Разработка проекта
                        </span>
                        <div className="flex items-center gap-3">
                            <img
                                src={logoAmini}
                                alt="Amini Logo"
                                className="w-9 h-9 rounded-xl object-cover shadow-lg border border-white/20"
                            />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-sm font-black text-tg-text uppercase tracking-tight">
                                    amini automation
                                </span>
                                <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-1">
                                    Telegram Bot Experts
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Loading Indicator */}
            <div className="relative z-10 pb-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full"
                    />
                    <span className="text-[10px] font-bold text-tg-hint uppercase tracking-widest opacity-40">
                        Загрузка системы
                    </span>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
