import api from './api';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RecurringSettings {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
}

export interface Todo {
  id?: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  category?: string;
  tags: string[];
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  subtasks: Subtask[];
  recurring?: RecurringSettings;
}

export const todoService = {
  // 一覧取得
  getAll: (params?: {
    priority?: string;
    category?: string;
    tag?: string;
    completed?: boolean;
    limit?: number;
  }) => api.get<{ data: Todo[] }>('/todos', { params }),

  // 詳細取得
  getById: (id: string) => api.get<{ data: Todo }>(`/todos/${id}`),

  // 新規作成
  create: (data: Omit<Todo, 'id' | 'completed' | 'completedAt' | 'createdAt'>) =>
    api.post<{ data: Todo }>('/todos', data),

  // 更新
  update: (id: string, data: Partial<Todo>) =>
    api.put<{ data: Todo }>(`/todos/${id}`, data),

  // 削除
  delete: (id: string) => api.delete(`/todos/${id}`),

  // 完了マーク
  complete: (id: string) => api.post<{ data: Todo }>(`/todos/${id}/complete`),

  // 繰り返しタスク生成
  generateRecurring: () => api.post('/todos/recurring/generate'),

  // カテゴリ一覧取得
  getCategories: () => api.get<{ data: string[] }>('/todos/categories'),

  // タグ一覧取得
  getTags: () => api.get<{ data: string[] }>('/todos/tags'),
};

export default todoService;
