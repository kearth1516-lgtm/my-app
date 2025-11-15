import api from './api';
import type { Recipe, Timer, FashionItem, DailyOutfit, HomeImage } from '../types';

// レシピAPI
export const recipeService = {
  getAll: () => api.get<Recipe[]>('/recipes'),
  getById: (id: string) => api.get<Recipe>(`/recipes/${id}`),
  create: (data: Recipe) => api.post<Recipe>('/recipes', data),
  update: (id: string, data: Recipe) => api.put<Recipe>(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  recordCooking: (id: string) => api.post(`/recipes/${id}/cook`),
};

// タイマーAPI
export const timerService = {
  getAll: () => api.get<Timer[]>('/timers'),
  create: (data: { name: string; duration: number; imageUrl: string }) => api.post<Timer>('/timers', data),
  start: (id: string) => api.post(`/timers/${id}/start`),
  stop: (id: string) => api.post(`/timers/${id}/stop`),
  delete: (id: string) => api.delete(`/timers/${id}`),
  getRecords: (id: string) => api.get(`/timers/${id}/records`),
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
