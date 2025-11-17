import { useState, useEffect } from 'react';
import { settingsService } from '../services';
import { playAlertSound, getSoundTypeName, type SoundType } from '../utils/audio';
import { themeOptions, applyTheme } from '../utils/theme';
import './Settings.css';

function Settings() {
  const [currentTheme, setCurrentTheme] = useState('purple');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [soundType, setSoundType] = useState<SoundType>('beep');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ローカルストレージからテーマを即座に適用（APIより速い）
    const cachedTheme = localStorage.getItem('app-theme');
    if (cachedTheme) {
      applyTheme(cachedTheme);
      setCurrentTheme(cachedTheme);
    }
    
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsService.get();
      setCurrentTheme(response.data.theme);
      setSoundEnabled(response.data.soundEnabled ?? true);
      setSoundVolume(response.data.soundVolume ?? 0.5);
      setSoundType((response.data.soundType as SoundType) ?? 'beep');
      setOpenaiApiKey(response.data.openaiApiKey ?? '');
      setGoogleCalendarId(response.data.googleCalendarId ?? '');
      applyTheme(response.data.theme);
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
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

  const handleSoundToggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      await settingsService.update({ soundEnabled: enabled });
      setSoundEnabled(enabled);
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleVolumeChange = async (volume: number) => {
    setSoundVolume(volume);
    // デバウンスなしで即座に保存
    try {
      await settingsService.update({ soundVolume: volume });
    } catch (error) {
      console.error('音量の保存に失敗しました:', error);
    }
  };

  const handleSoundTypeChange = async (type: SoundType) => {
    setSaving(true);
    try {
      await settingsService.update({ soundType: type });
      setSoundType(type);
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewSound = () => {
    playAlertSound(soundType, soundVolume);
  };

  const handleApiKeyChange = async (key: string) => {
    setOpenaiApiKey(key);
  };

  const handleApiKeySave = async () => {
    setSaving(true);
    try {
      await settingsService.update({ openaiApiKey });
      alert('APIキーを保存しました');
    } catch (error) {
      console.error('APIキーの保存に失敗しました:', error);
      alert('APIキーの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarSave = async () => {
    setSaving(true);
    try {
      await settingsService.update({ googleCalendarId });
      alert('カレンダーIDを保存しました');
    } catch (error) {
      console.error('カレンダーIDの保存に失敗しました:', error);
      alert('カレンダーIDの保存に失敗しました');
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

        <section className="settings-section">
          <h2>🔔 アラート音</h2>
          <p className="section-description">タイマー終了時に通知音を鳴らします</p>
          
          <div className="sound-settings">
            <div className="setting-row">
              <label className="setting-label">
                <span>アラート音を有効にする</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => handleSoundToggle(e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </label>
            </div>

            {soundEnabled && (
              <>
                <div className="setting-row">
                  <label className="setting-label">
                    <span>音量</span>
                    <div className="volume-control">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={soundVolume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="volume-slider"
                      />
                      <span className="volume-value">{Math.round(soundVolume * 100)}%</span>
                    </div>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    <span>音の種類</span>
                    <div className="sound-type-options">
                      {(['beep', 'bell', 'chime', 'digital'] as SoundType[]).map((type) => (
                        <button
                          key={type}
                          className={`sound-type-btn ${soundType === type ? 'active' : ''}`}
                          onClick={() => handleSoundTypeChange(type)}
                          disabled={saving}
                        >
                          {getSoundTypeName(type)}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>

                <div className="setting-row">
                  <button
                    className="preview-sound-btn"
                    onClick={handlePreviewSound}
                    disabled={saving}
                  >
                    🔊 音をプレビュー
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h2>🤖 AI機能設定</h2>
          <p className="section-description">OpenAI APIキーを設定するとAI提案機能が使えます</p>
          
          <div className="api-key-settings">
            <div className="setting-row">
              <label className="setting-label">
                <span>OpenAI API Key</span>
                <div className="api-key-input-group">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={openaiApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="sk-..."
                    className="api-key-input"
                  />
                  <button
                    className="toggle-visibility-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                    type="button"
                  >
                    {showApiKey ? '👁️' : '🔒'}
                  </button>
                </div>
              </label>
            </div>
            <div className="setting-row">
              <button
                className="save-api-key-btn"
                onClick={handleApiKeySave}
                disabled={saving || !openaiApiKey}
              >
                💾 APIキーを保存
              </button>
            </div>
            <p className="api-key-note">
              ⚠️ APIキーは安全に保存されますが、漏洩に注意してください。<br />
              OpenAIのAPIキーは<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">こちら</a>から取得できます。
            </p>
          </div>
        </section>

        <section className="settings-section">
          <h2>📅 カレンダー連携</h2>
          <p className="section-description">Googleカレンダーの秘密のアドレス（iCal形式）を設定</p>
          
          <div className="api-key-settings">
            <div className="setting-row">
              <label className="setting-label">
                <span>秘密のアドレス（iCal形式）</span>
                <input
                  type="text"
                  value={googleCalendarId}
                  onChange={(e) => setGoogleCalendarId(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/.../private-xxx/basic.ics"
                  className="api-key-input"
                />
              </label>
            </div>
            <div className="setting-row">
              <button
                className="save-api-key-btn"
                onClick={handleCalendarSave}
                disabled={saving || !googleCalendarId}
              >
                💾 カレンダーを保存
              </button>
            </div>
            <p className="api-key-note">
              📝 <strong>秘密のアドレス（iCal形式）の取得方法：</strong><br />
              1. <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Googleカレンダー</a>を開く（PCブラウザで）<br />
              2. 左側の「マイカレンダー」で連携したいカレンダーにカーソルを合わせる<br />
              3. 「︙」（縦3点メニュー）→「設定と共有」をクリック<br />
              4. 下にスクロールして「<strong>カレンダーの統合</strong>」セクションを探す<br />
              5. 「<strong>秘密のアドレス（iCal 形式）</strong>」のURLをコピー<br />
              　（例: https://calendar.google.com/calendar/ical/.../private-xxx/basic.ics）<br />
              6. 上の入力欄に貼り付けて保存<br />
              <br />
              ✅ <strong>メリット：</strong>カレンダーを公開設定にする必要がありません<br />
              ⚠️ <strong>注意：</strong>このURLを知っている人は誰でもカレンダーを見れます
            </p>
          </div>
        </section>

        <section className="settings-section">
          <h2>🔐 アカウント</h2>
          <p className="section-description">ログアウトしてアカウントを切り替えます</p>
          
          <div className="api-key-settings">
            <div className="setting-row">
              <button
                className="logout-button"
                onClick={() => {
                  localStorage.removeItem('access_token');
                  window.location.href = '/login';
                }}
              >
                🚪 ログアウト
              </button>
            </div>
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
