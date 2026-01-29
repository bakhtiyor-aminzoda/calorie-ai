import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Zap, Shield, Crown, Image as ImageIcon, Upload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { requestSubscription, checkSubscriptionStatus } from '../api';
import { t, type Language } from '../utils/i18n';
import confetti from 'canvas-confetti';

interface SubscriptionModalProps {
    onClose: () => void;
}

export default function SubscriptionModal({ onClose }: SubscriptionModalProps) {
    const { user, setUser, language } = useStore();
    const [loading, setLoading] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [status, setStatus] = useState<string>('NONE'); // NONE, PENDING, REJECTED, APPROVED
    const [requestStep, setRequestStep] = useState<'info' | 'payment' | 'success'>('info');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Reset scroll position when modal mounts
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        if (user) {
            checkSubscriptionStatus(user.id).then(data => {
                if (data.isPremium) setStatus('APPROVED');
                else setStatus(data.lastRequestStatus);
            }).catch(() => { });
        }
        return () => setMounted(false);
    }, [user]);

    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.7);
                };
            };
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show instant preview
        const reader = new FileReader();
        reader.onload = (event) => setReceiptPreview(event.target?.result as string);
        reader.readAsDataURL(file);

        // Compress
        const compressed = await compressImage(file);
        setReceiptFile(compressed);
    };

    const handleRequest = async () => {
        if (!user || !receiptFile) return;
        setLoading(true);
        try {
            const result = await requestSubscription(user.id, receiptFile, phoneNumber);

            if (result.success) {
                setRequestStep('success');
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#ffffff']
                });
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Ошибка при отправке запроса');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="relative w-full sm:max-w-md bg-[#1C1C1E] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-t border-white/10 max-h-[90vh] flex flex-col"
            >
                {/* Abstract Background Elements */}
                <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#FFD700]/10 to-transparent pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FFD700]/20 blur-[40px] rounded-full pointer-events-none" />

                {/* Close Button */}
                <div className="absolute top-6 right-6 z-50">
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 rounded-full text-white/70 hover:text-white transition-colors border border-white/5 active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div ref={scrollRef} className="p-8 pt-10 relative z-10 overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700] to-[#E5C100] rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)] mb-6 rotate-3">
                            <Crown className="w-10 h-10 text-[#5C4D00] fill-current" />
                        </div>
                        <h2 className="text-3xl font-black text-white text-center mb-1">
                            Calorie AI <span className="text-[#FFD700]">PRO</span>
                        </h2>
                    </div>

                    <AnimatePresence mode="wait">
                        {requestStep === 'info' && (
                            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="space-y-4 mb-8">
                                    {status === 'PENDING' && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6 flex items-center gap-3">
                                            <div className="p-2 bg-yellow-500/20 rounded-full">
                                                <Upload className="w-5 h-5 text-yellow-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-yellow-500 text-sm font-bold">Запрос на проверке</h4>
                                                <p className="text-white/60 text-xs">Мы проверяем ваш чек. Обычно это занимает 15 минут.</p>
                                            </div>
                                        </div>
                                    )}

                                    {status === 'REJECTED' && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-center gap-3">
                                            <div className="p-2 bg-red-500/20 rounded-full">
                                                <X className="w-5 h-5 text-red-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-red-500 text-sm font-bold">Оплата отклонена</h4>
                                                <p className="text-white/60 text-xs">Проверьте Telegram. Попробуйте отправить чек еще раз.</p>
                                            </div>
                                        </div>
                                    )}

                                    <FeatureRow icon={Zap} text="Безлимитный AI Сканер еды" delay={0.1} />
                                    <FeatureRow icon={Star} text="Детальный разбор нутриентов (БЖУ)" delay={0.2} />
                                    <FeatureRow icon={Shield} text="Персональные цели и графики" delay={0.3} />
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Тариф PRO</span>
                                        <span className="text-white font-black">
                                            {t('subscription.price', language || 'ru')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setRequestStep('payment')}
                                        className="w-full py-4 bg-[#FFD700] text-[#5C4D00] font-black text-lg rounded-2xl shadow-glow active:scale-[0.98] transition-all"
                                    >
                                        Подключить сейчас
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {requestStep === 'payment' && (
                            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="bg-white/5 border border-[#FFD700]/20 rounded-[2rem] p-6 mb-6">
                                    <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-4">Инструкция по оплате</h3>
                                    <div className="space-y-4 text-white/80 text-sm leading-relaxed mb-6">
                                        {language === 'uz' ? (
                                            <>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                                    <p>Quyidagi Visa kartalaridan biriga <b>38888 soʻm</b> oʻtkazing:</p>
                                                </div>
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa (Alif Bank)</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">4405 0000 1234 5678</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa (Milliy Bank)</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">4276 1500 2000 7890</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa (Tojik Bank)</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">4111 2222 3333 4444</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                                    <p><b>Chekni skrinshot</b> qilib quyidaga joylang:</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                                    <p>Переведите <b>30 TJS</b> на одну из карт Visa:</p>
                                                </div>
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa (Alif Bank)</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">4405 0000 1234 5678</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa (Milliy Bank)</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">4276 1500 2000 7890</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa (Tojik Bank)</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">4111 2222 3333 4444</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                                    <p>Сделайте <b>скриншот чека</b> и прикрепите его ниже:</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-1">Ваш номер (для связи)</label>
                                            <input
                                                type="tel"
                                                placeholder="+992 00 000 0000"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder:text-white/20"
                                            />
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />

                                        {!receiptPreview ? (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full aspect-video bg-black/50 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group active:border-brand-500/50 transition-colors"
                                            >
                                                <div className="p-3 bg-white/5 rounded-full group-active:scale-95 transition-transform">
                                                    <Upload className="w-6 h-6 text-white/40" />
                                                </div>
                                                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Прикрепить чек</span>
                                            </button>
                                        ) : (
                                            <div className="relative w-full aspect-video bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                                                <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-xs font-bold border border-white/10 active:scale-95 transition-all"
                                                    >
                                                        Изменить фото
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleRequest}
                                            disabled={loading || !receiptFile || !phoneNumber}
                                            className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl shadow-glow active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                                        >
                                            {loading ? 'Отправка...' : 'Отправить на проверку'}
                                        </button>
                                        <button onClick={() => setRequestStep('info')} className="w-full py-2 text-white/40 text-xs font-bold uppercase tracking-widest">
                                            Назад
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {requestStep === 'success' && (
                            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-10 text-center">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                                    <Check className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Запрос отправлен!</h3>
                                <p className="text-white/60 text-sm leading-relaxed mb-8 px-6">
                                    Мы проверим вашу оплату в ближайшее время. Обычно это занимает от 5 до 30 минут. Premium активируется автоматически!
                                </p>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-white/10 text-white font-black rounded-2xl border border-white/10 active:scale-[0.98] transition-all"
                                >
                                    Понятно
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="text-center text-white/20 text-[10px] mt-6 px-10">
                        Оплата производится напрямую без участия третьих лиц. Нажимая кнопку, вы соглашаетесь с условиями подписки.
                    </p>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

function FeatureRow({ icon: Icon, text, delay }: { icon: any, text: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5"
        >
            <div className="p-2 bg-[#FFD700]/10 rounded-lg">
                <Icon className="w-5 h-5 text-[#FFD700]" />
            </div>
            <span className="text-white/90 font-medium text-sm">{text}</span>
            <Check className="w-5 h-5 text-[#FFD700] ml-auto opacity-50" />
        </motion.div>
    );
}
