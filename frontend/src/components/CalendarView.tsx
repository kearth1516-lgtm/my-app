import { useMemo, useState } from 'react';
import type { TimerRecord } from '../types';
import './CalendarView.css';

interface CalendarViewProps {
  records: TimerRecord[];
  onDateClick: (date: string, dateRecords: TimerRecord[]) => void;
}

function CalendarView({ records, onDateClick }: CalendarViewProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // 日付ごとの記録をマップ化
  const recordsByDate = useMemo(() => {
    const map = new Map<string, TimerRecord[]>();
    
    records.forEach(record => {
      const dateRecords = map.get(record.date) || [];
      dateRecords.push(record);
      map.set(record.date, dateRecords);
    });
    
    return map;
  }, [records]);

  // カレンダーの日付配列を生成
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0: 日曜日

    const days: (Date | null)[] = [];
    
    // 月初の空白を追加
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // 日付を追加
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }
    
    return days;
  }, [currentYear, currentMonth]);

  // 日付の総時間を計算
  const getTotalDuration = (date: Date): number => {
    const dateStr = formatDateKey(date);
    const dateRecords = recordsByDate.get(dateStr);
    if (!dateRecords) return 0;
    
    return dateRecords.reduce((sum, record) => sum + record.duration, 0);
  };

  // 日付の記録数を取得
  const getRecordCount = (date: Date): number => {
    const dateStr = formatDateKey(date);
    const dateRecords = recordsByDate.get(dateStr);
    return dateRecords ? dateRecords.length : 0;
  };

  // 前月へ
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // 次月へ
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // 今月へ
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // 日付クリック
  const handleDateClick = (date: Date) => {
    const dateStr = formatDateKey(date);
    const dateRecords = recordsByDate.get(dateStr);
    if (dateRecords && dateRecords.length > 0) {
      onDateClick(dateStr, dateRecords);
    }
  };

  // 今日かどうか
  const isToday = (date: Date): boolean => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 時間をフォーマット
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={goToPreviousMonth}>
          ◀
        </button>
        <div className="calendar-title">
          <h2>{currentYear}年 {currentMonth + 1}月</h2>
          <button className="today-btn" onClick={goToToday}>
            今日
          </button>
        </div>
        <button className="calendar-nav-btn" onClick={goToNextMonth}>
          ▶
        </button>
      </div>

      <div className="calendar-grid">
        {/* 曜日ヘッダー */}
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* 日付セル */}
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-day empty" />;
          }

          const totalDuration = getTotalDuration(date);
          const recordCount = getRecordCount(date);
          const hasRecords = recordCount > 0;
          const isTodayDate = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`calendar-day ${hasRecords ? 'has-records' : ''} ${isTodayDate ? 'today' : ''}`}
              onClick={() => hasRecords && handleDateClick(date)}
            >
              <div className="day-number">{date.getDate()}</div>
              {hasRecords && (
                <div className="day-info">
                  <div className="record-count">{recordCount}件</div>
                  <div className="total-duration">{formatDuration(totalDuration)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color today-marker" />
          <span>今日</span>
        </div>
        <div className="legend-item">
          <div className="legend-color has-records-marker" />
          <span>記録あり</span>
        </div>
      </div>
    </div>
  );
}

// ヘルパー関数
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default CalendarView;
