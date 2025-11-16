import { useState, useEffect } from 'react';
import './SaveRecordModal.css';

interface SaveRecordModalProps {
  isOpen: boolean;
  timerName: string;
  duration: number; // 秒
  availableTags: string[];
  onSave: (tag: string) => void;
  onCancel: () => void;
  onAddTag: (tag: string) => void;
}

const SaveRecordModal: React.FC<SaveRecordModalProps> = ({
  isOpen,
  timerName,
  duration,
  availableTags,
  onSave,
  onCancel,
  onAddTag,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedTag('');
      setIsAddingNew(false);
      setNewTagName('');
    }
  }, [isOpen]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  const handleSave = () => {
    if (isAddingNew) {
      if (newTagName.trim()) {
        onAddTag(newTagName.trim());
        onSave(newTagName.trim());
      } else {
        alert('タグ名を入力してください');
      }
    } else {
      onSave(selectedTag); // 空文字列の場合は「その他」として扱う
    }
  };

  const handleAddNewTag = () => {
    setIsAddingNew(true);
    setSelectedTag('');
  };

  const handleSelectExisting = () => {
    setIsAddingNew(false);
    setNewTagName('');
  };

  if (!isOpen) return null;

  return (
    <div className="save-record-overlay" onClick={onCancel}>
      <div className="save-record-content" onClick={(e) => e.stopPropagation()}>
        <div className="save-record-header">
          <h3>記録を保存</h3>
        </div>

        <div className="save-record-body">
          <div className="record-info">
            <p className="timer-name">{timerName}</p>
            <p className="record-duration">実行時間: {formatDuration(duration)}</p>
          </div>

          <div className="tag-selection">
            <label>タグ（カテゴリ）</label>
            
            {!isAddingNew ? (
              <>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="tag-select"
                >
                  <option value="">その他（タグなし）</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-new-tag-button"
                  onClick={handleAddNewTag}
                >
                  ＋ 新しいタグを追加
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="新しいタグ名（例: 英語、数学、筋トレ）"
                  className="new-tag-input"
                  maxLength={20}
                  autoFocus
                />
                <button
                  type="button"
                  className="cancel-new-tag-button"
                  onClick={handleSelectExisting}
                >
                  既存のタグから選択
                </button>
              </>
            )}
          </div>
        </div>

        <div className="save-record-actions">
          <button className="cancel-button" onClick={onCancel}>
            キャンセル
          </button>
          <button className="save-button" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveRecordModal;
