import api from './api';

export interface PomodoroSession {
  id?: string;
  timerId: string;
  taskDescription: string;
  pomodoroCount: number;
  completedPomodoros: number;
  status: 'in_progress' | 'completed' | 'interrupted';
  startedAt: string;
  completedAt?: string;
  actualDuration?: number;
  note?: string;
}

export interface PomodoroStats {
  totalPomodoros: number;
  totalDuration: number;
  todayPomodoros: number;
  weekPomodoros: number;
  monthPomodoros: number;
  taskBreakdown: Array<{
    task: string;
    pomodoros: number;
    duration: number;
  }>;
}

export const pomodoroService = {
  // セッション作成
  createSession: (data: {
    timerId: string;
    taskDescription: string;
    pomodoroCount?: number;
  }) => api.post('/pomodoro/sessions', data),

  // セッション一覧取得
  getSessions: (params?: {
    timerId?: string;
    status?: string;
    limit?: number;
  }) => api.get('/pomodoro/sessions', { params }),

  // セッション詳細取得
  getSession: (sessionId: string) => api.get(`/pomodoro/sessions/${sessionId}`),

  // セッション更新
  updateSession: (sessionId: string, data: {
    status: string;
    completedPomodoros?: number;
    actualDuration?: number;
    note?: string;
  }) => api.put(`/pomodoro/sessions/${sessionId}`, data),

  // セッション削除
  deleteSession: (sessionId: string) => api.delete(`/pomodoro/sessions/${sessionId}`),

  // 統計取得
  getStats: (timerId?: string) =>
    api.get<{ data: PomodoroStats }>('/pomodoro/stats', {
      params: timerId ? { timerId } : undefined,
    }),

  // タイマーをポモドーロモードに設定
  enablePomodoroMode: (timerId: string) =>
    api.post(`/pomodoro/timers/${timerId}/pomodoro`),
};

export default pomodoroService;
