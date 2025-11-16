import { useState, useMemo } from 'react';
import type { TimerRecord } from '../types';
import './RecordsGraph.css';

interface RecordsGraphProps {
  records: TimerRecord[];
  allTags: string[];
  onDateClick?: (date: string, records: TimerRecord[]) => void;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface AggregatedData {
  label: string;
  date: Date;
  byTag: { [tag: string]: number }; // タグごとの時間
  total: number; // 合計時間
}

// タグごとの色を定義
const TAG_COLORS: { [key: string]: string } = {
  'タグなし': '#94a3b8',
  // 他のタグには動的に色を割り当て
};

function RecordsGraph({ records, allTags, onDateClick }: RecordsGraphProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [currentOffset, setCurrentOffset] = useState<number>(0); // 表示期間のオフセット

  // 現在の表示期間の開始日と終了日を計算
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const today = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    if (viewMode === 'daily') {
      // 日別: 現在の週を表示（月曜日から日曜日）
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(today);
      start.setDate(today.getDate() + diff + (currentOffset * 7));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      label = `${start.getMonth() + 1}月${start.getDate()}日 〜 ${end.getMonth() + 1}月${end.getDate()}日`;
    } else if (viewMode === 'weekly') {
      // 週別: 前後4週間ずつ（合計9週間）
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() + diff);
      
      start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - 28 + (currentOffset * 7 * 9));
      end = new Date(start);
      end.setDate(start.getDate() + 8 * 7 + 6);
      
      label = `${start.getMonth() + 1}月${start.getDate()}日 〜 ${end.getMonth() + 1}月${end.getDate()}日`;
    } else {
      // 月別: 前後6ヶ月（合計13ヶ月）
      start = new Date(today.getFullYear(), today.getMonth() - 6 + (currentOffset * 13), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 6 + (currentOffset * 13) + 1, 0);
      
      label = `${start.getFullYear()}年${start.getMonth() + 1}月 〜 ${end.getFullYear()}年${end.getMonth() + 1}月`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [viewMode, currentOffset]);

  // タグでフィルタリング + 期間でフィルタリング
  const filteredRecords = useMemo(() => {
    let filtered = selectedTag === 'all' ? records : records.filter(r => r.tag === selectedTag);
    
    // 期間でフィルタリング
    filtered = filtered.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
    
    return filtered;
  }, [records, selectedTag, startDate, endDate]);

  // 実際に使用されているタグを収集
  const usedTags = useMemo(() => {
    const tags = new Set<string>();
    filteredRecords.forEach(record => {
      tags.add(record.tag || 'タグなし');
    });
    return Array.from(tags).sort();
  }, [filteredRecords]);

  // タグごとに色を生成（タグ名に基づいて固定的に色を割り当て）
  const tagColors = useMemo(() => {
    const colors: { [key: string]: string } = { ...TAG_COLORS };
    const baseColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    
    // allTags と usedTags の両方を含むすべてのタグに色を割り当て
    const allTagsSet = new Set([...allTags, ...usedTags]);
    const sortedTags = Array.from(allTagsSet).sort(); // ソートして順序を固定
    
    sortedTags.forEach((tag, index) => {
      if (!colors[tag]) {
        // インデックスベースで色を割り当て（ソート済みなので順序が固定）
        colors[tag] = baseColors[index % baseColors.length];
      }
    });
    
    return colors;
  }, [allTags, usedTags]);

  // データの集計
  const aggregatedData = useMemo(() => {
    const dataMap = new Map<string, AggregatedData>();

    // 表示期間内の全ての日付/週/月を生成
    if (viewMode === 'daily') {
      // 日別: 7日分
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const key = currentDate.toISOString().split('T')[0];
        const label = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
        dataMap.set(key, {
          label,
          byTag: {},
          total: 0,
          date: new Date(key)
        });
      }
    } else if (viewMode === 'weekly') {
      // 週別: 9週分
      for (let i = 0; i < 9; i++) {
        const monday = new Date(startDate);
        monday.setDate(startDate.getDate() + (i * 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const key = monday.toISOString().split('T')[0];
        const label = `${monday.getMonth() + 1}/${monday.getDate()}-${sunday.getMonth() + 1}/${sunday.getDate()}`;
        dataMap.set(key, {
          label,
          byTag: {},
          total: 0,
          date: new Date(key)
        });
      }
    } else {
      // 月別: 13ヶ月分
      for (let i = 0; i < 13; i++) {
        const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        const label = `${month.getFullYear()}年${month.getMonth() + 1}月`;
        dataMap.set(key, {
          label,
          byTag: {},
          total: 0,
          date: month
        });
      }
    }

    // 実際のレコードデータを集計
    filteredRecords.forEach(record => {
      const date = new Date(record.date);
      let key: string;

      if (viewMode === 'daily') {
        key = record.date;
      } else if (viewMode === 'weekly') {
        const monday = new Date(date);
        const day = monday.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(monday.getDate() + diff);
        key = monday.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = dataMap.get(key);
      if (existing) {
        const tag = record.tag || 'タグなし';
        existing.byTag[tag] = (existing.byTag[tag] || 0) + record.duration;
        existing.total += record.duration;
      }
    });

    // 日付順にソート
    return Array.from(dataMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredRecords, viewMode, startDate]);

  // 最大値を取得（グラフの高さ調整用）
  const maxDuration = useMemo(() => {
    if (aggregatedData.length === 0) return 0;
    return Math.max(...aggregatedData.map(d => d.total));
  }, [aggregatedData]);

  // 時間のフォーマット
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // 詳細表示用のフォーマット
  const formatDetailedDuration = (seconds: number): string => {
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

  // 日付クリック時の処理
  const handleDateClick = (date: Date) => {
    if (!onDateClick) return;

    // その日付の記録を抽出
    const dateStr = date.toISOString().split('T')[0];
    const dateRecords = filteredRecords.filter(record => {
      if (viewMode === 'daily') {
        return record.date === dateStr;
      } else if (viewMode === 'weekly') {
        const recordDate = new Date(record.date);
        const monday = new Date(date);
        const sunday = new Date(date);
        sunday.setDate(monday.getDate() + 6);
        return recordDate >= monday && recordDate <= sunday;
      } else {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === date.getFullYear() && 
               recordDate.getMonth() === date.getMonth();
      }
    });

    onDateClick(dateStr, dateRecords);
  };

  if (records.length === 0) {
    return (
      <div className="records-graph-container">
        <div className="empty-graph">
          <p>📊 記録がありません</p>
          <p>タイマーを実行して記録を作成しましょう</p>
        </div>
      </div>
    );
  }

  return (
    <div className="records-graph-container">
      {/* コントロールパネル */}
      <div className="graph-controls">
        <div className="view-mode-selector">
          <button
            className={viewMode === 'daily' ? 'active' : ''}
            onClick={() => {
              setViewMode('daily');
              setCurrentOffset(0);
            }}
          >
            📅 日別
          </button>
          <button
            className={viewMode === 'weekly' ? 'active' : ''}
            onClick={() => {
              setViewMode('weekly');
              setCurrentOffset(0);
            }}
          >
            📆 週別
          </button>
          <button
            className={viewMode === 'monthly' ? 'active' : ''}
            onClick={() => {
              setViewMode('monthly');
              setCurrentOffset(0);
            }}
          >
            🗓️ 月別
          </button>
        </div>

        {allTags.length > 0 && (
          <div className="tag-filter">
            <label>タグ:</label>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="all">すべて</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 期間ナビゲーション */}
      <div className="period-navigation">
        <button 
          className="period-nav-btn"
          onClick={() => setCurrentOffset(currentOffset - 1)}
        >
          ← 前へ
        </button>
        <div className="period-label">{periodLabel}</div>
        <button 
          className="period-nav-btn"
          onClick={() => setCurrentOffset(currentOffset + 1)}
        >
          次へ →
        </button>
      </div>

      {/* グラフ */}
      {aggregatedData.length === 0 ? (
        <div className="no-data">
          <p>選択した条件に該当する記録がありません</p>
        </div>
      ) : (
        <>
          <div className="graph-wrapper">
            <div className="graph-bars">
              {aggregatedData.map((data, index) => {
                const heightPercent = maxDuration > 0 ? (data.total / maxDuration) * 100 : 0;
                
                // データが0の場合
                if (data.total === 0) {
                  return (
                    <div key={index} className="bar-item">
                      <div className="bar-wrapper">
                        <div className="bar-empty">
                          <span className="bar-value-empty">0m</span>
                        </div>
                      </div>
                      <div className="bar-label">{data.label}</div>
                    </div>
                  );
                }
                
                // すべてのタグを選択している場合は積み上げ棒グラフ
                if (selectedTag === 'all' && Object.keys(data.byTag).length > 1) {
                  return (
                    <div key={index} className="bar-item">
                      <div className="bar-wrapper">
                        <div 
                          className="bar-stacked"
                          style={{ height: `${heightPercent}%` }}
                          onClick={() => handleDateClick(data.date)}
                        >
                          {Object.entries(data.byTag)
                            .sort((a, b) => b[1] - a[1]) // 大きい順に並べる
                            .map(([tag, duration]) => {
                              const segmentPercent = (duration / data.total) * 100;
                              return (
                                <div
                                  key={tag}
                                  className="bar-segment"
                                  style={{
                                    height: `${segmentPercent}%`,
                                    backgroundColor: tagColors[tag] || '#94a3b8'
                                  }}
                                  title={`${tag}: ${formatDetailedDuration(duration)}`}
                                />
                              );
                            })
                          }
                          <span className="bar-value">{formatDuration(data.total)}</span>
                        </div>
                      </div>
                      <div className="bar-label">{data.label}</div>
                    </div>
                  );
                }
                
                // 単一タグの場合は通常の棒グラフ
                const actualTag = Object.keys(data.byTag)[0] || 'タグなし';
                const singleTag = selectedTag !== 'all' ? selectedTag : actualTag;
                
                return (
                  <div key={index} className="bar-item">
                    <div className="bar-wrapper">
                      <div 
                        className="bar"
                        style={{ 
                          height: `${heightPercent}%`,
                          backgroundColor: tagColors[singleTag] || tagColors['タグなし'] || '#94a3b8'
                        }}
                        title={`${singleTag}: ${formatDetailedDuration(data.total)}`}
                        onClick={() => handleDateClick(data.date)}
                      >
                        <span className="bar-value">{formatDuration(data.total)}</span>
                      </div>
                    </div>
                    <div className="bar-label">{data.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* タグの凡例（すべて選択時かつ複数タグがある場合のみ） */}
          {selectedTag === 'all' && usedTags.length > 1 && (
            <div className="tag-legend">
              {usedTags.map(tag => (
                <div key={tag} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: tagColors[tag] }}
                  />
                  <span className="legend-label">{tag}</span>
                </div>
              ))}
            </div>
          )}

          {/* 統計サマリー */}
          <div className="graph-summary">
            <div className="summary-item">
              <span className="summary-label">総時間:</span>
              <span className="summary-value">
                {formatDetailedDuration(filteredRecords.reduce((sum, r) => sum + r.duration, 0))}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">平均時間:</span>
              <span className="summary-value">
                {filteredRecords.length > 0
                  ? formatDetailedDuration(
                      Math.floor(filteredRecords.reduce((sum, r) => sum + r.duration, 0) / filteredRecords.length)
                    )
                  : '0秒'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RecordsGraph;

