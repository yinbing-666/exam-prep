import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAuth } from './stores/auth'
import { migrateLegacySubjectPrefs } from './utils/subjects'
import './index.css'

// 渲染前恢复 localStorage/cookie 中的登录态，避免刷新后被 ProtectedRoute 踢回 /login
initAuth()
// 一次性迁移：旧版本地科目的考试日期/每日时长 → 按科目名的偏好映射（旧数据保留）
migrateLegacySubjectPrefs()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
