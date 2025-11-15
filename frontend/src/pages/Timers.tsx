import { useEffect, useState } from 'react';
import { timerService } from '../services';
import type { Timer } from '../types';
import './Timers.css';

function Timers() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadTimers();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (updated[id] > 0) {
            updated[id] -= 1;
          } else if (updated[id] === 0 && activeTimer === id) {
            // タイマー終了
            handleTimerComplete(id);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const loadTimers = async () => {
    try {
      setLoading(true);
      const response = await timerService.getAll();
      setTimers(response.data);
    } catch (error) {
      console.error('タイマーの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async (timer: Timer) => {
    try {
      if (timer.id) {
        await timerService.start(timer.id);
        setActiveTimer(timer.id);
        setRemainingTime((prev) => ({ ...prev, [timer.id!]: timer.duration }));
      }
    } catch (error) {
      console.error('タイマーの開始に失敗しました:', error);
    }
  };

  const handleStopTimer = async (timerId: string) => {
    try {
      await timerService.stop(timerId);
      setActiveTimer(null);
      setRemainingTime((prev) => {
        const updated = { ...prev };
        delete updated[timerId];
        return updated;
      });
      loadTimers(); // 記録を更新
    } catch (error) {
      console.error('タイマーの停止に失敗しました:', error);
    }
  };

  const handleTimerComplete = (timerId: string) => {
    alert('⏰ タイマー終了！お疲れ様でした！');
    setActiveTimer(null);
    loadTimers();
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timers-container">
      <header className="timers-header">
        <h1>⏱️ タイマー</h1>
        <button className="btn-primary" onClick={() => alert('タイマー作成機能は準備中です')}>
          ＋ 新規作成
        </button>
      </header>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : timers.length === 0 ? (
        <div className="empty-state">
          <p>タイマーがありません</p>
          <button className="btn-primary" onClick={() => alert('タイマー作成機能は準備中です')}>
            最初のタイマーを作成
          </button>
        </div>
      ) : (
        <div className="timers-grid">
          {timers.map((timer) => (
            <div key={timer.id} className="timer-card">
              {timer.imageUrl && (
                <div className="timer-image">
                  <img src={timer.imageUrl} alt={timer.name} />
                </div>
              )}
              <div className="timer-content">
                <h3>{timer.name}</h3>
                <div className="timer-display">
                  {activeTimer === timer.id && timer.id
                    ? formatTime(remainingTime[timer.id] || 0)
                    : formatTime(timer.duration)}
                </div>
                <div className="timer-actions">
                  {activeTimer === timer.id ? (
                    <button
                      className="btn-stop"
                      onClick={() => timer.id && handleStopTimer(timer.id)}
                    >
                      停止
                    </button>
                  ) : (
                    <button className="btn-start" onClick={() => handleStartTimer(timer)}>
                      開始
                    </button>
                  )}
                </div>
                <div className="timer-stats">
                  <span>記録: {timer.records.length}回</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <nav className="bottom-nav">
        <a href="/" className="nav-item">
          🏠 ホーム
        </a>
      </nav>
    </div>
  );
}

export default Timers;
