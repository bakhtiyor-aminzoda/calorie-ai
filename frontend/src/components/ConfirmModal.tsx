import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { t, type Language } from '../utils/i18n';
import { useStore } from '../store/useStore';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    isDanger = true
}: ConfirmModalProps) {
    const { language } = useStore();
    const resolvedConfirmLabel = confirmLabel ?? t('common.delete', language as Language);
    const resolvedCancelLabel = cancelLabel ?? t('common.cancel', language as Language);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'}`}>
                                <AlertCircle className="w-8 h-8" />
                            </div>

                            <h3 className="text-xl font-bold text-tg-text mb-2">{title}</h3>
                            <p className="text-sm text-tg-hint leading-relaxed mb-8 px-2">{message}</p>

                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg active:scale-[0.98] transition-all ${isDanger ? 'bg-red-500 shadow-red-500/20' : 'bg-brand-500 shadow-brand-500/20'}`}
                                >
                                    {resolvedConfirmLabel}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 rounded-2xl font-bold text-tg-hint hover:text-tg-text transition-colors bg-gray-50 dark:bg-white/5"
                                >
                                    {resolvedCancelLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
