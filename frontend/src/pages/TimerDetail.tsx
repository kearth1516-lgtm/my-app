import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { timerService } from '../services';
import type { Timer, TimerRecord } from '../types';
import './TimerDetail.css';

function TimerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timer, setTimer] = useState<Timer | null>(null);
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTimerData();
    }
  }, [id]);

  const loadTimerData = async () => {
    try {
      setLoading(true);
      const [timerResponse, recordsResponse] = await Promise.all([
        timerService.getAll(),
        id ? timerService.getRecords(id) : Promise.resolve({ data: [] })
      ]);
      
      const foundTimer = timerResponse.data.find(t => t.id === id);
      setTimer(foundTimer || null);
      setRecords(recordsResponse.data);
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: string, end: string): string => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;
    
    return `${hours}時間${minutes}分${seconds}秒`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalDuration = (): string => {
    if (records.length === 0) return '0時間0分';
    
    const totalMs = records.reduce((sum, record) => {
      const start = new Date(record.startTime);
      const end = new Date(record.endTime);
      return sum + (end.getTime() - start.getTime());
    }, 0);
    
    const totalSecs = Math.floor(totalMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    
    return `${hours}時間${minutes}分`;
  };

  if (loading) {
    return (
      <div className="timer-detail-container">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (!timer) {
    return (
      <div className="timer-detail-container">
        <div className="error">タイマーが見つかりません</div>
        <button onClick={() => navigate('/timers')}>戻る</button>
      </div>
    );
  }

  return (
    <div className="timer-detail-container">
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate('/timers')}>
          ← 戻る
        </button>
        <h1>{timer.name}</h1>
      </header>

      <div className="timer-info">
        {timer.imageUrl && (
          <div className="timer-hero-image">
            <img src={timer.imageUrl} alt={timer.name} />
          </div>
        )}
        
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-label">総記録数</div>
            <div className="stat-value">{records.length}回</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総時間</div>
            <div className="stat-value">{getTotalDuration()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">設定時間</div>
            <div className="stat-value">
              {Math.floor(timer.duration / 3600)}時間{Math.floor((timer.duration % 3600) / 60)}分
            </div>
          </div>
        </div>
      </div>

      <div className="records-section">
        <h2>⏱️ 記録一覧</h2>
        
        {records.length === 0 ? (
          <div className="empty-records">
            <p>まだ記録がありません</p>
            <p>タイマーを実行すると記録が保存されます</p>
          </div>
        ) : (
          <div className="records-list">
            {records.map((record, index) => (
              <div key={index} className="record-item">
                <div className="record-number">#{records.length - index}</div>
                <div className="record-details">
                  <div className="record-time">
                    <span className="record-label">開始:</span>
                    <span>{formatDate(record.startTime)}</span>
                  </div>
                  <div className="record-time">
                    <span className="record-label">終了:</span>
                    <span>{formatDate(record.endTime)}</span>
                  </div>
                  <div className="record-duration">
                    <span className="record-label">実行時間:</span>
                    <span className="duration-value">
                      {formatDuration(record.startTime, record.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <a href="/timers" className="nav-item">
          ⏱️ タイマー一覧
        </a>
        <a href="/" className="nav-item">
          🏠 ホーム
        </a>
      </nav>
    </div>
  );
}

export default TimerDetail;
