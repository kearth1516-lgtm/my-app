import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Timers from './pages/Timers';
import TimerDetail from './pages/TimerDetail';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/timers" element={<Timers />} />
        <Route path="/timers/:id" element={<TimerDetail />} />
        <Route path="/recipes" element={<div style={{ padding: '20px', textAlign: 'center' }}>レシピページ（準備中）</div>} />
        <Route path="/fashion" element={<div style={{ padding: '20px', textAlign: 'center' }}>ファッションページ（準備中）</div>} />
      </Routes>
    </Router>
  );
}

export default App;
