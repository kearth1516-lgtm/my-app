import api from './api';
import type { Recipe, Timer, FashionItem, DailyOutfit, HomeImage, TimerRecord } from '../types';

// レシピAPI
export const recipeService = {
  getAll: (params?: { favorite?: boolean; tag?: string; search?: string }) => api.get('/recipes', { params }),
  getById: (id: string) => api.get(`/recipes/${id}`),
  create: (data: { name: string; ingredients: string[]; steps: string[]; cookingTime?: number; source?: string; tags: string[]; isFavorite?: boolean }) => api.post('/recipes', data),
  update: (id: string, data: { name?: string; ingredients?: string[]; steps?: string[]; cookingTime?: number; source?: string; tags?: string[]; isFavorite?: boolean }) => api.put(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  toggleFavorite: (id: string, isFavorite: boolean) => api.patch(`/recipes/${id}/favorite`, null, { params: { is_favorite: isFavorite } }),
  recordCooking: (id: string) => api.post(`/recipes/${id}/cook`),
  importFromUrl: (url: string) => api.post('/recipes/import', null, { params: { url } }),
  suggestByIngredients: (ingredients: string[]) => api.post('/recipes/suggest', { ingredients }),
  getRecommendations: (limit?: number, tag?: string, ingredient?: string) => api.get('/recipes/recommend', { params: { limit, tag, ingredient } }),
  rebuildIndex: () => api.post('/recipes/embeddings/rebuild'),
};

// タイマーAPI
export const timerService = {
  getAll: () => api.get<Timer[]>('/timers'),
  create: (data: { name: string; duration: number; image: string; type?: 'countdown' | 'stopwatch' }) => api.post<Timer>('/timers', data),
  update: (id: string, updates: { name?: string; duration?: number; image?: string }) => api.put<Timer>(`/timers/${id}`, updates),
  start: (id: string) => api.post(`/timers/${id}/start`),
  stop: (id: string, tag?: string, stamp?: string, comment?: string) => api.post(`/timers/${id}/stop`, null, { params: { tag, stamp, comment } }),
  delete: (id: string) => api.delete(`/timers/${id}`),
  getRecords: (id: string) => api.get(`/timers/${id}/records`),
  getAllTags: () => api.get<{ tags: string[] }>('/timers/tags/all'),
  addTag: (tag: string) => api.post('/timers/tags', null, { params: { tag } }),
  reorder: (timerIds: string[]) => api.post('/timers/reorder', { timerIds }),
  toggleFavorite: (id: string) => api.put<Timer>(`/timers/${id}/favorite`),
};

// ファッションAPI
export const fashionService = {
  getItems: () => api.get<FashionItem[]>('/fashion/items'),
  createItem: (data: FashionItem) => api.post<FashionItem>('/fashion/items', data),
  getOutfits: () => api.get<DailyOutfit[]>('/fashion/outfits'),
  createOutfit: (data: DailyOutfit) => api.post<DailyOutfit>('/fashion/outfits', data),
};

// ホームAPI
export const homeService = {
  getRandomImage: () => api.get<HomeImage>('/home/images'),
  uploadImage: (data: HomeImage) => api.post<HomeImage>('/home/images', data),
};

// 認証API
export const authService = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password }),
};

// 設定API
export const settingsService = {
  get: () => api.get<{ theme: string; soundEnabled?: boolean; soundVolume?: number; soundType?: string; openaiApiKey?: string }>('/settings'),
  update: (settings: { theme?: string; soundEnabled?: boolean; soundVolume?: number; soundType?: string; openaiApiKey?: string }) => api.put('/settings', settings),
};

// 記録API
export const recordService = {
  getAll: (params?: { timerId?: string; tag?: string; startDate?: string; endDate?: string }) => 
    api.get<TimerRecord[]>('/records', { params }),
  getById: (id: string) => api.get<TimerRecord>(`/records/${id}`),
  create: (record: Omit<TimerRecord, 'id'>) => api.post<TimerRecord>('/records', record),
  createManual: (data: { timerId: string; timerName: string; duration: number; date: string; tag?: string; stamp?: string; comment?: string }) =>
    api.post<TimerRecord>('/records/manual', data),
  update: (id: string, updates: { duration?: number; date?: string; tag?: string; stamp?: string; comment?: string }) =>
    api.put<TimerRecord>(`/records/${id}`, updates),
  delete: (id: string) => api.delete(`/records/${id}`),
  getSummary: (params?: { timerId?: string; tag?: string }) =>
    api.get('/records/stats/summary', { params }),
};
