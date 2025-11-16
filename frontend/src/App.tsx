import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Timers from './pages/Timers';
import Records from './pages/Records';
import Recipes from './pages/Recipes';
import Settings from './pages/Settings';
import { initializeTheme, applyTheme } from './utils/theme';
import { settingsService } from './services';
import './App.css';

function App() {
  useEffect(() => {
    // ローカルストレージから即座にテーマを適用（フラッシュ防止）
    initializeTheme();
    
    // サーバーから最新のテーマを取得して同期
    const loadTheme = async () => {
      try {
        const response = await settingsService.get();
        const theme = response.data.theme;
        if (theme) {
          applyTheme(theme);
        }
      } catch (error) {
        console.error('テーマの読み込みに失敗しました:', error);
      }
    };
    loadTheme();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/timers" element={<Timers />} />
        <Route path="/records" element={<Records />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/fashion" element={<div style={{ padding: '20px', textAlign: 'center' }}>ファッションページ（準備中）</div>} />
      </Routes>
    </Router>
  );
}

export default App;
