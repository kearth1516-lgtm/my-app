/**
 * オーディオユーティリティ
 * タイマー終了時のアラート音を再生する
 */

export type SoundType = 'beep' | 'bell' | 'chime' | 'digital';

let currentAlertInterval: number | null = null;

/**
 * アラート音を繰り返し再生する
 * @param soundType 音の種類
 * @param volume 音量 (0.0 - 1.0)
 * @param duration 再生続続時間（ミリ秒、デフォルト: 5秒）
 * @returns 停止関数
 */
export const playAlertSound = (soundType: SoundType = 'beep', volume: number = 0.5, duration: number = 5000): (() => void) => {
  // 前のアラートがあれば停止
  if (currentAlertInterval !== null) {
    clearInterval(currentAlertInterval);
    clearTimeout(currentAlertInterval);
  }

  let isStopped = false;

  const playOnce = () => {
    if (isStopped) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      switch (soundType) {
        case 'beep':
          playBeep(audioContext, volume);
          break;
        case 'bell':
          playBell(audioContext, volume);
          break;
        case 'chime':
          playChime(audioContext, volume);
          break;
        case 'digital':
          playDigital(audioContext, volume);
          break;
        default:
          playBeep(audioContext, volume);
      }
    } catch (error) {
      console.error('アラート音の再生に失敗しました:', error);
    }
  };

  // 最初の1回を再生
  playOnce();

  // 2秒ごとに繰り返す
  const intervalId = window.setInterval(playOnce, 2000);
  currentAlertInterval = intervalId;

  // 指定時間後に自動停止
  const timeoutId = window.setTimeout(() => {
    if (!isStopped) {
      clearInterval(intervalId);
      currentAlertInterval = null;
    }
  }, duration);

  // 停止関数を返す
  return () => {
    isStopped = true;
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    if (currentAlertInterval === intervalId) {
      currentAlertInterval = null;
    }
  };
};

/**
 * シンプルなビープ音
 */
const playBeep = (audioContext: AudioContext, volume: number): void => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

/**
 * ベル音（2音階）
 */
const playBell = (audioContext: AudioContext, volume: number): void => {
  // 1音目
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();
  
  osc1.connect(gain1);
  gain1.connect(audioContext.destination);
  
  osc1.frequency.value = 800;
  osc1.type = 'sine';
  
  gain1.gain.setValueAtTime(volume, audioContext.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  osc1.start(audioContext.currentTime);
  osc1.stop(audioContext.currentTime + 0.3);
  
  // 2音目（少し高い音）
  const osc2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  
  osc2.connect(gain2);
  gain2.connect(audioContext.destination);
  
  osc2.frequency.value = 1000;
  osc2.type = 'sine';
  
  gain2.gain.setValueAtTime(volume, audioContext.currentTime + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45);
  
  osc2.start(audioContext.currentTime + 0.15);
  osc2.stop(audioContext.currentTime + 0.45);
};

/**
 * チャイム音（3音階）
 */
const playChime = (audioContext: AudioContext, volume: number): void => {
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
  
  frequencies.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = freq;
    osc.type = 'sine';
    
    const startTime = audioContext.currentTime + (index * 0.2);
    const endTime = startTime + 0.4;
    
    gain.gain.setValueAtTime(volume * 0.8, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, endTime);
    
    osc.start(startTime);
    osc.stop(endTime);
  });
};

/**
 * デジタル音（短い連続音）
 */
const playDigital = (audioContext: AudioContext, volume: number): void => {
  for (let i = 0; i < 3; i++) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = 1200;
    osc.type = 'square';
    
    const startTime = audioContext.currentTime + (i * 0.15);
    const endTime = startTime + 0.1;
    
    gain.gain.setValueAtTime(volume * 0.6, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, endTime);
    
    osc.start(startTime);
    osc.stop(endTime);
  }
};

/**
 * 音の種類の表示名を取得
 */
export const getSoundTypeName = (soundType: SoundType): string => {
  const names: Record<SoundType, string> = {
    beep: 'ビープ',
    bell: 'ベル',
    chime: 'チャイム',
    digital: 'デジタル'
  };
  return names[soundType] || 'ビープ';
};
