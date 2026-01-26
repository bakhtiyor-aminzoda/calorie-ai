import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { createMeal, analyzeImage } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, X, Camera, Image as ImageIcon, Zap, Sparkles } from 'lucide-react';
import { ComponentErrorBoundary } from './ComponentErrorBoundary';
import SubscriptionModal from './SubscriptionModal';
import { useQueryClient } from '@tanstack/react-query';

// Memoized Nutrient Card component for maximum performance
const NutrientCard = memo(({ label, value, color, unit = 'г' }: { label: string, value: number, color: string, unit?: string }) => (
  <div className={`${color} p-3 rounded-2xl text-center shadow-sm border border-black/5 dark:border-white/5 w-full`}>
    <div className="text-[10px] opacity-60 font-bold mb-1 uppercase tracking-tight">{label}</div>
    <div className="text-base font-black tabular-nums">{value}{unit}</div>
  </div>
));

const AddMealModal = memo(({ onClose }: { onClose: () => void }) => {
  const user = useStore(state => state.user);
  const addMeal = useStore(state => state.addMeal);
  const selectedDate = useStore(state => state.selectedDate);
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'camera' | 'gallery' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [showSubscription, setShowSubscription] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<{
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    ingredients?: string[];
    weightG?: number;
    confidence?: number;
    photoUrl?: string;
  } | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanSteps = [
    "Инициализация нейросети...",
    "Поиск объектов на фото...",
    "Анализ объема и веса...",
    "Вычисление нутриентов..."
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setAnalysisResult(null);
    setIsAnalyzing(true);
    setSelectedFile(file);
    setImageSource('gallery');

    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const { processImageFile } = await import('../utils/fileActions');
      const processedFile = await processImageFile(file);
      setSelectedFile(processedFile);
      handleAnalyze(processedFile);
    } catch (err) {
      handleAnalyze(file);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      setCameraError('Не удалось открыть камеру');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    // Haptic feedback for tactile feel
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg', 0.8));
      setImageSource('camera');
      canvas.toBlob((blob) => {
        if (blob) setSelectedFile(new File([blob], "camera.jpg", { type: "image/jpeg" }));
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      stopCamera();
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      stopCamera();
      const interval = setInterval(() => setScanStep(prev => (prev + 1) % scanSteps.length), 1500);
      return () => clearInterval(interval);
    }
    setScanStep(0);
  }, [isAnalyzing]);

  const handleAnalyze = async (fileOverride?: File) => {
    const targetFile = (fileOverride instanceof File ? fileOverride : selectedFile);
    if (!targetFile || !user) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeImage(user.id, targetFile);
      setAnalysisResult(result);
    } catch (error: any) {
      if (error?.response?.status === 403 || error?.response?.data?.code === 'LIMIT_REACHED') {
        setIsAnalyzing(false);
        setShowSubscription(true);
        return;
      }
      alert('Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveMeal = async () => {
    if (!selectedFile || !user || !analysisResult) return;
    setIsSaving(true);
    try {
      const photoSource = analysisResult.photoUrl || selectedFile;
      const meal = await createMeal(user.id, photoSource, analysisResult);
      addMeal(meal);

      // Update query cache so navigating between tabs keeps the new meal visible
      const mealDate = meal.date || meal.createdAt;
      const dateKey = mealDate ? mealDate.split('T')[0] : selectedDate.toISOString().split('T')[0];
      const isToday = new Date(mealDate || Date.now()).toDateString() === new Date().toDateString();

      const updateCache = (key: (string | undefined)[]) => {
        queryClient.setQueryData<{ meals: any[]; totals: any }>(key, (prev) => {
          if (!prev) {
            return {
              meals: [meal],
              totals: {
                calories: meal.calories,
                protein: meal.protein,
                fat: meal.fat,
                carbs: meal.carbs
              }
            };
          }
          const exists = prev.meals.some((m) => m.id === meal.id);
          if (exists) return prev;
          const meals = [meal, ...prev.meals];
          const totals = {
            calories: prev.totals.calories + meal.calories,
            protein: prev.totals.protein + meal.protein,
            fat: prev.totals.fat + meal.fat,
            carbs: prev.totals.carbs + meal.carbs
          };
          return { meals, totals };
        });
      };

      updateCache(['meals', user.id, dateKey]);
      if (isToday) updateCache(['meals', user.id, 'today']);
      queryClient.invalidateQueries({ queryKey: ['meals', user.id] });

      if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      onClose();
    } catch (e) {
      alert('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={() => !isAnalyzing && onClose()}
      />

      <AnimatePresence>
        {showSubscription && <SubscriptionModal onClose={() => setShowSubscription(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
        style={{ willChange: 'transform' }}
        className="relative w-full sm:max-w-md bg-[#F2F4F8] dark:bg-[#1C1C1E] rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <ComponentErrorBoundary fallback={<div className="p-6 text-red-500">Ошибка модального окна.</div>}>
          <div className="flex items-center justify-between p-6 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-500 rounded-lg shadow-sm">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-tg-text">
                {isCameraOpen ? 'Камера' : 'AI Сканер'}
              </h2>
            </div>
            <button onClick={onClose} disabled={isAnalyzing} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full text-tg-hint active:scale-95 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 pt-4">
            <AnimatePresence mode="wait" initial={false}>
              {isCameraOpen ? (
                <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative rounded-3xl overflow-hidden aspect-[9/16] bg-black shadow-inner">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {/* Cinematic Vignette */}
                  <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

                  {/* Elegant Viewfinder Corners */}
                  <motion.div
                    className="absolute inset-0 z-10 pointer-events-none"
                    animate={{
                      scale: [1, 1.02, 1],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="absolute top-10 left-8 w-12 h-12 border-t border-l border-white/60 rounded-tl-2xl shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                    <div className="absolute top-10 right-8 w-12 h-12 border-t border-r border-white/60 rounded-tr-2xl shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                    <div className="absolute bottom-40 left-8 w-12 h-12 border-b border-l border-white/60 rounded-bl-2xl shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                    <div className="absolute bottom-40 right-8 w-12 h-12 border-b border-r border-white/60 rounded-br-2xl shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                  </motion.div>

                  <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-6 z-20">
                    <div className="bg-black/40 px-5 py-2 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                      <p className="text-white/80 text-[10px] font-bold tracking-[0.2em] uppercase">AI Vision Active</p>
                    </div>

                    {/* Pro Shutter Control Layer */}
                    <div className="flex items-center justify-center gap-10 w-full mb-4">
                      <button onClick={stopCamera} className="p-4 bg-black/30 backdrop-blur-md rounded-full text-white/70 border border-white/10 active:scale-95 transition-all">
                        <X className="w-5 h-5" />
                      </button>

                      {/* Concentric Shutter Button */}
                      <button
                        onClick={capturePhoto}
                        className="group relative w-20 h-20 flex items-center justify-center active:scale-90 transition-all duration-150"
                      >
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-white/60 group-active:scale-110 transition-transform duration-200" />
                        <div className="absolute inset-1 rounded-full border border-white/20" />
                        <div className="w-[66px] h-[66px] rounded-full bg-white shadow-glow group-active:scale-95 transition-transform" />
                      </button>

                      <div className="w-14 h-14" /> {/* Balanced Spacer */}
                    </div>
                  </div>
                </motion.div>
              ) : !preview ? (
                <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4">
                  <button onClick={startCamera} className="group relative h-48 rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col items-center justify-center shadow-lg active:scale-[0.98] transition-all">
                    <div className="p-4 bg-white/20 rounded-2xl mb-3"><Camera className="w-8 h-8" /></div>
                    <span className="font-bold text-lg">Открыть камеру</span>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="h-16 rounded-[2rem] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center gap-3 font-semibold active:opacity-60 transition-opacity">
                    <ImageIcon className="w-5 h-5 text-brand-500" />
                    Галерея
                  </button>
                </motion.div>
              ) : !analysisResult ? (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ willChange: 'opacity' }}>
                  <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-black shadow-xl">
                    <img key={preview} src={preview} alt="Food" className="w-full h-full object-cover opacity-80" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 z-20">
                        <motion.div className="absolute inset-0 bg-brand-500/10" animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} />
                        <motion.div className="absolute w-full h-[2px] bg-brand-400 shadow-[0_0_15px_rgba(85,126,255,1)]" animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} />
                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-white font-medium text-sm">{scanSteps[scanStep]}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {!isAnalyzing && (
                      <div className="absolute bottom-6 inset-x-6 z-30 flex flex-col gap-3">
                        <button onClick={() => handleAnalyze()} className="w-full py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-glow active:scale-95 transition-transform flex items-center justify-center gap-2">
                          <Zap className="w-5 h-5 fill-current" /> Анализировать
                        </button>
                        <button
                          onClick={() => {
                            if (imageSource === 'gallery') {
                              fileInputRef.current?.click();
                            } else {
                              setPreview(null);
                              startCamera();
                            }
                          }}
                          className="w-full py-3 bg-black/60 text-white font-medium rounded-2xl active:opacity-80 transition-all font-bold"
                        >
                          {imageSource === 'gallery' ? 'Выбрать другую' : 'Переснять'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="flex flex-col gap-5" style={{ willChange: 'transform, opacity' }}>
                  <div className="relative rounded-3xl overflow-hidden aspect-video bg-black shadow-lg">
                    <img src={preview!} alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-block mb-1 border ${(analysisResult.confidence ?? 1) > 0.8 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-100'}`}>
                        AI CONFIDENCE {Math.round((analysisResult.confidence ?? 0.98) * 100)}%
                      </div>
                      <h3 className="text-white text-xl font-bold line-clamp-1">
                          {analysisResult.name}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    <NutrientCard label="Ккал" value={analysisResult.calories} color="bg-white dark:bg-white/5" unit="" />
                    <NutrientCard label="Белки" value={analysisResult.protein} color="bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300" />
                    <NutrientCard label="Жиры" value={analysisResult.fat} color="bg-yellow-50/50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-300" />
                    <NutrientCard label="Угл" value={analysisResult.carbs} color="bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" />
                  </div>

                  <div className="bg-white dark:bg-white/5 rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm space-y-3">
                    {analysisResult.weightG && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-tg-hint">Вес блюда</span>
                        <span className="text-base font-bold text-tg-text">{Math.round(analysisResult.weightG)} г</span>
                      </div>
                    )}

                    {analysisResult.ingredients && analysisResult.ingredients.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-tg-text">Ингредиенты</div>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.ingredients.map((ing: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-sm text-tg-text font-medium border border-black/5 dark:border-white/10">
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-1">
                    <button onClick={() => setAnalysisResult(null)} className="flex-1 py-4 bg-gray-200 dark:bg-white/5 text-tg-text font-bold rounded-2xl active:scale-95 transition-all">Назад</button>
                    <button onClick={handleSaveMeal} disabled={isSaving} className="flex-[2] py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap className="w-5 h-5 fill-current" /> В дневник</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        </ComponentErrorBoundary>
      </motion.div>
    </div>
  );
});

export default AddMealModal;
