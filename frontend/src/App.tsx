import { useEffect, useState } from 'react';
import { SDKProvider } from '@telegram-apps/sdk-react';
import Onboarding from './components/Onboarding';
import MainScreen from './components/MainScreen';
import WelcomePage from './components/WelcomePage';
import NavBar from './components/NavBar';
import Calendar from './components/Calendar';
import Profile from './components/Profile';
import AddMealModal from './components/AddMealModal';
import { useStore } from './store/useStore';
import { authenticate, getTodayMeals, getProfile } from './api';

function AppContent() {
  const { user, setUser, setMeals } = useStore();
  const [initData, setInitData] = useState<string>('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const [tab, setTab] = useState<'home' | 'calendar' | 'profile'>('home');

  const resolveInitData = () => {
    const qs = new URLSearchParams(window.location.search);
    const fromQuery = qs.get('tgWebAppData') || qs.get('initData');
    const fromTelegram = window.Telegram?.WebApp?.initData;
    const fromEnv = import.meta.env.VITE_MOCK_INIT_DATA as string | undefined;
    return fromTelegram || fromQuery || fromEnv || '';
  };

  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const raw = resolveInitData();

        // Debug Bypass
        if (window.location.search.includes('debug=onboarding')) {
          console.log('Debug Onboarding Mode');
          setUser({ id: 999, firstName: 'Debug', username: 'debug', language_code: 'en' } as any);
          setIsOnboarding(true);
          setShowWelcome(false);
          setIsInitializing(false);
          return;
        }

        if (!raw) {
          setOutsideTelegram(true);
          return;
        }
        setInitData(raw);

        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.ready();
          window.Telegram.WebApp.expand();
          // prevent downward swipe closing the mini app
          try { (window.Telegram.WebApp as any).disableVerticalSwipes?.(); } catch { }

          // Theme handling
          const applyTheme = () => {
            const isDark = window.Telegram?.WebApp?.colorScheme === 'dark';
            if (isDark) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          };
          applyTheme();
          window.Telegram.WebApp.onEvent('themeChanged', applyTheme);
        }

        const authenticatedUser = await authenticate(raw);
        setUser(authenticatedUser);

        // Pre-determine if onboarding is needed, but don't show yet
        if (!authenticatedUser.age || !authenticatedUser.heightCm || !authenticatedUser.weightKg) {
          setIsOnboarding(true);
        } else {
          const { meals, totals } = await getTodayMeals(authenticatedUser.id);
          setMeals(meals, totals);
        }
      } catch (error: any) {
        console.error('Init error:', error);
        (window as any)._lastError = error.message || JSON.stringify(error);
        setOutsideTelegram(true);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleStart = () => {
    setShowWelcome(false);
  };

  const handleOnboardingComplete = async () => {
    if (user) {
      try {
        // Fetch updated user profile from backend to get all new data
        const updatedUser = await getProfile(user.id);
        setUser(updatedUser);
        setIsOnboarding(false);
        const { meals, totals } = await getTodayMeals(user.id);
        setMeals(meals, totals);
      } catch (error) {
        console.error('Failed to load profile after onboarding:', error);
        setIsOnboarding(false);
      }
    }
  };

  if (outsideTelegram) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 text-tg-text">
        <div className="text-center space-y-2">
          <div className="text-3xl">📱</div>
          <p className="text-lg font-semibold">Открой мини‑апп внутри Telegram</p>
          <p className="text-tg-hint text-sm">Используй кнопку в боте для запуска</p>
          <div className="text-xs text-red-500 mt-4 max-w-[200px] overflow-hidden">
            Debug: {typeof window !== 'undefined' ? JSON.stringify({
              inTelegram: !!window.Telegram?.WebApp,
              initDataLen: window.Telegram?.WebApp?.initData?.length,
              search: window.location.search
            }) : 'no-window'}
          </div>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F4F8] dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-tg-hint font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (showWelcome) return <WelcomePage onStart={handleStart} />;

  if (isOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-tg-hint">Авторизация...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {tab === 'home' && <MainScreen onNavigate={setTab} />}
      {tab === 'calendar' && <Calendar />}
      {tab === 'profile' && <Profile />}
      <NavBar active={tab} onChange={setTab} onAddClick={() => setShowAddModal(true)} />
      {showAddModal && <AddMealModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <SDKProvider acceptCustomStyles>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </SDKProvider>
  );
}

export default App;
