import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { timerService } from '../services';
import type { Timer } from '../types';
import CreateTimerModal from '../components/CreateTimerModal';
import EditTimerModal from '../components/EditTimerModal';
import ConfirmModal from '../components/ConfirmModal';
import TimerRunning from '../components/TimerRunning';
import SaveRecordModal from '../components/SaveRecordModal';
import './Timers.css';

function Timers() {
  const navigate = useNavigate();
  const [timers, setTimers] = useState<Timer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState<{ [key: string]: number }>({});
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [saveRecordModal, setSaveRecordModal] = useState<{
    isOpen: boolean;
    timerId: string | null;
    timerName: string;
    duration: number;
  }>({ isOpen: false, timerId: null, timerName: '', duration: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; timerId: string | null; timerName: string }>({ 
    isOpen: false, 
    timerId: null, 
    timerName: '' 
  });
  const [editTimer, setEditTimer] = useState<Timer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadTimers();
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          const timer = timers.find(t => t.id === id);
          if (!timer) return;

          if (timer.type === 'stopwatch') {
            // ストップウォッチはカウントアップ
            updated[id] += 1;
          } else {
            // カウントダウン
            if (updated[id] > 0) {
              updated[id] -= 1;
            } else if (updated[id] === 0 && activeTimer === id) {
              // タイマー終了
              handleTimerComplete();
            }
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, isPaused, timers]);

  const loadTimers = async () => {
    try {
      setLoading(true);
      const [timersResponse, tagsResponse] = await Promise.all([
        timerService.getAll(),
        timerService.getAllTags()
      ]);
      setTimers(timersResponse.data);
      setAvailableTags(tagsResponse.data.tags);
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
        // ストップウォッチは0から、カウントダウンは設定時間から
        const initialTime = timer.type === 'stopwatch' ? 0 : timer.duration;
        setRemainingTime((prev) => ({ ...prev, [timer.id!]: initialTime }));
      }
    } catch (error) {
      console.error('タイマーの開始に失敗しました:', error);
    }
  };

  const handleStopTimer = async (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;

    const duration = timer.type === 'stopwatch' 
      ? remainingTime[timerId] || 0
      : timer.duration - (remainingTime[timerId] || 0);

    setSaveRecordModal({
      isOpen: true,
      timerId,
      timerName: timer.name,
      duration
    });
  };

  const handlePauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const handleTimerComplete = () => {
    alert('⏰ タイマー終了！お疲れ様でした！');
    setActiveTimer(null);
    loadTimers();
  };

  const handleCreateTimer = async (timerData: { name: string; duration: number; image: string; type: 'countdown' | 'stopwatch' }) => {
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

  const handleSaveRecord = async (tag?: string) => {
    if (!saveRecordModal.timerId) return;
    
    try {
      await timerService.stop(saveRecordModal.timerId, tag);
      
      setActiveTimer(null);
      setIsPaused(false);
      setRemainingTime((prev) => {
        const updated = { ...prev };
        delete updated[saveRecordModal.timerId!];
        return updated;
      });
      
      setSaveRecordModal({ isOpen: false, timerId: null, timerName: '', duration: 0 });
      loadTimers();
    } catch (error) {
      console.error('記録の保存に失敗しました:', error);
      alert('記録の保存に失敗しました');
    }
  };

  const handleCancelRecord = async () => {
    if (!saveRecordModal.timerId) return;
    
    try {
      await timerService.stop(saveRecordModal.timerId);
      
      setActiveTimer(null);
      setIsPaused(false);
      setRemainingTime((prev) => {
        const updated = { ...prev };
        delete updated[saveRecordModal.timerId!];
        return updated;
      });
      
      setSaveRecordModal({ isOpen: false, timerId: null, timerName: '', duration: 0 });
      loadTimers();
    } catch (error) {
      console.error('タイマーの停止に失敗しました:', error);
      alert('タイマーの停止に失敗しました');
    }
  };

  const handleAddTag = async (newTag: string) => {
    try {
      await timerService.addTag(newTag);
      const response = await timerService.getAllTags();
      setAvailableTags(response.data.tags);
    } catch (error) {
      console.error('タグの追加に失敗しました:', error);
      alert('タグの追加に失敗しました');
    }
  };

  const handleEditTimer = (timer: Timer) => {
    setEditTimer(timer);
    setIsEditModalOpen(true);
  };

  const handleUpdateTimer = async (timerId: string, updates: { name?: string; duration?: number; image?: string }) => {
    try {
      await timerService.update(timerId, updates);
      await loadTimers();
      setIsEditModalOpen(false);
      setEditTimer(null);
    } catch (error) {
      console.error('タイマーの更新に失敗しました:', error);
      alert('タイマーの更新に失敗しました');
    }
  };

  const handleToggleFavorite = async (timerId: string) => {
    try {
      await timerService.toggleFavorite(timerId);
      await loadTimers();
    } catch (error) {
      console.error('お気に入りの切り替えに失敗しました:', error);
      alert('お気に入りの切り替えに失敗しました');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const allItems = Array.from(timers);
    const [reorderedItem] = allItems.splice(result.source.index, 1);
    allItems.splice(result.destination.index, 0, reorderedItem);

    setTimers(allItems);

    try {
      const timerIds = allItems.map(timer => timer.id!).filter(Boolean);
      await timerService.reorder(timerIds);
    } catch (error) {
      console.error('並び順の保存に失敗しました:', error);
      await loadTimers();
    }
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
        <div className="header-actions">
          <button 
            className={`btn-filter ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title={showFavoritesOnly ? 'すべて表示' : 'お気に入りのみ表示'}
          >
            {showFavoritesOnly ? '⭐ お気に入りのみ' : '☆ すべて'}
          </button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            ＋ 新規作成
          </button>
        </div>
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
      ) : (() => {
        const displayedTimers = showFavoritesOnly 
          ? timers.filter(timer => timer.isFavorite)
          : timers;

        if (displayedTimers.length === 0) {
          return (
            <div className="empty-state">
              <p>お気に入りのタイマーがありません</p>
            </div>
          );
        }

        // フィルター表示時はドラッグ&ドロップ無効
        if (showFavoritesOnly) {
          return (
            <div className="timers-grid">
              {displayedTimers.map((timer) => (
                <div key={timer.id} className="timer-card">
                  <div className="timer-card-header">
                    <button
                      className="favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        timer.id && handleToggleFavorite(timer.id);
                      }}
                      title={timer.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
                    >
                      {timer.isFavorite ? '⭐' : '☆'}
                    </button>
                    {timer.type !== 'stopwatch' && (
                      <button 
                        className="delete-timer-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          timer.id && handleDeleteTimer(timer.id, timer.name);
                        }}
                        title="削除"
                      >
                        ×
                      </button>
                    )}
                    <button
                      className="edit-timer-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTimer(timer);
                      }}
                      title="編集"
                    >
                      ✏️
                    </button>
                  </div>
                  {timer.image && (
                    <div className="timer-image">
                      <img src={timer.image} alt={timer.name} />
                    </div>
                  )}
                  <div className="timer-content">
                    <div className="timer-header">
                      <h3 
                        onClick={() => timer.id && navigate(`/timers/${timer.id}`)}
                        style={{ cursor: 'pointer' }}
                        title="詳細を見る"
                      >
                        {timer.name}
                      </h3>
                    </div>
                    <div className="timer-display">
                      {activeTimer === timer.id && timer.id
                        ? formatTime(remainingTime[timer.id] || 0)
                        : timer.type === 'stopwatch' ? '00:00:00' : formatTime(timer.duration)}
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
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // 全表示時のみドラッグ&ドロップ有効
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="timers" direction="horizontal">
              {(provided) => (
                <div 
                  className="timers-grid"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {displayedTimers.map((timer, index) => (
                    <Draggable key={timer.id} draggableId={timer.id!} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`timer-card ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div className="timer-card-header">
                            <button
                              className="favorite-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                timer.id && handleToggleFavorite(timer.id);
                              }}
                              title={timer.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
                            >
                              {timer.isFavorite ? '⭐' : '☆'}
                            </button>
                            <div className="drag-handle" {...provided.dragHandleProps}>
                              ⋮⋮
                            </div>
                            {timer.type !== 'stopwatch' && (
                              <button 
                                className="delete-timer-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  timer.id && handleDeleteTimer(timer.id, timer.name);
                                }}
                                title="削除"
                              >
                                ×
                              </button>
                            )}
                            <button
                              className="edit-timer-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTimer(timer);
                              }}
                              title="編集"
                            >
                              ✏️
                            </button>
                          </div>
              {timer.image && (
                <div className="timer-image">
                  <img src={timer.image} alt={timer.name} />
                </div>
              )}
              <div className="timer-content">
                <div className="timer-header">
                  <h3 
                    onClick={() => timer.id && navigate(`/timers/${timer.id}`)}
                    style={{ cursor: 'pointer' }}
                    title="詳細を見る"
                  >
                    {timer.name}
                  </h3>
                </div>
                <div className="timer-display">
                  {activeTimer === timer.id && timer.id
                    ? formatTime(remainingTime[timer.id] || 0)
                    : timer.type === 'stopwatch' ? '00:00:00' : formatTime(timer.duration)}
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
              </div>
                        </div>
                      )}
                    </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  })()}

      <nav className="bottom-nav">
        <a href="/" className="nav-item">
          🏠 ホーム
        </a>
        <a href="/records" className="nav-item">
          📊 記録
        </a>
      </nav>

      <CreateTimerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTimer}
      />

      {editTimer && (
        <EditTimerModal
          isOpen={isEditModalOpen}
          timer={editTimer}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditTimer(null);
          }}
          onSubmit={handleUpdateTimer}
        />
      )}

      <SaveRecordModal
        isOpen={saveRecordModal.isOpen}
        timerName={saveRecordModal.timerName}
        duration={saveRecordModal.duration}
        availableTags={availableTags}
        onSave={handleSaveRecord}
        onCancel={handleCancelRecord}
        onAddTag={handleAddTag}
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
