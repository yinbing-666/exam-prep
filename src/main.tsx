import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAuth } from './stores/auth'
import './index.css'

// 渲染前恢复 localStorage/cookie 中的登录态，避免刷新后被 ProtectedRoute 踢回 /login
initAuth()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
