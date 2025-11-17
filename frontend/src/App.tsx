import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Timers from './pages/Timers';
import Records from './pages/Records';
import Recipes from './pages/Recipes';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { initializeTheme, applyTheme } from './utils/theme';
import { settingsService } from './services';
import './App.css';

// 認証チェック用のコンポーネント
function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
}

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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/timers" element={<PrivateRoute><Timers /></PrivateRoute>} />
        <Route path="/records" element={<PrivateRoute><Records /></PrivateRoute>} />
        <Route path="/recipes" element={<PrivateRoute><Recipes /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/fashion" element={<PrivateRoute><div style={{ padding: '20px', textAlign: 'center' }}>ファッションページ（準備中）</div></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;

