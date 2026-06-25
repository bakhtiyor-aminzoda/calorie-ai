export type Gender = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type GoalType = 'LOSS' | 'MAINTAIN' | 'GAIN';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export const calculateBMR = (gender: Gender, weightKg: number, heightCm: number, age: number): number => {
  if (gender === 'MALE') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
};

export const calculateTDEE = (bmr: number, activity: ActivityLevel): number => {
  return bmr * ACTIVITY_FACTORS[activity];
};

export const calculateTargetCalories = (
  tdee: number,
  goal: GoalType,
  bmi: number | null
): number => {
  let target = tdee;
  
  if (goal === 'LOSS') {
    // If BMI is available, use it to adjust deficit aggressiveness
    if (bmi) {
      if (bmi >= 30) target *= 0.75;      // Aggressive deficit for obese
      else if (bmi >= 25) target *= 0.8;  // Moderate deficit for overweight
      else target *= 0.85;                // Standard deficit
    } else {
      target *= 0.85; // Fallback
    }
  } else if (goal === 'GAIN') {
    target *= 1.1; // 10% surplus
  }
  // MAINTAIN uses TDEE as is

  const minCalories = 1200; // Safety floor (could be gender specific but 1200 is generally safe min)
  return Math.max(minCalories, Math.round(target / 10) * 10);
};

export const calculateBMI = (weightKg: number, heightCm: number): number | null => {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
};
