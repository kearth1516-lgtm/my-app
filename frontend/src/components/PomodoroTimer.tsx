import { useState, useEffect, useRef } from 'react';
import { pomodoroService } from '../services/pomodoro';
import type { PomodoroSession } from '../services/pomodoro';
import './PomodoroTimer.css';

interface PomodoroTimerProps {
  timerId: string;
  timerName: string;
  onClose: () => void;
}

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

function PomodoroTimer({ timerId, timerName, onClose }: PomodoroTimerProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<PomodoroPhase>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const WORK_DURATION = 25 * 60;
  const SHORT_BREAK = 5 * 60;
  const LONG_BREAK = 15 * 60;
  const POMODOROS_UNTIL_LONG_BREAK = 4;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startPomodoro = async () => {
    if (!taskDescription.trim()) {
      alert('作業内容を入力してください');
      return;
    }

    try {
      const response = await pomodoroService.createSession({
        timerId,
        taskDescription,
        pomodoroCount: POMODOROS_UNTIL_LONG_BREAK,
      });
      setCurrentSession(response.data.data);
      setIsRunning(true);
      startTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start pomodoro:', error);
      alert('ポモドーロの開始に失敗しました');
    }
  };

  const handlePhaseComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 音を鳴らす
    playNotificationSound();

    if (phase === 'work') {
      const newCompletedPomodoros = completedPomodoros + 1;
      setCompletedPomodoros(newCompletedPomodoros);

      // 休憩フェーズへ
      if (newCompletedPomodoros % POMODOROS_UNTIL_LONG_BREAK === 0) {
        setPhase('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setPhase('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }

      // セッション更新
      if (currentSession) {
        updateSession(newCompletedPomodoros);
      }
    } else {
      // 休憩終了、次の作業フェーズへ
      setPhase('work');
      setTimeLeft(WORK_DURATION);
    }

    setIsRunning(false);
  };

  const updateSession = async (pomodoros: number) => {
    if (!currentSession) return;

    try {
      const actualDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await pomodoroService.updateSession(currentSession.id!, {
        status: pomodoros >= POMODOROS_UNTIL_LONG_BREAK ? 'completed' : 'in_progress',
        completedPomodoros: pomodoros,
        actualDuration,
      });
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const pausePomodoro = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
  };

  const resumePomodoro = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now();
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handlePhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipPhase = () => {
    handlePhaseComplete();
  };

  const reset = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 現在のセッションを中断として記録
    if (currentSession) {
      try {
        const actualDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        await pomodoroService.updateSession(currentSession.id!, {
          status: 'interrupted',
          completedPomodoros,
          actualDuration,
        });
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }

    setIsRunning(false);
    setPhase('work');
    setCompletedPomodoros(0);
    setTimeLeft(WORK_DURATION);
    setCurrentSession(null);
    setTaskDescription('');
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {
      // Fallback: ブラウザ通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ポモドーロタイマー', {
          body: phase === 'work' ? '作業時間が終了しました！休憩しましょう。' : '休憩時間が終了しました！次の作業を始めましょう。',
        });
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'work':
        return '🍅 作業時間';
      case 'shortBreak':
        return '☕ 短い休憩';
      case 'longBreak':
        return '🌴 長い休憩';
    }
  };

  return (
    <div className="pomodoro-timer-overlay" onClick={onClose}>
      <div className="pomodoro-timer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pomodoro-header">
          <h2>🍅 ポモドーロタイマー</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="pomodoro-content">
          <div className="timer-info">
            <h3>{timerName}</h3>
            <div className="phase-indicator">{getPhaseLabel()}</div>
            <div className="pomodoro-count">
              {Array.from({ length: POMODOROS_UNTIL_LONG_BREAK }).map((_, i) => (
                <span key={i} className={`pomodoro-dot ${i < completedPomodoros ? 'completed' : ''}`}>
                  🍅
                </span>
              ))}
            </div>
          </div>

          {!currentSession ? (
            <div className="task-input-section">
              <label>今回の作業内容:</label>
              <input
                type="text"
                placeholder="例: レポート作成、プログラミング学習"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && startPomodoro()}
              />
              <button className="start-button" onClick={startPomodoro}>
                開始
              </button>
            </div>
          ) : (
            <>
              <div className="timer-display">{formatTime(timeLeft)}</div>
              
              <div className="timer-controls">
                {!isRunning ? (
                  <button className="control-button resume" onClick={resumePomodoro}>
                    ▶ 再開
                  </button>
                ) : (
                  <button className="control-button pause" onClick={pausePomodoro}>
                    ⏸ 一時停止
                  </button>
                )}
                <button className="control-button skip" onClick={skipPhase}>
                  ⏭ スキップ
                </button>
                <button className="control-button reset" onClick={reset}>
                  🔄 リセット
                </button>
              </div>

              <div className="session-info">
                <p><strong>作業内容:</strong> {currentSession.taskDescription}</p>
                <p><strong>完了ポモドーロ:</strong> {completedPomodoros} / {POMODOROS_UNTIL_LONG_BREAK}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PomodoroTimer;
