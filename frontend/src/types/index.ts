// 共通型定義

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  steps: string[];
  cookingTime?: number; // 分単位、オプショナル
  source?: string;
  tags: string[];
  isFavorite: boolean;
  timesCooked: number;
  createdAt: string;
}

export interface Timer {
  id?: string;
  name: string;
  duration: number;
  image?: string;
  type?: 'countdown' | 'stopwatch'; // カウントダウンまたはストップウォッチ
  order?: number;
  isFavorite?: boolean;
}

export interface TimerRecord {
  id: string;
  timerId: string;
  timerName: string;
  startTime: string;
  endTime: string;
  duration: number; // 秒単位
  tag?: string; // タグ（英語、数学、筋トレなど）
  date: string; // YYYY-MM-DD形式
  stamp?: string; // スタンプ（絵文字）
  comment?: string; // コメント・メモ
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
