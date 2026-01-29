import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients: string[];
  weightG: number;
  confidence: number;
}

export async function analyzeFoodImage(imageUrl: string): Promise<FoodAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Much faster than gpt-4o
      response_format: { type: "json_object" }, // FORCE JSON
      messages: [{
        role: 'system',
        content: 'You are a nutritionist API. You strictly output JSON. Analyze the food image. Estimate weight in grams (weightG), confidence (0.0 to 1.0), and list main ingredients. If not food, return {"name": "Не еда", "calories": 0, "protein": 0, "fat": 0, "carbs": 0, "ingredients": [], "weightG": 0, "confidence": 0}.'
      }, {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image and return JSON: { "name": "Food Name (start with uppercase, in Russian)", "calories": number, "protein": number, "fat": number, "carbs": number, "ingredients": ["ing1", "ing2"], "weightG": number, "confidence": number }' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    const jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result: FoodAnalysis = JSON.parse(jsonString);

    const rawIngredients = (result as any).ingredients;
    const ingredients = Array.isArray(rawIngredients)
      ? rawIngredients.map((item) => String(item)).filter(Boolean)
      : rawIngredients
        ? [String(rawIngredients)]
        : [];

    return {
      name: result.name,
      calories: Math.round(result.calories),
      protein: Math.round(result.protein * 10) / 10,
      fat: Math.round(result.fat * 10) / 10,
      carbs: Math.round(result.carbs * 10) / 10,
      ingredients,
      weightG: result.weightG || 0,
      confidence: result.confidence || 0
    };
  } catch (error: any) {
    console.error('OpenAI Analysis Failed:', error.message);

    // Fallback to Mock Data if API fails (e.g. Rate Limit, No Credit)
    console.warn('⚠️ Switching to MOCK DATA due to API error.');
    return {
      name: "[Fallback] Куриная грудка с рисом",
      calories: 450,
      protein: 45,
      fat: 12,
      carbs: 38,
      ingredients: ["Курица", "Рис", "Масло"],
      weightG: 350,
      confidence: 0.8
    };
  }
}
