import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { updateProfile, updateCalorieGoal } from '../api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '../utils/cn';
import {
  type Gender,
  type ActivityLevel,
  type GoalType,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateBMI
} from '../utils/calories';
import { useHapticFeedback } from '@telegram-apps/sdk-react';
import {
  ChevronRight,
  ChevronLeft,
  Activity,
  Target,
  User,
  ArrowRight,
  Flame,
  CheckCircle2,
  Ruler,
  Weight,
  Calendar,
  Zap,
  Leaf
} from 'lucide-react';
import WheelPicker from './WheelPicker';

interface Props {
  onComplete: (goal?: number) => void;
}

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1, zIndex: 1, transition: { type: "spring", bounce: 0, duration: 0.4 } },
  exit: (dir: number) => ({ x: dir < 0 ? 30 : -30, opacity: 0, scale: 0.95, zIndex: 0, transition: { type: "spring", bounce: 0, duration: 0.4 } })
};

export default function Onboarding({ onComplete }: Props) {
  const { user, setUser } = useStore();
  const haptic = useHapticFeedback();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    gender: 'MALE' as Gender,
    age: '25',
    height: '175',
    weight: '70',
    activity: 'LIGHT' as ActivityLevel,
    goal: null as GoalType | null
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const age = Number(formData.age);
  const height = Number(formData.height);
  const weight = Number(formData.weight);

  const bmi = useMemo(() => calculateBMI(weight, height), [weight, height]);

  const recommended = useMemo(() => {
    if (!weight || !height || !age || !formData.gender || !formData.activity) return 2000;
    const bmr = calculateBMR(formData.gender, weight, height, age);
    const tdee = calculateTDEE(bmr, formData.activity);
    return calculateTargetCalories(tdee, formData.goal ?? 'MAINTAIN', bmi);
  }, [formData, bmi, weight, height, age]);

  // Pre-fill form from user store if available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        gender: user.gender || prev.gender,
        age: user.age ? String(user.age) : prev.age,
        height: user.heightCm ? String(user.heightCm) : prev.height,
        weight: user.weightKg ? String(user.weightKg) : prev.weight,
        activity: user.activity || prev.activity,
        goal: user.goal as any || prev.goal
      }));
    }
  }, [user?.id]);

  const isValidStep0 = formData.firstName.trim().length > 0 && formData.age !== '' && formData.height !== '' && formData.weight !== '' && age > 0 && height > 0 && weight > 0;
  const isValidStep2 = !!formData.goal;

  const stepsTotal = 3;
  const progress = ((step + 1) / stepsTotal) * 100;

  const next = () => {
    if (step === 0 && !isValidStep0) {
      setTouched({ age: true, height: true, weight: true });
      haptic.notificationOccurred('error');
      return;
    }
    haptic.impactOccurred('medium');
    setDirection(1);
    setStep(s => Math.min(stepsTotal - 1, s + 1));
  };

  const prev = () => {
    haptic.impactOccurred('medium');
    setDirection(-1);
    setStep(s => Math.max(0, s - 1));
  };

  const handleInput = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: any) => {
    haptic.selectionChanged();
    setFormData({
      firstName: formData.firstName,
      gender: preset.gender,
      age: String(preset.age),
      height: String(preset.height),
      weight: String(preset.weight),
      activity: preset.activity,
      goal: preset.goal
    });
  };

  const ageRange = useMemo(() => Array.from({ length: 83 }, (_, i) => i + 18), []); // 18-100
  const heightRange = useMemo(() => Array.from({ length: 121 }, (_, i) => i + 100), []); // 100-220
  const weightRange = useMemo(() => Array.from({ length: 171 }, (_, i) => i + 30), []); // 30-200

  // ... existing handlers ...

  const handleSubmit = async () => {
    if (!user || isSubmitting) return; // Prevent double submit
    haptic.notificationOccurred('success');
    setIsSubmitting(true);

    import('canvas-confetti').then((module) => {
      const confetti = module.default;
      const colors = ['#557EFF', '#ffffff']; // Restored
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      // Fire 2 distinct bursts instead of a loop
      confetti({ ...defaults, particleCount: 50, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors });
      setTimeout(() => {
        confetti({ ...defaults, particleCount: 50, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors });
      }, 250);
    });

    try {
      // Send all profile data
      console.log('Sending profile data:', {
        firstName: formData.firstName,
        gender: formData.gender,
        age,
        heightCm: height,
        weightKg: weight,
        activity: formData.activity,
        goal: formData.goal ?? 'MAINTAIN'
      });
      
      await updateProfile(user.id, {
        firstName: formData.firstName,
        gender: formData.gender,
        age,
        heightCm: height,
        weightKg: weight,
        activity: formData.activity,
        goal: formData.goal ?? 'MAINTAIN'
      });

      // Save calculated calorie goal
      const goalRes = await updateCalorieGoal(user.id, recommended);
      console.log('Updated calorie goal:', goalRes);

      // Signal completion - App.tsx will fetch fresh user data
      setTimeout(() => onComplete(recommended), 800);
    } catch (error) {
      haptic.notificationOccurred('error');
      console.error('Onboarding error:', error);
      setIsSubmitting(false);
    }
  };

  const activityCards = [
    { id: 'SEDENTARY', title: 'Минимальная', desc: 'Сидячая работа', icon: Leaf },
    { id: 'LIGHT', title: 'Лёгкая', desc: 'Прогулки, йога', icon: Activity },
    { id: 'MODERATE', title: 'Средняя', desc: '3-4 тренировки', icon: Zap },
    { id: 'ACTIVE', title: 'Высокая', desc: 'Спорт 5+ раз', icon: Flame },
  ] as const;

  return (
    <div className="fixed inset-0 bg-[#F2F4F8] dark:bg-[#000] text-gray-900 dark:text-gray-100 font-sans overflow-hidden hover:cursor-default selection:bg-brand-500/30">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(85,126,255,0.15) 0%, transparent 50%), 
                            radial-gradient(circle at 90% 10%, rgba(200,220,255,0.2) 0%, transparent 40%)`
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-5 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <button onClick={prev} disabled={step === 0} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-0 transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: stepsTotal }).map((_, i) => (
              <motion.div
                key={i}
                className={cn("h-1.5 rounded-full transition-all duration-500", i <= step ? "w-8 bg-brand-500 shadow-[0_0_10px_rgba(85,126,255,0.4)]" : "w-1.5 bg-gray-300 dark:bg-gray-800")}
              />
            ))}
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Title Area */}
        <div className="mb-6 space-y-1 text-center">
          <AnimatePresence mode='wait'>
            <motion.h1
              key={step}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400"
            >
              {step === 0 ? "О вас" : step === 1 ? "Активность" : "Ваша цель"}
            </motion.h1>
          </AnimatePresence>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Шаг {step + 1} из {stepsTotal}
          </p>
        </div>

        {/* Main Card Area */}
        <div className="flex-1 relative">
          <AnimatePresence initial={false} custom={direction} mode='wait'>

            {/* STEP 0: BASICS */}
            {step === 0 && (
              <motion.div key="s0" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                style={{ willChange: 'transform, opacity' }}
                className="absolute inset-0 flex flex-col gap-5 overflow-y-auto no-scrollbar pb-4">
                {/* Name Input */}
                <div className="px-1">
                  <ModernInput
                    icon={User}
                    label="Вас зовут?"
                    placeholder="Имя"
                    value={formData.firstName}
                    onChange={(v: string) => handleInput('firstName', v)}
                    type="text"
                  />
                </div>

                {/* Gender */}
                <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-soft">
                  {(['MALE', 'FEMALE'] as const).map(g => (
                    <button key={g} onClick={() => { haptic.selectionChanged(); setFormData({ ...formData, gender: g }) }}
                      className="flex-1 relative py-3.5 px-4 rounded-xl text-sm font-semibold transition-all z-0 overflow-hidden">
                      {formData.gender === g && (
                        <motion.div layoutId="gender-active" className="absolute inset-0 bg-brand-500 shadow-glow" transition={{ type: "spring", bounce: 0.1, duration: 0.3 }} />
                      )}
                      <span className={cn("relative z-10 flex items-center justify-center gap-2", formData.gender === g ? "text-white" : "text-gray-500")}>
                        {g === 'MALE' ? <User className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        {g === 'MALE' ? 'Мужчина' : 'Женщина'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Wheel Pickers */}
                <div className="flex items-center justify-between gap-0 h-[220px] px-2">
                  <div className="flex-1 min-w-0">
                    <WheelPicker
                      height={220}
                      label="Возраст"
                      items={ageRange}
                      value={parseInt(formData.age || '25')}
                      onChange={(v: number) => handleInput('age', v.toString())}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <WheelPicker
                      height={220}
                      label="Рост (см)"
                      items={heightRange}
                      value={parseInt(formData.height || '175')}
                      onChange={(v: number) => handleInput('height', v.toString())}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <WheelPicker
                      height={220}
                      label="Вес (кг)"
                      items={weightRange}
                      value={parseInt(formData.weight || '70')}
                      onChange={(v: number) => handleInput('weight', v.toString())}
                    />
                  </div>
                </div>

                {bmi && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-auto p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-300">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-brand-800 dark:text-brand-200">Индекс массы тела</div>
                        <div className="text-[10px] text-brand-600 dark:text-brand-400">Норма: 18.5 – 25</div>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-brand-700 dark:text-brand-200">{bmi}</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* STEP 1: ACTIVITY */}
            {step === 1 && (
              <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                style={{ willChange: 'transform, opacity' }}
                className="absolute inset-0 flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4">
                {activityCards.map(c => {
                  const isSel = formData.activity === c.id;
                  return (
                    <button key={c.id} onClick={() => { haptic.selectionChanged(); setFormData({ ...formData, activity: c.id as ActivityLevel }) }}
                      className={cn(
                        "group relative p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden",
                        isSel
                          ? "bg-white dark:bg-gray-800 border-brand-500 shadow-glow"
                          : "bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", isSel ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500")}>
                          <c.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className={cn("font-bold text-base transition-colors", isSel ? "text-brand-600 dark:text-white" : "text-gray-900 dark:text-gray-200")}>{c.title}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{c.desc}</div>
                        </div>
                        {isSel && <div className="ml-auto text-brand-500"><CheckCircle2 className="w-6 h-6 fill-current" /></div>}
                      </div>
                    </button>
                  )
                })}
              </motion.div>
            )}

            {/* STEP 2: GOAL */}
            {step === 2 && (
              <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                style={{ willChange: 'transform, opacity' }}
                className="absolute inset-0 flex flex-col gap-5 overflow-y-auto no-scrollbar pb-4">
                {/* Goal Selector */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-white dark:bg-gray-900 rounded-2xl shadow-soft">
                  {(['LOSS', 'MAINTAIN', 'GAIN'] as const).map(g => (
                    <button key={g} onClick={() => { haptic.selectionChanged(); setFormData({ ...formData, goal: g }) }}
                      className={cn("py-3 rounded-xl text-xs font-bold transition-all relative", formData.goal === g ? "text-white" : "text-gray-500 dark:text-gray-400")}>
                      {formData.goal === g && <motion.div layoutId="goal-active" className="absolute inset-0 bg-brand-500 rounded-xl shadow-sm" />}
                      <span className="relative z-10">{g === 'LOSS' ? 'Сбросить' : g === 'GAIN' ? 'Набрать' : 'Держать'}</span>
                    </button>
                  ))}
                </div>

                {/* Recommended Card */}
                <div className="relative overflow-visible bg-brand-600 rounded-[2.5rem] p-8 text-white text-center shadow-[0_20px_40px_-10px_rgba(85,126,255,0.5)] ring-1 ring-white/20">
                  <div className="absolute inset-x-0 -bottom-10 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center text-brand-50">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Ваша норма</span>
                    <div className="text-[4.5rem] leading-[1.1] font-black tracking-tighter drop-shadow-lg tabular-nums">
                      {recommended}
                    </div>
                    <span className="text-sm font-semibold opacity-90 mt-2">ккал / день</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="mt-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Быстрый старт</div>
                  <div className="space-y-3">
                    {[
                      { label: 'Офисный работник', sub: 'Сидячая работа', icon: User, preset: { gender: 'MALE', age: 30, height: 178, weight: 75, activity: 'SEDENTARY', goal: 'MAINTAIN' } },
                      { label: 'Снижение веса', sub: 'Умеренная активность', icon: Flame, preset: { gender: 'FEMALE', age: 26, height: 165, weight: 65, activity: 'MODERATE', goal: 'LOSS' } },
                    ].map((p, i) => (
                      <button key={i} onClick={() => { applyPreset(p.preset) }}
                        className="group w-full flex items-center gap-4 p-4 rounded-3xl bg-white dark:bg-white/5 border border-transparent hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-all active:scale-[0.98]">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/10 flex items-center justify-center text-gray-500 group-hover:text-brand-500 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-colors">
                          <p.icon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{p.label}</div>
                          <div className="text-xs font-medium text-gray-500 group-hover:text-brand-500/70 transition-colors">{p.sub}</div>
                        </div>
                        <div className="ml-auto w-8 h-8 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-300 group-hover:border-brand-200 group-hover:text-brand-500 transition-all">
                          <ChevronRight className="w-4 h-4 ml-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Bottom Action Area */}
        <div className="mt-auto pt-6 pb-4">
          {step < stepsTotal - 1 ? (
            <button onClick={next} disabled={step === 0 && !isValidStep0}
              className="w-full py-5 rounded-[20px] bg-brand-600 text-white font-bold text-xl shadow-[0_10px_30px_-5px_rgba(85,126,255,0.4)] hover:shadow-[0_15px_35px_-5px_rgba(85,126,255,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none relative overflow-hidden">
              <span className="relative z-10">Далее</span>
              <ArrowRight className="w-6 h-6 relative z-10 opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-150%] animate-[shimmer_2s_infinite]" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!isValidStep2 || isSubmitting}
              className="w-full py-5 rounded-[20px] bg-brand-500 text-white font-bold text-xl shadow-[0_10px_30px_-5px_rgba(85,126,255,0.4)] hover:shadow-[0_15px_35px_-5px_rgba(85,126,255,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none">
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Считаем...</span>
                </div>
              ) : (
                <>
                  <span>Начать</span>
                  <div className="bg-white/20 rounded-full p-1">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModernInput({ icon: Icon, label, value, onChange, placeholder, suffix, error, type = "text" }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <div className="w-full">
      <div className={cn(
        "relative bg-white dark:bg-gray-900 border-2 rounded-2xl transition-all duration-200 px-4 py-3 flex items-center gap-3",
        error ? "border-red-400 bg-red-50/10" : focus ? "border-brand-500 shadow-glow" : "border-transparent"
      )}>
        <Icon className={cn("w-5 h-5 transition-colors", focus ? "text-brand-500" : error ? "text-red-400" : "text-gray-400")} />
        <div className="flex-1 relative h-10">
          <label className={cn("absolute left-0 transition-all pointer-events-none", (focus || value) ? "-top-1 text-[10px] text-gray-400" : "top-2.5 text-sm text-gray-500")}>
            {label}
          </label>
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            className="w-full h-full pt-3 bg-transparent outline-none font-bold text-lg text-gray-900 dark:text-gray-100 placeholder-transparent"
            placeholder={placeholder}
          />
        </div>
        <span className="text-sm font-medium text-gray-400">{suffix}</span>
      </div>
    </div>
  )
}
