import { useState } from 'react';
import type { TimerRecord } from '../types';
import ConfirmModal from './ConfirmModal';
import './RecordDetailModal.css';

interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  records: TimerRecord[];
  onDelete: (recordId: string) => void;
}

function RecordDetailModal({ isOpen, onClose, date, records, onDelete }: RecordDetailModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; recordId: string | null; recordName: string }>({ 
    isOpen: false, 
    recordId: null, 
    recordName: '' 
  });

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleDeleteClick = (recordId: string, timerName: string) => {
    setDeleteConfirm({ isOpen: true, recordId, recordName: timerName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.recordId) return;
    
    setDeletingId(deleteConfirm.recordId);
    try {
      await onDelete(deleteConfirm.recordId);
      setDeleteConfirm({ isOpen: false, recordId: null, recordName: '' });
    } catch (error) {
      console.error('削除エラー:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, recordId: null, recordName: '' });
  };

  // 日付をフォーマット
  const displayDate = new Date(date);
  const dateLabel = `${displayDate.getFullYear()}年${displayDate.getMonth() + 1}月${displayDate.getDate()}日`;

  // 合計時間を計算
  const totalDuration = records.reduce((sum, record) => sum + record.duration, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content record-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{dateLabel}の記録</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="record-summary">
            <div className="summary-item">
              <span className="summary-label">記録数:</span>
              <span className="summary-value">{records.length}件</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">合計時間:</span>
              <span className="summary-value">{formatTime(totalDuration)}</span>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="no-records">
              <p>この日の記録はありません</p>
            </div>
          ) : (
            <div className="records-list">
              {records.map((record) => (
                <div key={record.id} className="detail-record-item">
                  <div className="detail-record-info">
                    <div className="detail-record-timer">
                      <span className="detail-timer-icon">⏱️</span>
                      <span className="detail-timer-name">{record.timerName}</span>
                    </div>
                    {record.tag && (
                      <div className="detail-record-tag">
                        <span className="detail-tag-icon">🏷️</span>
                        <span className="detail-tag-name">{record.tag}</span>
                      </div>
                    )}
                    <div className="detail-record-time">
                      <span className="detail-time-icon">🕐</span>
                      <span className="detail-time-value">{formatTime(record.duration)}</span>
                    </div>
                    <div className="detail-record-date">
                      <span className="detail-date-icon">📅</span>
                      <span className="detail-date-value">{formatDateTime(record.startTime)}</span>
                    </div>
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteClick(record.id, record.timerName)}
                    disabled={deletingId === record.id}
                  >
                    {deletingId === record.id ? '削除中...' : '🗑️ 削除'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-footer-button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="記録の削除"
        message={`「${deleteConfirm.recordName}」の記録を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default RecordDetailModal;
