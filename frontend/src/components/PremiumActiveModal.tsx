import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Zap, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';

interface PremiumActiveModalProps {
    onClose: () => void;
}

export default function PremiumActiveModal({ onClose }: PremiumActiveModalProps) {
    const user = useStore(state => state.user);
    if (!user) return null;

    const features = [
        { icon: Zap, label: 'Безлимитный AI анализ еды' },
        { icon: TrendingUp, label: 'Подробная статистика и макросы' },
        { icon: Shield, label: 'История питания без ограничений' },
        { icon: Sparkles, label: 'Персональные рекомендации' }
    ];

    const expiresDate = user.subscriptionExpiresAt
        ? new Date(user.subscriptionExpiresAt).toLocaleDateString()
        : 'Навсегда';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm bg-[#1C1C1E] border border-[#FFD700]/30 rounded-3xl overflow-hidden relative shadow-2xl shadow-[#FFD700]/10"
            >
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#FFD700]/20 to-transparent" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#FFD700]/30 blur-[80px] rounded-full" />

                <div className="relative p-6">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-white/50" />
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center mt-4 mb-8">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-[#FFD700] blur-xl opacity-40 rounded-full" />
                            <div className="relative bg-gradient-to-br from-[#FFD700] to-[#FFA500] p-4 rounded-full shadow-lg shadow-[#FFD700]/30">
                                <Crown className="w-10 h-10 text-[#1C1C1E] fill-current" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Premium Активен</h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                            <span className="text-[#FFD700] text-xs font-bold uppercase tracking-wider">Действует до {expiresDate}</span>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="bg-white/5 rounded-2xl p-1 mb-8 border border-white/5">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0">
                                    <div className="p-2 bg-[#FFD700]/10 rounded-lg text-[#FFD700]">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-white/90 text-sm font-medium">{feature.label}</span>
                                    <Check className="w-4 h-4 text-[#FFD700] ml-auto" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="text-center space-y-3">
                        <p className="text-white/40 text-xs">
                            Ваша подписка дает доступ ко всем <br /> возможностям CalorieAI
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl active:scale-95 transition-transform"
                        >
                            Отлично
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
