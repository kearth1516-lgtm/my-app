import { useEffect, useState } from 'react';
import { homeService } from '../services';
import type { HomeImage } from '../types';
import './Home.css';

function Home() {
  const [image, setImage] = useState<HomeImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRandomImage();
  }, []);

  const loadRandomImage = async () => {
    try {
      setLoading(true);
      const response = await homeService.getRandomImage();
      console.log('API Response:', response.data);
      setImage(response.data);
    } catch (error) {
      console.error('画像の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>🌟 My App</h1>
        <p>推しと一緒に、毎日を楽しく</p>
        <a href="/settings" className="settings-link">⚙️</a>
      </header>

      <div className="home-image-container">
        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : image && image.imageUrl ? (
          <div className="image-card">
            <img src={image.imageUrl} alt={image.caption || '推し写真'} />
            {image.caption && <p className="image-caption">{image.caption}</p>}
          </div>
        ) : (
          <div className="no-image">
            <p>画像がありません</p>
            <button onClick={loadRandomImage}>再読み込み</button>
          </div>
        )}
      </div>

      <nav className="home-menu">
        <a href="/timers" className="menu-item">
          <div className="menu-icon">⏱️</div>
          <div className="menu-label">タイマー</div>
        </a>
        <a href="/recipes" className="menu-item">
          <div className="menu-icon">🍳</div>
          <div className="menu-label">レシピ</div>
        </a>
        <a href="/fashion" className="menu-item">
          <div className="menu-icon">👔</div>
          <div className="menu-label">ファッション</div>
        </a>
      </nav>
    </div>
  );
}

export default Home;
