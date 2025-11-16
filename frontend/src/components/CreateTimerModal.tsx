import React, { useState } from 'react';
import './CreateTimerModal.css';

interface CreateTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (timer: { name: string; duration: number; image: string; type: 'countdown' | 'stopwatch' }) => void;
}

const CreateTimerModal: React.FC<CreateTimerModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [image, setImage] = useState('/images/mogu.jpg');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (5MB)
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
    
    const duration = hours * 3600 + minutes * 60 + seconds;
    
    if (!name.trim()) {
      alert('タイマー名を入力してください');
      return;
    }
    
    if (duration <= 0) {
      alert('時間を設定してください');
      return;
    }
    
    onSubmit({
      name: name.trim(),
      duration,
      image: image.trim() || '/images/mogu.jpg',
      type: 'countdown'
    });
    
    // リセット
    setName('');
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setImage('/images/mogu.jpg');
    onClose();
  };

  const handleCancel = () => {
    // リセット
    setName('');
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setImage('/images/mogu.jpg');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新しいタイマーを作成</h2>
          <button className="close-button" onClick={handleCancel}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="timer-form">
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
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="23"
                />
                <span>時間</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="59"
                />
                <span>分</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="59"
                />
                <span>秒</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>画像選択</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && <small>アップロード中...</small>}
          </div>

          <div className="preview-section">
            <label>プレビュー</label>
            <img 
              src={image} 
              alt="プレビュー" 
              className="image-preview"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/mogu.jpg';
              }}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={handleCancel}>
              キャンセル
            </button>
            <button type="submit" className="create-button">
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTimerModal;
