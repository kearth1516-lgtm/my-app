import { useState, useEffect } from 'react';
import type { TimerRecord } from '../types';
import './EditRecordModal.css';

interface EditRecordModalProps {
  isOpen: boolean;
  record: TimerRecord | null;
  availableTags: string[];
  onClose: () => void;
  onSave: (recordId: string, updates: { duration?: number; date?: string; tag?: string }) => void;
  onAddTag: (tag: string) => void;
}

function EditRecordModal({ isOpen, record, availableTags, onClose, onSave, onAddTag }: EditRecordModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [date, setDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  useEffect(() => {
    if (record) {
      // 時間を時分秒に分解
      const totalSeconds = record.duration;
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      
      setHours(h);
      setMinutes(m);
      setSeconds(s);
      
      // 日付を設定
      setDate(record.date);
      
      // タグを設定
      setSelectedTag(record.tag || '');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSave = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalSeconds <= 0) {
      alert('時間は1秒以上である必要があります');
      return;
    }

    const updates: { duration?: number; date?: string; tag?: string } = {};
    
    if (totalSeconds !== record.duration) {
      updates.duration = totalSeconds;
    }
    
    if (date !== record.date) {
      updates.date = date;
    }
    
    if (selectedTag !== (record.tag || '')) {
      updates.tag = selectedTag;
    }

    onSave(record.id, updates);
    onClose();
  };

  const handleAddNewTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setSelectedTag(newTag.trim());
      setNewTag('');
      setShowNewTagInput(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-record-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>記録を編集</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>タイマー</label>
            <input type="text" value={record.timerName} disabled className="disabled-input" />
          </div>

          <div className="form-group">
            <label>時間</label>
            <div className="time-inputs">
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="time-unit">時間</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <span className="time-unit">分</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <span className="time-unit">秒</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>タグ</label>
            <select
              value={selectedTag}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewTagInput(true);
                } else {
                  setSelectedTag(e.target.value);
                }
              }}
            >
              <option value="">タグなし</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
              <option value="__new__">+ 新しいタグを追加</option>
            </select>
          </div>

          {showNewTagInput && (
            <div className="form-group">
              <label>新しいタグ名</label>
              <div className="new-tag-input">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="タグ名を入力"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddNewTag();
                    }
                  }}
                />
                <button className="btn-add-tag" onClick={handleAddNewTag}>
                  追加
                </button>
                <button
                  className="btn-cancel-tag"
                  onClick={() => {
                    setShowNewTagInput(false);
                    setNewTag('');
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn-save" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditRecordModal;
