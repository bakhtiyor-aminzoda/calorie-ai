import { motion } from 'framer-motion';
import { X, Check, Battery, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEffect, useRef } from 'react';

interface FreePlanModalProps {
    onClose: () => void;
    onUpgrade: () => void;
}

export default function FreePlanModal({ onClose, onUpgrade }: FreePlanModalProps) {
    const { user } = useStore();

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />

            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="relative w-full sm:max-w-md bg-white dark:bg-[#1C1C1E] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl pb-8"
            >
                <div className="p-6 pt-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Battery className="w-8 h-8 text-brand-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                            Ваш тариф: <span className="text-brand-500">Free</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mt-1">
                            Базовые возможности
                        </p>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-500/10 rounded-lg">
                                    <Zap className="w-5 h-5 text-brand-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">AI Сканирование</p>
                                    <p className="text-xs text-gray-500">Лимит запросов</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-brand-500">{user?.dailyRequestCount || 0}/3</span>
                                <span className="text-xs text-gray-400 block">в день</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">Базовый подсчет КБЖУ</span>
                        </div>
                        <div className="flex items-center gap-3 p-3">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">Дневник питания</span>
                        </div>
                        <div className="flex items-center gap-3 p-3">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">Статистика за сегодня</span>
                        </div>
                    </div>

                    <button
                        onClick={() => { onClose(); onUpgrade(); }}
                        className="w-full py-4 bg-gradient-to-r from-[#FFD700] to-[#E5C100] text-[#5C4D00] font-bold text-lg rounded-2xl shadow-lg relative overflow-hidden group active:scale-[0.98] transition-all"
                    >
                        <span className="relative flex items-center justify-center gap-2">
                            Снять лимиты (Premium)
                        </span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
