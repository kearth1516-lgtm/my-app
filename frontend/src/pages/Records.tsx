import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordService, timerService } from '../services';
import type { TimerRecord, Timer } from '../types';
import RecordsGraph from '../components/RecordsGraph';
import ManualRecordModal from '../components/ManualRecordModal';
import RecordDetailModal from '../components/RecordDetailModal';
import './Records.css';

function Records() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'graph'>('graph');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [summary, setSummary] = useState<any>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateRecords, setSelectedDateRecords] = useState<TimerRecord[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedTag]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordsResponse, timersResponse, tagsResponse, summaryResponse] = await Promise.all([
        recordService.getAll({
          tag: selectedTag !== 'all' ? selectedTag : undefined
        }),
        timerService.getAll(),
        timerService.getAllTags(),
        recordService.getSummary({
          tag: selectedTag !== 'all' ? selectedTag : undefined
        })
      ]);
      
      setRecords(recordsResponse.data);
      setTimers(timersResponse.data);
      setAllTags(tagsResponse.data.tags || []);
      setSummary(summaryResponse.data);
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
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
    
    const totalSecs = records.reduce((sum, record) => sum + record.duration, 0);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    
    return `${hours}時間${minutes}分`;
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await recordService.delete(recordId);
      await loadData();
      // 詳細モーダルが開いている場合は、削除後に記録リストを更新
      if (isDetailModalOpen) {
        setSelectedDateRecords(prev => prev.filter(r => r.id !== recordId));
      }
    } catch (error) {
      console.error('記録の削除に失敗しました:', error);
      alert('記録の削除に失敗しました');
    }
  };

  const handleDateClick = (date: string, dateRecords: TimerRecord[]) => {
    setSelectedDate(date);
    setSelectedDateRecords(dateRecords);
    setIsDetailModalOpen(true);
  };

  const handleManualRecordSubmit = async (data: {
    timerId: string;
    timerName: string;
    duration: number;
    tag?: string;
    date: string;
  }) => {
    try {
      console.log('手動記録追加データ:', data); // デバッグログ
      await recordService.createManual(data);
      await loadData();
    } catch (error) {
      console.error('記録の追加に失敗しました:', error);
      alert('記録の追加に失敗しました');
    }
  };

  const handleAddTag = async (newTag: string) => {
    try {
      await timerService.addTag(newTag);
      // タグ一覧を再取得
      const response = await timerService.getAllTags();
      setAllTags(response.data.tags || []);
    } catch (error) {
      console.error('タグの追加に失敗しました:', error);
      alert('タグの追加に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="records-container">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="records-container">
      <header className="records-header-top">
        <h1>📊 記録</h1>
        <button className="btn-add-manual" onClick={() => setIsManualModalOpen(true)}>
          ＋ 手動で追加
        </button>
      </header>

      {/* フィルター */}
      {allTags.length > 0 && (
        <div className="records-filters">
          <div className="filter-group">
            <label>タグ:</label>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="all">すべて</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* サマリー */}
      <div className="records-summary-cards">
        <div className="summary-card">
          <div className="summary-label">総時間</div>
          <div className="summary-value">{getTotalDuration()}</div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="records-content">
        {/* タグ別統計 */}
        {summary && summary.byTag && summary.byTag.length > 0 && (
          <div className="stats-section">
            <h3>🏷️ タグ別統計</h3>
            <div className="stats-grid">
              {summary.byTag.map((stat: any) => (
                <div key={stat.tag} className="stat-item">
                  <div className="stat-name">{stat.tag}</div>
                  <div className="stat-details">
                    <span className="stat-duration">{formatDuration(stat.totalDuration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="records-tabs">
          <button
            className={activeTab === 'list' ? 'active' : ''}
            onClick={() => setActiveTab('list')}
          >
            📝 一覧
          </button>
          <button
            className={activeTab === 'graph' ? 'active' : ''}
            onClick={() => setActiveTab('graph')}
          >
            📈 グラフ
          </button>
        </div>
        
        {records.length === 0 ? (
          <div className="empty-records">
            <p>記録がありません</p>
            <p>タイマーを実行して記録を作成しましょう</p>
          </div>
        ) : activeTab === 'list' ? (
          <div className="records-list">
            {records.map((record) => (
              <div key={record.id} className="record-item">
                <div className="record-details">
                  <div className="record-timer-name">
                    <strong>{record.timerName}</strong>
                  </div>
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
                      {formatDuration(record.duration)}
                    </span>
                  </div>
                  {record.tag && (
                    <div className="record-tag">
                      <span className="tag-badge">{record.tag}</span>
                    </div>
                  )}
                </div>
                <button
                  className="delete-record-btn"
                  onClick={() => handleDeleteRecord(record.id)}
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <RecordsGraph 
            records={records} 
            allTags={allTags}
            onDateClick={handleDateClick}
          />
        )}
      </div>

      <nav className="bottom-nav">
        <button onClick={() => navigate('/timers')} className="nav-item">
          ⏱️ タイマー
        </button>
        <button onClick={() => navigate('/')} className="nav-item">
          🏠 ホーム
        </button>
      </nav>

      <ManualRecordModal
        isOpen={isManualModalOpen}
        stopwatchTimer={timers.find(t => t.type === 'stopwatch') || null}
        availableTags={allTags}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualRecordSubmit}
        onAddTag={handleAddTag}
      />

      <RecordDetailModal
        isOpen={isDetailModalOpen}
        date={selectedDate}
        records={selectedDateRecords}
        onClose={() => setIsDetailModalOpen(false)}
        onDelete={handleDeleteRecord}
      />
    </div>
  );
}

export default Records;
