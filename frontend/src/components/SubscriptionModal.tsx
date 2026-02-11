import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Zap, Shield, Crown, Image as ImageIcon, Upload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { requestSubscription, checkSubscriptionStatus, verifyDCPayment } from '../api';
import { t, type Language } from '../utils/i18n';
import confetti from 'canvas-confetti';
import dcLogo from '../images/dc-logo.webp';

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
    const [requestStep, setRequestStep] = useState<'method' | 'info' | 'payment' | 'dc' | 'success'>('method');
    const [verifyingDC, setVerifyingDC] = useState(false);
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
            alert(error.response?.data?.error || t('subscription.requestError', language || 'ru'));
        } finally {
            setLoading(false);
        }
    };

    const handleDCVerify = async () => {
        if (!user) return;
        setVerifyingDC(true);
        try {
            const result = await verifyDCPayment(user.id);
            if (result.success) {
                setRequestStep('success');
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#007AFF', '#ffffff'] // Gold, Blue (DC), White
                });
            } else {
                alert(result.message || 'Оплата не найдена');
            }
        } catch (error) {
            alert('Ошибка при проверке оплаты');
        } finally {
            setVerifyingDC(false);
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
                        {requestStep === 'method' && (
                            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="space-y-4 mb-8">
                                    <div className="text-center mb-6">
                                        <p className="text-white/60 text-sm">Выберите удобный способ оплаты</p>
                                    </div>

                                    {/* DC Wallet Button */}
                                    <button
                                        onClick={() => setRequestStep('dc')}
                                        className="w-full p-4 bg-white rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all group border border-transparent hover:border-[#007AFF]/30 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#007AFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-12 h-12 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                                            <img src={dcLogo} alt="DC" className="w-8 h-8 object-contain" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <h4 className="text-[#1C1C1E] font-bold text-lg">DC Wallet</h4>
                                            <p className="text-[#1C1C1E]/60 text-xs font-medium">Мгновенная активация</p>
                                        </div>
                                        <div className="bg-[#007AFF] text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                            AUTO
                                        </div>
                                    </button>

                                    {/* Card Transfer Button */}
                                    <button
                                        onClick={() => setRequestStep('info')}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all group hover:bg-white/10"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                            <div className="w-8 h-5 rounded border-2 border-white/40 relative">
                                                <div className="absolute top-1 inset-x-0 h-[2px] bg-white/40" />
                                            </div>
                                        </div>
                                        <div className="text-left flex-1">
                                            <h4 className="text-white font-bold text-lg">Перевод на карту</h4>
                                            <p className="text-white/40 text-xs font-medium">Проверка 5-30 минут</p>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {requestStep === 'dc' && (
                            <motion.div key="dc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="bg-white rounded-[2rem] p-6 mb-6 text-[#1C1C1E]">
                                    <div className="flex items-center gap-3 mb-6">
                                        <img src={dcLogo} alt="DC" className="w-8 h-8 object-contain" />
                                        <h3 className="font-bold text-xl tracking-tight">Оплата через DC</h3>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Amount */}
                                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Сумма</span>
                                            <span className="font-black text-2xl">30 TJS</span>
                                        </div>

                                        {/* Account */}
                                        <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-blue-100">
                                            <div className="text-xs text-blue-500 font-bold uppercase tracking-wider">Счет получателя</div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-mono font-bold text-lg text-gray-800 break-all">20202972301000103797</span>
                                            </div>
                                            <div className="text-xs text-gray-400">Душанбе Сити</div>
                                        </div>

                                        {/* Comment Code */}
                                        <div className="bg-blue-50 p-4 rounded-xl space-y-2 border border-blue-200">
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">Ваш комментарий</div>
                                                <div className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">ОБЯЗАТЕЛЬНО</div>
                                            </div>

                                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100 shadow-sm relative overflow-hidden">
                                                <span className="font-mono font-black text-2xl text-blue-600 tracking-wider z-10">{user?.telegramId}</span>
                                                <div className="absolute inset-0 bg-blue-50/50 z-0" />
                                            </div>
                                            <p className="text-xs text-blue-600/80 leading-relaxed">
                                                При переводе укажите <span className="font-bold">число выше</span> в поле "Комментарий" (назн. платежа). Без него мы не увидим оплату!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-8 space-y-3">
                                        <button
                                            onClick={handleDCVerify}
                                            disabled={verifyingDC}
                                            className="w-full py-4 bg-[#007AFF] text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                                        >
                                            {verifyingDC ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Проверка...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    <span>Я оплатил, проверить</span>
                                                </>
                                            )}
                                        </button>
                                        <button onClick={() => setRequestStep('method')} className="w-full py-3 text-gray-400 font-bold text-sm">
                                            Назад
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {requestStep === 'info' && (
                            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="space-y-4 mb-8">
                                    {status === 'PENDING' && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6 flex items-center gap-3">
                                            <div className="p-2 bg-yellow-500/20 rounded-full">
                                                <Upload className="w-5 h-5 text-yellow-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-yellow-500 text-sm font-bold">{t('subscription.pendingTitle', language || 'ru')}</h4>
                                                <p className="text-white/60 text-xs">{t('subscription.pendingText', language || 'ru')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {status === 'REJECTED' && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-center gap-3">
                                            <div className="p-2 bg-red-500/20 rounded-full">
                                                <X className="w-5 h-5 text-red-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-red-500 text-sm font-bold">{t('subscription.rejectedTitle', language || 'ru')}</h4>
                                                <p className="text-white/60 text-xs">{t('subscription.rejectedText', language || 'ru')}</p>
                                            </div>
                                        </div>
                                    )}

                                    <FeatureRow icon={Zap} text={t('subscription.feature.scan', language || 'ru')} delay={0.1} />
                                    <FeatureRow icon={Star} text={t('subscription.feature.macros', language || 'ru')} delay={0.2} />
                                    <FeatureRow icon={Shield} text={t('subscription.feature.goals', language || 'ru')} delay={0.3} />
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">{t('subscription.proPlan', language || 'ru')}</span>
                                        <span className="text-white font-black">
                                            {t('subscription.price', language || 'ru')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setRequestStep('method')}
                                        className="w-full py-4 bg-[#FFD700] text-[#5C4D00] font-black text-lg rounded-2xl shadow-glow active:scale-[0.98] transition-all"
                                    >
                                        {t('subscription.connectNow', language || 'ru')}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {requestStep === 'payment' && (
                            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="bg-white/5 border border-[#FFD700]/20 rounded-[2rem] p-6 mb-6">
                                    <h3 className="text-[#FFD700] font-bold text-sm uppercase tracking-wider mb-4">{t('subscription.paymentTitle', language || 'ru')}</h3>
                                    <div className="space-y-4 text-white/80 text-sm leading-relaxed mb-6">
                                        {language === 'uz' ? (
                                            <>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                                    <p>{t('subscription.step1.uzs', language || 'ru').replace('{amount}', '38888 soʻm')}</p>
                                                </div>
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa DC</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">9762 0000 0174 6154</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                                    <p>{t('subscription.step2.uzs', language || 'ru')}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                                    <p>{t('subscription.step1.tjs', language || 'ru').replace('{amount}', '30 TJS')}</p>
                                                </div>
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="opacity-60 text-xs">Visa DC</span>
                                                        <span className="font-mono text-brand-400 font-bold select-all">9762 0000 0174 6154</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                                    <p>{t('subscription.step2.tjs', language || 'ru')}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-1">{t('subscription.phoneLabel', language || 'ru')}</label>
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
                                                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">{t('subscription.attachReceipt', language || 'ru')}</span>
                                            </button>
                                        ) : (
                                            <div className="relative w-full aspect-video bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                                                <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-xs font-bold border border-white/10 active:scale-95 transition-all"
                                                    >
                                                        {t('subscription.changePhoto', language || 'ru')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleRequest}
                                            disabled={loading || !receiptFile || !phoneNumber}
                                            className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl shadow-glow active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                                        >
                                            {loading ? t('subscription.sending', language || 'ru') : t('subscription.send', language || 'ru')}
                                        </button>
                                        <button onClick={() => setRequestStep('method')} className="w-full py-2 text-white/40 text-xs font-bold uppercase tracking-widest">
                                            {t('common.back', language || 'ru')}
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
                                <h3 className="text-2xl font-black text-white mb-2">{t('subscription.successTitle', language || 'ru')}</h3>
                                <p className="text-white/60 text-sm leading-relaxed mb-8 px-6">
                                    {t('subscription.successText', language || 'ru')}
                                </p>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-white/10 text-white font-black rounded-2xl border border-white/10 active:scale-[0.98] transition-all"
                                >
                                    {t('common.ok', language || 'ru')}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="text-center text-white/20 text-[10px] mt-6 px-10">
                        {t('subscription.disclaimer', language || 'ru')}
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
