import { useState } from 'react';
import type { Timer } from '../types';
import './TimerRunning.css';

interface TimerRunningProps {
  timer: Timer;
  onPause: () => void;
  onStop: () => void;
  remainingSeconds: number;
}

const TimerRunning: React.FC<TimerRunningProps> = ({ 
  timer, 
  onPause, 
  onStop, 
  remainingSeconds 
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    return ((timer.duration - remainingSeconds) / timer.duration) * 100;
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    onPause();
  };

  return (
    <div className="timer-running-overlay">
      {timer.imageUrl && (
        <div 
          className="timer-running-background"
          style={{ backgroundImage: `url(${timer.imageUrl})` }}
        />
      )}
      
      <div className="timer-running-content">
        <div className="timer-running-header">
          <h1>{timer.name}</h1>
        </div>

        <div className="timer-running-display">
          <div className="time-circle">
            <svg className="progress-ring" width="300" height="300">
              <circle
                className="progress-ring-background"
                cx="150"
                cy="150"
                r="140"
              />
              <circle
                className="progress-ring-progress"
                cx="150"
                cy="150"
                r="140"
                style={{
                  strokeDasharray: `${2 * Math.PI * 140}`,
                  strokeDashoffset: `${2 * Math.PI * 140 * (1 - getProgress() / 100)}`,
                }}
              />
            </svg>
            <div className="time-text">
              {formatTime(remainingSeconds)}
            </div>
          </div>
        </div>

        <div className="timer-running-controls">
          <button 
            className="control-button pause-button"
            onClick={handlePause}
          >
            {isPaused ? '▶ 再開' : '⏸ 一時停止'}
          </button>
          <button 
            className="control-button stop-button"
            onClick={onStop}
          >
            ■ 停止
          </button>
        </div>

        <div className="timer-running-info">
          <p>設定時間: {formatTime(timer.duration)}</p>
          <p>経過: {formatTime(timer.duration - remainingSeconds)}</p>
        </div>
      </div>
    </div>
  );
};

export default TimerRunning;
