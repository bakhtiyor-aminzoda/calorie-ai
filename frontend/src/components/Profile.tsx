import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { updateCalorieGoal, updateProfile, checkSubscriptionStatus } from '../api';
import WheelPicker from './WheelPicker';
import { ChevronRight, Globe, Moon, Shield, Zap, Ruler, Weight, Calendar, Activity, Check, X, Calculator, Edit2, Save, Coffee, Dumbbell, Flame, Trophy, TrendingDown, Minus, TrendingUp, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SubscriptionModal from './SubscriptionModal';
import PremiumActiveModal from './PremiumActiveModal';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateBMI, type Gender, type ActivityLevel, type GoalType } from '../utils/calories';

const StatItem = memo(({ icon: Icon, label, value, editingContent, isEditing, isActive, onToggle }: any) => (
  <div className="flex flex-col bg-white/50 dark:bg-white/5 rounded-2xl overflow-hidden transition-all duration-300">
    <div
      className={`flex items-center justify-between p-4 ${isEditing ? 'cursor-pointer active:bg-black/5 dark:active:bg-white/5' : ''}`}
      onClick={() => isEditing && onToggle()}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-brand-500 text-white' : 'bg-brand-500/10 text-brand-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-medium text-tg-text">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        {!isActive && (
          <span className="text-sm font-bold text-tg-text">{value}</span>
        )}
        {isEditing && (
          <ChevronRight className={`w-5 h-5 text-tg-hint/50 transition-transform ${isActive ? 'rotate-90' : ''}`} />
        )}
      </div>
    </div>

    <AnimatePresence initial={false}>
      {isEditing && isActive && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="bg-transparent"
        >
          <div className="p-4 pt-0">
            {editingContent}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

export default function Profile() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const language = useStore(state => state.language);
  const setLanguage = useStore(state => state.setLanguage);

  const ACTIVITY_LABELS: Record<string, string> = {
    SEDENTARY: 'Минимальная',
    LIGHT: 'Лёгкая',
    MODERATE: 'Средняя',
    ACTIVE: 'Высокая',
    VERY_ACTIVE: 'Экстремальная'
  };

  const GOAL_LABELS: Record<string, string> = {
    LOSS: 'Сбросить вес',
    MAINTAIN: 'Поддерживать',
    GAIN: 'Набрать массу'
  };

  // Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    weight: 70,
    height: 175,
    age: 25,
    gender: 'MALE',
    activity: 'MODERATE',
    target: 'MAINTAIN',
    language: 'ru' as 'ru' | 'tj' | 'uz'
  });

  const ACTIVITY_OPTIONS = useMemo(() => [
    { value: 'SEDENTARY', label: 'Минимальная', description: 'Офисная работа, почти без спорта', icon: Coffee },
    { value: 'LIGHT', label: 'Лёгкая', description: 'Прогулки, уборка, легкая зарядка', icon: Zap },
    { value: 'MODERATE', label: 'Средняя', description: 'Тренировки 3-5 раз в неделю', icon: Dumbbell },
    { value: 'ACTIVE', label: 'Высокая', description: 'Интенсивный спорт 6-7 дней', icon: Flame },
    { value: 'VERY_ACTIVE', label: 'Экстремальная', description: 'Проф. спорт или тяжелый труд', icon: Trophy }
  ], []);

  const GOAL_OPTIONS = useMemo(() => [
    { value: 'LOSS', label: 'Сбросить вес', description: 'Дефицит калорий для похудения', icon: TrendingDown },
    { value: 'MAINTAIN', label: 'Поддерживать', description: 'Норма для сохранения веса', icon: Minus },
    { value: 'GAIN', label: 'Набрать массу', description: 'Профицит для роста мышц', icon: TrendingUp }
  ], []);

  // Init form data from user
  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        weight: user.weightKg || 70,
        height: user.heightCm || 175,
        age: user.age || 25,
        gender: user.gender || 'MALE',
        activity: user.activity || 'MODERATE',
        target: user.goal || 'MAINTAIN',
        language: language
      });
    }
  }, [user, isEditing, language]);

  // Reset scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Calculate new recommended goal locally
      const bmr = calculateBMR(formData.gender as Gender, formData.weight, formData.height, formData.age);
      const tdee = calculateTDEE(bmr, formData.activity as ActivityLevel);
      const bmi = calculateBMI(formData.weight, formData.height);
      const recommended = calculateTargetCalories(tdee, formData.target as GoalType, bmi);

      // 2. Update Profile Stats
      const apiData = {
        weightKg: formData.weight,
        heightCm: formData.height,
        age: formData.age,
        gender: formData.gender as "MALE" | "FEMALE",
        activity: formData.activity as ActivityLevel,
        goal: formData.target as GoalType
      };

      await updateProfile(user.id, apiData);

      // Update language in global state
      if (formData.language !== language) {
        setLanguage(formData.language);
      }

      // 3. Update Calorie Goal Automatically
      const updatedUser = await updateCalorieGoal(user.id, recommended);

      // Preserve identity fields if lost in update
      setUser({
        ...updatedUser,
        firstName: updatedUser.firstName || user.firstName,
        lastName: updatedUser.lastName || user.lastName,
        username: updatedUser.username || user.username
      });

      // 4. Success Feedback
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback?.notificationOccurred('success');
      }
      setIsEditing(false);
      setActiveField(null);
    } catch (e) {
      console.error("Save failed", e);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback?.notificationOccurred('error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Generate ranges
  const weightRange = Array.from({ length: 171 }, (_, i) => i + 30);
  const heightRange = Array.from({ length: 121 }, (_, i) => i + 100);
  const ageRange = Array.from({ length: 83 }, (_, i) => i + 18);

  // Ultra Turbo Handlers
  const handleWeightChange = useCallback((v: any) => setFormData(prev => ({ ...prev, weight: Number(v) })), []);
  const handleHeightChange = useCallback((v: any) => setFormData(prev => ({ ...prev, height: Number(v) })), []);
  const handleAgeChange = useCallback((v: any) => setFormData(prev => ({ ...prev, age: Number(v) })), []);

  const [subStatus, setSubStatus] = useState<string>('NONE');
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const fetchStatus = useCallback(() => {
    if (user?.id) {
      setIsCheckingStatus(true);
      checkSubscriptionStatus(user.id)
        .then(data => {
          if (data.isPremium) {
            setSubStatus('APPROVED');
            // SYNC FRONTEND STATE IF NEEDED
            if (!user.isPremium) {
              console.log('⚡️ Syncing Premium Status from Backend...');
              setUser({ ...user, isPremium: true });
            }
          }
          else setSubStatus(data.lastRequestStatus);
        })
        .catch(() => { })
        .finally(() => setIsCheckingStatus(false));
    }
  }, [user?.id, user?.isPremium, setUser]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="min-h-screen pb-36 px-5 pt-20">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-tg-text">Профиль</h1>
        <div className="flex gap-2">

          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${isEditing ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-white/10 text-brand-500'}`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isEditing ? (
              <> <Save className="w-4 h-4" /> Сохранить </>
            ) : (
              <> <Edit2 className="w-4 h-4" /> Изменить </>
            )}
          </button>
        </div>
      </div>

      {/* User Card */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-glow ${user.isPremium ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black ring-2 ring-[#FFD700]/50' : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'}`}>
            {(user.firstName || user.username || 'U').slice(0, 1).toUpperCase()}
          </div>
          {user.isPremium && (
            <div className="absolute -bottom-1 -right-1 bg-[#1C1C1E] rounded-full p-1 border border-[#FFD700]">
              <Crown className="w-3 h-3 text-[#FFD700] fill-current" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-tg-text">{user.firstName || user.username}</div>
            {user.isPremium ? (
              <span className="text-[10px] bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black px-2 py-0.5 rounded-full font-black tracking-wide shadow-sm flex items-center gap-1">
                PRO
              </span>
            ) : (
              <button
                onClick={() => setShowSubscription(true)}
                className="text-[10px] bg-gradient-to-r from-brand-400 to-brand-600 text-white px-2 py-0.5 rounded-full font-bold tracking-wide hover:opacity-80 transition-colors flex items-center gap-1"
              >
                UPGRADE <ChevronRight className="w-2 h-2" />
              </button>
            )}
          </div>
          <div className="text-sm text-tg-hint">@{user.username || 'unknown'}</div>
        </div>
      </div>

      <AnimatePresence>
        {showSubscription && (
          <SubscriptionModal onClose={() => {
            setShowSubscription(false);
            fetchStatus(); // Refresh status on close
          }} />
        )}
        {showPremiumModal && (
          <PremiumActiveModal onClose={() => setShowPremiumModal(false)} />
        )}
      </AnimatePresence>

      {/* Goal Display (Read Only) */}
      <div
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-[#F2F4F8] dark:from-[#1c1c1e] dark:to-[#000] border border-white/20 shadow-soft mb-6 transition-all duration-300"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-tg-hint font-medium uppercase tracking-wider">Дневная цель</span>
            {isEditing && <span className="text-[10px] text-brand-500 font-bold bg-brand-500/10 px-2 py-0.5 rounded-md">АВТО</span>}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-5xl font-black text-brand-500 tracking-tighter">{Math.round(user.dailyCalorieGoal)}</span>
            <span className="text-lg font-medium text-tg-hint">ккал</span>
          </div>
          {isEditing && (
            <p className="text-xs text-tg-hint/60 mt-2">Будет обновлено автоматически при сохранении</p>
          )}
        </div>
      </div>

      {/* SUBSCRIPTION BANNER */}
      {isCheckingStatus ? (
        <div className="relative overflow-hidden rounded-2xl p-5 mb-8 bg-white/5 border border-white/5 h-[80px] animate-pulse">
          <div className="h-4 w-32 bg-white/10 rounded mb-2" />
          <div className="h-6 w-48 bg-white/10 rounded" />
        </div>
      ) : (
        <div
          onClick={() => {
            if (user.isPremium) {
              setShowPremiumModal(true);
              return;
            }
            if (subStatus === 'PENDING') {
              alert('Ваш запрос уже обрабатывается!');
              return;
            }
            setShowSubscription(true);
          }}
          className={`relative overflow-hidden rounded-2xl p-5 mb-8 transition-all active:scale-[0.98] ${user.isPremium
            ? 'bg-gradient-to-br from-[#1C1C1E] to-black border border-[#FFD700]/30'
            : subStatus === 'PENDING'
              ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20'
              : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_4px_20px_rgba(255,215,0,0.3)] cursor-pointer'
            }`}
        >
          {user.isPremium ? (
            // ACTIVE SUBSCRIPTION STYLE
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FFD700]/10 rounded-full">
                  <Crown className="w-5 h-5 text-[#FFD700] fill-current" />
                </div>
                <div>
                  <p className="text-[#FFD700] text-xs font-bold tracking-wider uppercase mb-0.5">Premium Активен</p>
                  <p className="text-white/60 text-xs">
                    До {new Date(user.subscriptionExpiresAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg text-[#FFD700] text-xs font-bold">
                PRO
              </div>
            </div>
          ) : subStatus === 'PENDING' ? (
            <div className="flex items-center justify-between relative z-10">
              <div className="text-[#FFD700]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />
                  <span className="font-bold tracking-wide text-xs uppercase opacity-80">Проверка</span>
                </div>
                <p className="font-bold text-sm leading-tight text-white/90">Запрос обрабатывается</p>
              </div>
              <div className="px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg text-[#FFD700] text-xs font-bold">
                WAIT
              </div>
            </div>
          ) : subStatus === 'REJECTED' ? (
            <div className="flex items-center justify-between relative z-10">
              <div className="text-red-500">
                <div className="flex items-center gap-1.5 mb-1">
                  <X className="w-4 h-4" />
                  <span className="font-bold tracking-wide text-xs uppercase opacity-80">Отклонено</span>
                </div>
                <p className="font-bold text-sm leading-tight text-white/90">Попробуйте снова</p>
              </div>
              <button className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/20">
                Исправить
              </button>
            </div>
          ) : (
            // UPGRADE BANNER STYLE
            <div className="flex items-center justify-between relative z-10">
              <div className="text-[#5C4D00]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Crown className="w-4 h-4 fill-current" />
                  <span className="font-black tracking-wide text-xs uppercase opacity-80">Calorie AI Pro</span>
                </div>
                <p className="font-bold text-lg leading-tight">Подключить<br />Premium</p>
              </div>
              <button className="bg-white/90 text-[#5C4D00] px-4 py-2 rounded-xl text-xs font-black shadow-lg">
                30 TJS / 3М
              </button>
            </div>
          )}

          {/* Decor */}
          {!user.isPremium && (
            <>
              <div className="absolute right-0 bottom-0 opacity-10">
                <Crown className="w-24 h-24" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_3s_infinite]" />
            </>
          )}
        </div>
      )}

      {/* Body Stats Form */}
      <h3 className="text-sm font-semibold text-tg-hint uppercase tracking-wide ml-2 mb-3">Параметры тела</h3>
      <div className="space-y-3 mb-8">
        <StatItem
          icon={Weight}
          label="Вес"
          value={`${formData.weight} кг`}
          isEditing={isEditing}
          isActive={activeField === 'weight'}
          onToggle={() => setActiveField(activeField === 'weight' ? null : 'weight')}
          editingContent={
            <div className="h-[200px]">
              <WheelPicker height={200} items={weightRange} value={formData.weight} onChange={handleWeightChange} />
            </div>
          }
        />
        <StatItem
          icon={Ruler}
          label="Рост"
          value={`${formData.height} см`}
          isEditing={isEditing}
          isActive={activeField === 'height'}
          onToggle={() => setActiveField(activeField === 'height' ? null : 'height')}
          editingContent={
            <div className="h-[200px]">
              <WheelPicker height={200} items={heightRange} value={formData.height} onChange={handleHeightChange} />
            </div>
          }
        />
        <StatItem
          icon={Calendar}
          label="Возраст"
          value={`${formData.age} лет`}
          isEditing={isEditing}
          isActive={activeField === 'age'}
          onToggle={() => setActiveField(activeField === 'age' ? null : 'age')}
          editingContent={
            <div className="h-[200px]">
              <WheelPicker height={200} items={ageRange} value={formData.age} onChange={handleAgeChange} />
            </div>
          }
        />
        <StatItem
          icon={Activity}
          label="Активность"
          value={ACTIVITY_LABELS[formData.activity] || formData.activity}
          isEditing={isEditing}
          isActive={activeField === 'activity'}
          onToggle={() => setActiveField(activeField === 'activity' ? null : 'activity')}
          editingContent={
            <div className="flex flex-col gap-2">
              {ACTIVITY_OPTIONS.map((opt) => {
                const isSelected = formData.activity === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, activity: opt.value })}
                    className={`relative w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 border ${isSelected
                      ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'bg-white dark:bg-white/5 border-transparent hover:bg-gray-50 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm leading-tight">{opt.label}</div>
                      <div className="text-xs opacity-60 mt-0.5 font-medium">{opt.description}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          }
        />
        <StatItem
          icon={Activity}
          label="Цель"
          value={GOAL_LABELS[formData.target] || formData.target}
          isEditing={isEditing}
          isActive={activeField === 'target'}
          onToggle={() => setActiveField(activeField === 'target' ? null : 'target')}
          editingContent={
            <div className="flex flex-col gap-2">
              {GOAL_OPTIONS.map((opt) => {
                const isSelected = formData.target === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, target: opt.value })}
                    className={`relative w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 border ${isSelected
                      ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'bg-white dark:bg-white/5 border-transparent hover:bg-gray-50 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm leading-tight">{opt.label}</div>
                      <div className="text-xs opacity-60 mt-0.5 font-medium">{opt.description}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          }
        />
        <StatItem
          icon={Globe}
          label="Язык"
          value={formData.language === 'ru' ? 'Русский' : formData.language === 'tj' ? 'Таджикский' : 'Узбекский'}
          isEditing={isEditing}
          isActive={activeField === 'language'}
          onToggle={() => setActiveField(activeField === 'language' ? null : 'language')}
          editingContent={
            <div className="flex flex-col gap-2">
              {[
                { value: 'ru', label: '🇷🇺 Русский' },
                { value: 'tj', label: '🇹🇯 Таджикский' },
                { value: 'uz', label: '🇺🇿 Узбекский' }
              ].map((opt) => {
                const isSelected = formData.language === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, language: opt.value as 'ru' | 'tj' | 'uz' })}
                    className={`relative w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 border ${isSelected
                      ? 'bg-brand-500/20 border-brand-500 text-brand-500'
                      : 'bg-white/5 border-white/10 text-white hover:border-brand-500/50'
                      }`}
                  >
                    <span className="font-bold text-sm leading-tight">{opt.label}</span>
                    {isSelected && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          }
        />
        <StatItem
          icon={Activity}
          label="Пол"
          value={formData.gender === 'MALE' ? 'Муж.' : 'Жен.'}
          isEditing={isEditing}
          isActive={activeField === 'gender'}
          onToggle={() => setActiveField(activeField === 'gender' ? null : 'gender')}
          editingContent={
            <div className="bg-gray-100 dark:bg-black/20 p-1 rounded-xl flex relative">
              {/* Animated Background Pill */}
              <div
                className="absolute top-1 bottom-1 bg-brand-500 shadow-md rounded-lg transition-all duration-300 ease-out"
                style={{
                  left: formData.gender === 'MALE' ? '4px' : '50%',
                  width: 'calc(50% - 4px)'
                }}
              />

              {['MALE', 'FEMALE'].map(g => (
                <button
                  key={g}
                  onClick={() => setFormData({ ...formData, gender: g })}
                  className={`flex-1 py-2.5 relative z-10 text-sm font-bold transition-colors duration-300 ${formData.gender === g ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}
                >
                  {g === 'MALE' ? 'Мужчина' : 'Женщина'}
                </button>
              ))}
            </div>
          }
        />
      </div >

      <div className="mt-8 flex justify-center opacity-30 hover:opacity-100 transition-opacity">
        <button
          onClick={async () => {
            if (confirm('Сбросить прогресс и пройти онбординг заново?')) {
              // Reset all fields that trigger onboarding check in App.tsx
              await updateProfile(user.id, {
                age: null,
                heightCm: null,
                weightKg: null,
                activity: null,
                goal: null
              } as any); // cast to any if strict null checks complain, but interface allows null

              await updateCalorieGoal(user.id, 2000);
              window.location.reload();
            }
          }}
          className="text-xs text-red-500 font-medium border border-red-500/30 px-3 py-1 rounded-lg"
        >
          [DEV] Сбросить профиль
        </button>
      </div>

      <p className="text-center text-xs text-tg-hint/40 mt-4 pb-10">CalorieAI v1.1.2</p>
    </div>
  );
}
