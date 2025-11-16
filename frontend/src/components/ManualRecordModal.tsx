import { useState, useEffect } from 'react';
import type { Timer } from '../types';
import './ManualRecordModal.css';

interface ManualRecordModalProps {
  isOpen: boolean;
  stopwatchTimer: Timer | null;
  availableTags: string[];
  onClose: () => void;
  onSubmit: (data: {
    timerId: string;
    timerName: string;
    duration: number;
    tag?: string;
    date: string;
  }) => void;
  onAddTag: (tag: string) => void;
}

function ManualRecordModal({
  isOpen,
  stopwatchTimer,
  availableTags,
  onClose,
  onSubmit,
  onAddTag
}: ManualRecordModalProps) {
  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('0');
  const [seconds, setSeconds] = useState<string>('0');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // モーダルが開いたら現在日時を設定
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      setDate(`${year}-${month}-${day}T${hour}:${minute}`);
      
      // リセット
      setHours('0');
      setMinutes('0');
      setSeconds('0');
      setSelectedTag('');
      setIsAddingTag(false);
      setNewTag('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stopwatchTimer || !stopwatchTimer.id) {
      alert('ストップウォッチが見つかりません');
      return;
    }

    const totalSeconds = 
      parseInt(hours || '0') * 3600 + 
      parseInt(minutes || '0') * 60 + 
      parseInt(seconds || '0');

    if (totalSeconds <= 0) {
      alert('時間を入力してください');
      return;
    }

    if (!date) {
      alert('日時を入力してください');
      return;
    }

    onSubmit({
      timerId: stopwatchTimer.id,
      timerName: stopwatchTimer.name,
      duration: totalSeconds,
      tag: selectedTag && selectedTag.trim() !== '' ? selectedTag : undefined,
      date: new Date(date).toISOString().split('T')[0]
    });

    onClose();
  };

  const handleAddNewTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setSelectedTag(newTag.trim());
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manual-record-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 記録を手動で追加</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>実行時間 *</label>
            <div className="time-inputs">
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                />
                <span>時間</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                />
                <span>分</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  placeholder="0"
                />
                <span>秒</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>日時 *</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>タグ</label>
            {!isAddingTag ? (
              <div className="tag-select-group">
                <select 
                  value={selectedTag} 
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingTag(true);
                    } else {
                      setSelectedTag(e.target.value);
                    }
                  }}
                >
                  <option value="">タグなし</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                  <option value="__add_new__">+ 新しいタグを追加</option>
                </select>
              </div>
            ) : (
              <div className="new-tag-input">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="新しいタグ名"
                  autoFocus
                />
                <button type="button" onClick={handleAddNewTag} className="btn-add-tag">
                  追加
                </button>
                <button type="button" onClick={() => setIsAddingTag(false)} className="btn-cancel-tag">
                  キャンセル
                </button>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-submit">
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManualRecordModal;
