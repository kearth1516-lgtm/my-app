import { useState, useEffect } from 'react';
import { settingsService } from '../services';
import './Settings.css';

interface ThemeOption {
  id: string;
  name: string;
  gradient: string;
  textColor: string; // テキストカラー（light or dark）
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    success: string;
    danger: string;
  };
}

const themeOptions: ThemeOption[] = [
  { 
    id: 'red', 
    name: 'レッド', 
    gradient: 'linear-gradient(135deg, #ff8787 0%, #fc6c85 100%)', 
    textColor: 'light',
    colors: { primary: '#ff8787', primaryDark: '#fc6c85', accent: '#ffa8a8', success: '#ff6b9d', danger: '#dc2626' }
  },
  { 
    id: 'blue', 
    name: 'ブルー', 
    gradient: 'linear-gradient(135deg, #4c9aff 0%, #3b82f6 100%)', 
    textColor: 'light',
    colors: { primary: '#4c9aff', primaryDark: '#3b82f6', accent: '#7db3ff', success: '#60a5fa', danger: '#ef4444' }
  },
  { 
    id: 'yellow', 
    name: 'イエロー', 
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)', 
    textColor: 'dark',
    colors: { primary: '#fcd34d', primaryDark: '#fbbf24', accent: '#fde68a', success: '#f59e0b', danger: '#dc2626' }
  },
  { 
    id: 'green', 
    name: 'グリーン', 
    gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', 
    textColor: 'dark',
    colors: { primary: '#34d399', primaryDark: '#10b981', accent: '#6ee7b7', success: '#059669', danger: '#ef4444' }
  },
  { 
    id: 'pink', 
    name: 'ピンク', 
    gradient: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 100%)', 
    textColor: 'dark',
    colors: { primary: '#f9a8d4', primaryDark: '#f472b6', accent: '#fbcfe8', success: '#ec4899', danger: '#dc2626' }
  },
  { 
    id: 'cyan', 
    name: 'スカイ', 
    gradient: 'linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%)', 
    textColor: 'dark',
    colors: { primary: '#a5f3fc', primaryDark: '#67e8f9', accent: '#cffafe', success: '#06b6d4', danger: '#ef4444' }
  },
  { 
    id: 'orange', 
    name: 'オレンジ', 
    gradient: 'linear-gradient(135deg, #fdba74 0%, #fb923c 100%)', 
    textColor: 'dark',
    colors: { primary: '#fdba74', primaryDark: '#fb923c', accent: '#fed7aa', success: '#f97316', danger: '#dc2626' }
  },
  { 
    id: 'lime', 
    name: 'ライム', 
    gradient: 'linear-gradient(135deg, #d9f99d 0%, #a3e635 100%)', 
    textColor: 'dark',
    colors: { primary: '#d9f99d', primaryDark: '#a3e635', accent: '#ecfccb', success: '#84cc16', danger: '#dc2626' }
  },
  { 
    id: 'purple', 
    name: 'パープル', 
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
    textColor: 'light',
    colors: { primary: '#8b5cf6', primaryDark: '#7c3aed', accent: '#a78bfa', success: '#9333ea', danger: '#ef4444' }
  },
  { 
    id: 'black', 
    name: 'ブラック', 
    gradient: 'linear-gradient(135deg, #52525b 0%, #27272a 100%)', 
    textColor: 'light',
    colors: { primary: '#52525b', primaryDark: '#27272a', accent: '#71717a', success: '#6b7280', danger: '#ef4444' }
  },
  { 
    id: 'white', 
    name: 'ホワイト', 
    gradient: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)', 
    textColor: 'dark',
    colors: { primary: '#f9fafb', primaryDark: '#e5e7eb', accent: '#d1d5db', success: '#9ca3af', danger: '#dc2626' }
  },
  { 
    id: 'brown', 
    name: 'ブラウン', 
    gradient: 'linear-gradient(135deg, #b5917a 0%, #92776d 100%)', 
    textColor: 'light',
    colors: { primary: '#b5917a', primaryDark: '#92776d', accent: '#d4b59e', success: '#a98470', danger: '#ef4444' }
  },
];

function Settings() {
  const [currentTheme, setCurrentTheme] = useState('purple');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsService.get();
      setCurrentTheme(response.data.theme);
      applyTheme(response.data.theme);
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: string) => {
    const themeOption = themeOptions.find(t => t.id === theme);
    if (themeOption) {
      document.documentElement.style.setProperty('--theme-gradient', themeOption.gradient);
      document.documentElement.style.setProperty('--theme-text-color', themeOption.textColor === 'dark' ? '#333' : '#fff');
      document.documentElement.style.setProperty('--theme-text-alpha', themeOption.textColor === 'dark' ? 'rgba(51, 51, 51, 0.8)' : 'rgba(255, 255, 255, 0.8)');
      
      // テーマカラーパレットを設定
      document.documentElement.style.setProperty('--theme-primary', themeOption.colors.primary);
      document.documentElement.style.setProperty('--theme-primary-dark', themeOption.colors.primaryDark);
      document.documentElement.style.setProperty('--theme-accent', themeOption.colors.accent);
      document.documentElement.style.setProperty('--theme-success', themeOption.colors.success);
      document.documentElement.style.setProperty('--theme-danger', themeOption.colors.danger);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setSaving(true);
    try {
      await settingsService.update({ theme: themeId });
      setCurrentTheme(themeId);
      applyTheme(themeId);
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>⚙️ 設定</h1>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <h2>テーマカラー</h2>
          <p className="section-description">アプリ全体のカラーテーマを選択できます</p>
          
          <div className="theme-options">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.id)}
                disabled={saving}
              >
                <div 
                  className="theme-preview" 
                  style={{ background: theme.gradient }}
                />
                <span className="theme-name">{theme.name}</span>
                {currentTheme === theme.id && (
                  <span className="check-icon">✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {saving && (
          <div className="saving-indicator">
            保存中...
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <a href="/" className="nav-item">
          🏠 ホーム
        </a>
      </nav>
    </div>
  );
}

export default Settings;
