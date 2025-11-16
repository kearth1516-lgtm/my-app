import { useEffect, useState } from 'react';
import { homeService } from '../services';
import type { HomeImage } from '../types';
import './Home.css';

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
}

function Home() {
  const [image, setImage] = useState<HomeImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadRandomImage();
    loadWeather();
    loadCalendarEvents();
    
    // 1分ごとに時刻を更新
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
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

  const loadWeather = async () => {
    try {
      const response = await homeService.getWeather();
      // temperatureがnullの場合は天気情報を設定しない
      if (response.data.temperature !== null) {
        setWeather(response.data);
      }
    } catch (error) {
      console.error('天気情報の取得に失敗しました:', error);
      // エラーは無視して続行
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const response = await homeService.getCalendarEvents();
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('カレンダー情報の取得に失敗しました:', error);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatEventTime = (isoString: string) => {
    const date = new Date(isoString);
    return formatTime(date);
  };

  const groupEventsByDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const grouped = {
      today: [] as CalendarEvent[],
      tomorrow: [] as CalendarEvent[],
      dayAfterTomorrow: [] as CalendarEvent[]
    };
    
    events.forEach(event => {
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate.getTime() === today.getTime()) {
        grouped.today.push(event);
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        grouped.tomorrow.push(event);
      } else if (eventDate.getTime() === dayAfterTomorrow.getTime()) {
        grouped.dayAfterTomorrow.push(event);
      }
    });
    
    return grouped;
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>🌟 My App</h1>
          <p>推しと一緒に、毎日を楽しく</p>
        </div>
        <a href="/settings" className="settings-link">⚙️</a>
      </header>

      {/* 日時・天気セクション */}
      <div className="info-cards">
        <div className="info-card datetime-card">
          <div className="date-text">{formatDate(currentTime)}</div>
          <div className="time-text">{formatTime(currentTime)}</div>
        </div>
        
        {weather && (
          <div className="info-card weather-card">
            <div className="weather-icon">
              <img 
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
                alt={weather.description} 
              />
            </div>
            <div className="weather-info">
              <div className="temperature">{Math.round(weather.temperature)}°C</div>
              <div className="description">{weather.description}</div>
              <div className="details">
                {weather.humidity !== null && `💧 ${weather.humidity}%`}
                {weather.humidity !== null && weather.windSpeed !== null && ' | '}
                {weather.windSpeed !== null && `🌬️ ${weather.windSpeed}m/s`}
              </div>
            </div>
          </div>
        )}
      </div>

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

      {/* スケジュール */}
      {events.length > 0 && (
        <div className="schedule-section">
          <h2>📅 スケジュール</h2>
          <div className="schedule-days">
            {(() => {
              const grouped = groupEventsByDay();
              return (
                <>
                  {grouped.today.length > 0 && (
                    <div className="day-schedule">
                      <h3>今日</h3>
                      {grouped.today.map(event => (
                        <div key={event.id} className="event-card">
                          <div className="event-time">{formatEventTime(event.start)}</div>
                          <div className="event-details">
                            <div className="event-title">{event.summary}</div>
                            {event.description && (
                              <div className="event-description">{event.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {grouped.tomorrow.length > 0 && (
                    <div className="day-schedule">
                      <h3>明日</h3>
                      {grouped.tomorrow.map(event => (
                        <div key={event.id} className="event-card">
                          <div className="event-time">{formatEventTime(event.start)}</div>
                          <div className="event-details">
                            <div className="event-title">{event.summary}</div>
                            {event.description && (
                              <div className="event-description">{event.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {grouped.dayAfterTomorrow.length > 0 && (
                    <div className="day-schedule">
                      <h3>明後日</h3>
                      {grouped.dayAfterTomorrow.map(event => (
                        <div key={event.id} className="event-card">
                          <div className="event-time">{formatEventTime(event.start)}</div>
                          <div className="event-details">
                            <div className="event-title">{event.summary}</div>
                            {event.description && (
                              <div className="event-description">{event.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

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
