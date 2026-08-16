import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Home from './pages/Home';
import Plan from './pages/Plan';
import Practice from './pages/Practice';
import Discover from './pages/Discover';
import Me from './pages/Me';
import Login from './pages/Login';
import Subjects from './pages/Subjects';
import Review from './pages/Review';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import { GameIcon } from './components/SharedUI';
import { isLoggedIn, logout } from './stores/auth';
import { syncPull } from './stores/sync';

// 3D 微动效 Tab 栏
function TabBar() {
  const location = useLocation();
  const tabs = [
    { path: '/', icon: 'home', label: '首页' },
    { path: '/plan', icon: 'calendar', label: '计划' },
    { path: '/practice', icon: 'memo', label: '练习' },
    { path: '/discover', icon: 'compass', label: '发现' },
    { path: '/me', icon: 'user', label: '我的' },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '1px solid #e8e2db',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0',
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: isActive ? '#f97316' : '#9ca3af',
              fontSize: '0.7rem',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1.3rem', marginBottom: 2 }}>
              {tab.icon === 'home' && '🏠'}
              {tab.icon === 'calendar' && '📅'}
              {tab.icon === 'memo' && '📝'}
              {tab.icon === 'compass' && '🧭'}
              {tab.icon === 'user' && '👤'}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

// 受保护的路由
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [isLoggedInState, setIsLoggedInState] = useState<boolean | null>(null);

  useEffect(() => {
    const loggedIn = isLoggedIn();
    setIsLoggedInState(loggedIn);
    if (loggedIn) {
      syncPull();
    }
  }, []);

  if (isLoggedInState === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#faf8f5',
      }}>
        <div style={{ fontSize: '2rem' }}>📚</div>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
        <Routes>
          <Route path="/login" element={<Login onDone={() => setIsLoggedInState(true)} />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/plan" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
          <Route path="/practice/*" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
          <Route path="/study/*" element={<Navigate to="/practice" replace />} />
          <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
          <Route path="/me" element={<ProtectedRoute><Me /></ProtectedRoute>} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />
          <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
        </Routes>
        {isLoggedInState && <TabBar />}
      </div>
    </Router>
  );
}

export default App;
