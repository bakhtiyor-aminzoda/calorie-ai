import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000 // 60 seconds
});

export interface User {
  id: string;
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  dailyCalorieGoal: number;
  age?: number | null;
  gender?: 'MALE' | 'FEMALE' | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activity?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE' | null;
  goal?: 'LOSS' | 'MAINTAIN' | 'GAIN' | null;
  isPremium?: boolean;
  subscriptionExpiresAt?: string;
  dailyRequestCount?: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients?: string[];
  weightG?: number;
  confidence?: number;
  photoUrl: string | null;
  date: string;
  createdAt: string;
}

export interface Totals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const authenticate = async (initData: string) => {
  const response = await api.post<{ user: User }>('/auth', { initData });
  return response.data.user;
};

export const getProfile = async (userId: string) => {
  const response = await api.get<{ user: User }>(`/user/${userId}`);
  return response.data.user;
};

export const updateCalorieGoal = async (userId: string, goal: number) => {
  const response = await api.patch<{ user: User }>(`/user/${userId}`, { dailyCalorieGoal: goal });
  return response.data.user;
};

export const updateProfile = async (
  userId: string,
  data: Partial<Pick<User, 'firstName' | 'age' | 'gender' | 'heightCm' | 'weightKg' | 'activity' | 'goal'> & { dailyCalorieGoal?: number }>
) => {
  const response = await api.patch<{ user: User; recommended?: number | null }>(`/user/${userId}`, data);
  return response.data;
};

export const buySubscription = async (userId: string) => {
  const response = await api.post<{ success: boolean; isPremium: boolean; subscriptionExpiresAt: string }>('/subscriptions/buy', { userId });
  return response.data;
};

export const requestSubscription = async (userId: string, receipt: File, phoneNumber?: string) => {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('receipt', receipt);
  if (phoneNumber) {
    formData.append('phoneNumber', phoneNumber);
  }

  const response = await api.post<{ success: boolean; request: any }>('/subscriptions/request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const checkSubscriptionStatus = async (userId: string) => {
  const response = await api.get<{ isPremium: boolean; lastRequestStatus: string }>('/subscriptions/status/' + userId);
  return response.data;
};

export const createMeal = async (userId: string, photo: File | string, analysisData?: {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients?: string[];
  weightG?: number;
  confidence?: number;
}) => {
  const formData = new FormData();
  formData.append('userId', userId);

  if (photo instanceof File) {
    formData.append('photo', photo);
  } else {
    formData.append('photoUrl', photo);
  }

  if (analysisData) {
    formData.append('name', analysisData.name);
    formData.append('calories', String(analysisData.calories));
    formData.append('protein', String(analysisData.protein));
    formData.append('fat', String(analysisData.fat));
    formData.append('carbs', String(analysisData.carbs));
    if (analysisData.ingredients) formData.append('ingredients', JSON.stringify(analysisData.ingredients));
    if (analysisData.weightG) formData.append('weightG', String(analysisData.weightG));
    if (analysisData.confidence) formData.append('confidence', String(analysisData.confidence));
  }
  const response = await api.post<{ meal: Meal }>('/meals', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.meal;
};

export const analyzeImage = async (userId: string, photo: File) => {
  const formData = new FormData();
  formData.append('image', photo);
  formData.append('userId', userId);
  // Returns Analysis + photoUrl
  const response = await api.post<any>('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getTodayMeals = async (userId: string) => {
  const response = await api.get<{ meals: Meal[]; totals: Totals }>(`/meals/today/${userId}`);
  return response.data;
};

export const getMealsByDate = async (userId: string, date: string) => {
  // date format: YYYY-MM-DD
  const response = await api.get<{ meals: Meal[]; totals: Totals }>(`/meals/date/${userId}?date=${date}`);
  return response.data;
};

export const deleteMeal = async (mealId: string) => {
  await api.delete(`/meals/${mealId}`);
};
