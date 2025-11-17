import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // トークンをlocalStorageに保存
      localStorage.setItem('access_token', response.data.access_token);
      
      // ホーム画面にリダイレクト
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>🔐 ログイン</h1>
          <p className="login-description">My Appへようこそ</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">ユーザー名</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="login-note">
            <p>💡 デフォルト認証情報:</p>
            <p>ユーザー名: <code>admin</code></p>
            <p>パスワード: <code>password</code></p>
            <p className="note-small">
              ※ 本番環境では環境変数 <code>APP_USERNAME</code> と <code>APP_PASSWORD</code> で変更してください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
