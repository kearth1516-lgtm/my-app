// 共通型定義

export interface Recipe {
  id?: string;
  name: string;
  ingredients: string[];
  cookingTime: number;
  source?: string;
  tags: string[];
  isFavorite: boolean;
  timesCooked: number;
}

export interface Timer {
  id?: string;
  name: string;
  duration: number;
  imageUrl?: string;
  records: TimerRecord[];
  type?: 'countdown' | 'stopwatch'; // カウントダウンまたはストップウォッチ
}

export interface TimerRecord {
  startTime: string;
  endTime: string;
}

export interface FashionItem {
  id?: string;
  imageUrl: string;
  category: string;
  color: string;
}

export interface DailyOutfit {
  id?: string;
  date: string;
  items: string[];
  weather?: string;
}

export interface HomeImage {
  id?: string;
  imageUrl: string;
  caption?: string;
}

export interface User {
  id: string;
  email: string;
}
