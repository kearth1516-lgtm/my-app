import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { timerService } from '../services';
import type { Timer } from '../types';
import CreateTimerModal from '../components/CreateTimerModal';
import ConfirmModal from '../components/ConfirmModal';
import TimerRunning from '../components/TimerRunning';
import './Timers.css';

function Timers() {
  const navigate = useNavigate();
  const [timers, setTimers] = useState<Timer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState<{ [key: string]: number }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; timerId: string | null; timerName: string }>({ 
    isOpen: false, 
    timerId: null, 
    timerName: '' 
  });

  useEffect(() => {
    loadTimers();
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (updated[id] > 0) {
            updated[id] -= 1;
          } else if (updated[id] === 0 && activeTimer === id) {
            // タイマー終了
            handleTimerComplete();
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, isPaused]);

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
      setIsPaused(false);
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

  const handlePauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const handleTimerComplete = () => {
    alert('⏰ タイマー終了！お疲れ様でした！');
    setActiveTimer(null);
    loadTimers();
  };

  const handleCreateTimer = async (timerData: { name: string; duration: number; imageUrl: string }) => {
    try {
      await timerService.create(timerData);
      await loadTimers();
    } catch (error) {
      console.error('タイマーの作成に失敗しました:', error);
      alert('タイマーの作成に失敗しました');
    }
  };

  const handleDeleteTimer = (timerId: string, timerName: string) => {
    setDeleteConfirm({ isOpen: true, timerId, timerName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.timerId) return;
    
    try {
      await timerService.delete(deleteConfirm.timerId);
      await loadTimers();
      setDeleteConfirm({ isOpen: false, timerId: null, timerName: '' });
    } catch (error) {
      console.error('タイマーの削除に失敗しました:', error);
      alert('タイマーの削除に失敗しました。実行中のタイマーは削除できません。');
      setDeleteConfirm({ isOpen: false, timerId: null, timerName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, timerId: null, timerName: '' });
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
      {activeTimer && (() => {
        const runningTimer = timers.find(t => t.id === activeTimer);
        return runningTimer ? (
          <TimerRunning
            timer={runningTimer}
            onPause={handlePauseTimer}
            onStop={() => handleStopTimer(activeTimer)}
            remainingSeconds={remainingTime[activeTimer] || 0}
          />
        ) : null;
      })()}

      <header className="timers-header">
        <h1>⏱️ タイマー</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          ＋ 新規作成
        </button>
      </header>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : timers.length === 0 ? (
        <div className="empty-state">
          <p>タイマーがありません</p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            最初のタイマーを作成
          </button>
        </div>
      ) : (
        <div className="timers-grid">
          {timers.map((timer) => (
            <div key={timer.id} className="timer-card">
              <button 
                className="delete-timer-btn"
                onClick={() => timer.id && handleDeleteTimer(timer.id, timer.name)}
                title="削除"
              >
                ×
              </button>
              {timer.imageUrl && (
                <div className="timer-image">
                  <img src={timer.imageUrl} alt={timer.name} />
                </div>
              )}
              <div className="timer-content">
                <h3 
                  onClick={() => timer.id && navigate(`/timers/${timer.id}`)}
                  style={{ cursor: 'pointer' }}
                  title="詳細を見る"
                >
                  {timer.name}
                </h3>
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

      <CreateTimerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTimer}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="タイマーを削除"
        message={`「${deleteConfirm.timerName}」を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDangerous={true}
      />
    </div>
  );
}

export default Timers;
