import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { TimerRecord } from '../types';
import './ReportsView.css';

interface ReportsViewProps {
  records: TimerRecord[];
}

type PeriodType = 'week' | 'month';

function ReportsView({ records }: ReportsViewProps) {
  const [period, setPeriod] = useState<PeriodType>('week');

  // 週別データの集計
  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, { week: string; totalHours: number; byTimer: Map<string, number>; byTag: Map<string, number> }>();
    
    records.forEach(record => {
      const date = new Date(record.date);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week: formatWeekRange(weekStart),
          totalHours: 0,
          byTimer: new Map(),
          byTag: new Map()
        });
      }
      
      const weekData = weekMap.get(weekKey)!;
      const hours = record.duration / 3600;
      weekData.totalHours += hours;
      
      // タイマー別集計
      const timerHours = weekData.byTimer.get(record.timerName) || 0;
      weekData.byTimer.set(record.timerName, timerHours + hours);
      
      // タグ別集計
      const tag = record.tag || 'タグなし';
      const tagHours = weekData.byTag.get(tag) || 0;
      weekData.byTag.set(tag, tagHours + hours);
    });
    
    return Array.from(weekMap.values())
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 8); // 直近8週間
  }, [records]);

  // 月別データの集計
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { month: string; totalHours: number; byTimer: Map<string, number>; byTag: Map<string, number> }>();
    
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: `${date.getFullYear()}年${date.getMonth() + 1}月`,
          totalHours: 0,
          byTimer: new Map(),
          byTag: new Map()
        });
      }
      
      const monthData = monthMap.get(monthKey)!;
      const hours = record.duration / 3600;
      monthData.totalHours += hours;
      
      // タイマー別集計
      const timerHours = monthData.byTimer.get(record.timerName) || 0;
      monthData.byTimer.set(record.timerName, timerHours + hours);
      
      // タグ別集計
      const tag = record.tag || 'タグなし';
      const tagHours = monthData.byTag.get(tag) || 0;
      monthData.byTag.set(tag, tagHours + hours);
    });
    
    return Array.from(monthMap.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6); // 直近6ヶ月
  }, [records]);

  // 現在の期間データ
  const currentData = period === 'week' ? weeklyData : monthlyData;
  const periodLabel = period === 'week' ? '週' : '月';

  // タイマー別の円グラフデータ
  const timerPieData = useMemo(() => {
    const timerMap = new Map<string, number>();
    
    records.forEach(record => {
      const hours = record.duration / 3600;
      const current = timerMap.get(record.timerName) || 0;
      timerMap.set(record.timerName, current + hours);
    });
    
    return Array.from(timerMap.entries())
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [records]);

  // タグ別の円グラフデータ
  const tagPieData = useMemo(() => {
    const tagMap = new Map<string, number>();
    
    records.forEach(record => {
      const hours = record.duration / 3600;
      const tag = record.tag || 'タグなし';
      const current = tagMap.get(tag) || 0;
      tagMap.set(tag, current + hours);
    });
    
    return Array.from(tagMap.entries())
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [records]);

  // 色パレット
  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

  return (
    <div className="reports-view">
      <div className="reports-header">
        <div className="period-selector">
          <button
            className={`period-btn ${period === 'week' ? 'active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            週別
          </button>
          <button
            className={`period-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            月別
          </button>
        </div>
      </div>

      <div className="reports-content">
        {/* 期間別の棒グラフ */}
        <div className="report-section">
          <h3>📊 {periodLabel}別の合計時間</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={period === 'week' ? 'week' : 'month'} 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: '時間', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}時間`} />
              <Bar dataKey="totalHours" fill="#667eea" name="合計時間" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* タイマー別の円グラフ */}
        <div className="report-section">
          <h3>⏱️ タイマー別の時間配分</h3>
          <div className="pie-chart-container">
            <ResponsiveContainer width="50%" height={300}>
              <PieChart>
                <Pie
                  data={timerPieData}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.name} (${entry.hours.toFixed(1)}h)`}
                >
                  {timerPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}時間`} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="legend-list">
              {timerPieData.map((item, index) => (
                <div key={item.name} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-value">{item.hours.toFixed(2)}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* タグ別の円グラフ */}
        <div className="report-section">
          <h3>🏷️ タグ別の時間配分</h3>
          <div className="pie-chart-container">
            <ResponsiveContainer width="50%" height={300}>
              <PieChart>
                <Pie
                  data={tagPieData}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.name} (${entry.hours.toFixed(1)}h)`}
                >
                  {tagPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}時間`} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="legend-list">
              {tagPieData.map((item, index) => (
                <div key={item.name} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-value">{item.hours.toFixed(2)}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="report-section">
          <h3>📈 統計サマリー</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">総記録数</div>
              <div className="stat-value">{records.length}件</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">総時間</div>
              <div className="stat-value">
                {(records.reduce((sum, r) => sum + r.duration, 0) / 3600).toFixed(2)}h
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">平均時間</div>
              <div className="stat-value">
                {records.length > 0 
                  ? (records.reduce((sum, r) => sum + r.duration, 0) / records.length / 60).toFixed(0)
                  : 0}分
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">タイマー数</div>
              <div className="stat-value">{timerPieData.length}個</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ヘルパー関数
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始とする
  return new Date(d.setDate(diff));
}

function formatWeekRange(startDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  return `${start.getMonth() + 1}/${start.getDate()}～${end.getMonth() + 1}/${end.getDate()}`;
}

export default ReportsView;
