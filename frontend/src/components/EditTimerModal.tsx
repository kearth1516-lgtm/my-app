import React, { useState, useEffect } from 'react';
import type { Timer } from '../types';
import './CreateTimerModal.css'; // 作成モーダルと同じスタイルを使用

interface EditTimerModalProps {
  isOpen: boolean;
  timer: Timer | null;
  onClose: () => void;
  onSubmit: (timerId: string, updates: { name?: string; duration?: number; image?: string }) => void;
}

const EditTimerModal: React.FC<EditTimerModalProps> = ({ isOpen, timer, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [image, setImage] = useState('/images/mogu.jpg');
  const [uploading, setUploading] = useState(false);

  // timerが変わったら初期値を設定
  useEffect(() => {
    if (timer) {
      setName(timer.name);
      setImage(timer.image || '/images/mogu.jpg');
      
      if (timer.type === 'countdown') {
        const totalSeconds = timer.duration;
        setHours(Math.floor(totalSeconds / 3600));
        setMinutes(Math.floor((totalSeconds % 3600) / 60));
        setSeconds(totalSeconds % 60);
      }
    }
  }, [timer]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます。最大5MBまでです。');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('アップロードに失敗しました');
      }

      const data = await response.json();
      setImage(`http://localhost:8000${data.url}`);
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!timer || !timer.id) return;

    const updates: { name?: string; duration?: number; image?: string } = {
      image
    };

    if (timer.type === 'countdown') {
      const duration = hours * 3600 + minutes * 60 + seconds;
      
      if (!name.trim()) {
        alert('タイマー名を入力してください');
        return;
      }
      
      if (duration === 0) {
        alert('時間を設定してください');
        return;
      }

      updates.name = name;
      updates.duration = duration;
    }

    onSubmit(timer.id, updates);
    onClose();
  };

  if (!isOpen || !timer) return null;

  const isStopwatch = timer.type === 'stopwatch';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isStopwatch ? 'ストップウォッチ編集' : 'タイマー編集'}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="timer-form">
          {!isStopwatch && (
            <>
              <div className="form-group">
                <label htmlFor="timer-name">タイマー名</label>
                <input
                  id="timer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 勉強タイマー"
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label>時間設定</label>
                <div className="time-inputs">
                  <div className="time-input-group">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    />
                    <span>時間</span>
                  </div>
                  <div className="time-input-group">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    />
                    <span>分</span>
                  </div>
                  <div className="time-input-group">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    />
                    <span>秒</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>画像選択</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="image-input"
            />
            {uploading && <p className="upload-status">アップロード中...</p>}
            {image && (
              <div className="image-preview">
                <img src={image} alt="プレビュー" />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'アップロード中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTimerModal;
