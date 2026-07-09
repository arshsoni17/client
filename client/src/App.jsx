import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Layout/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Board from './pages/Board'
import JoinBoard from './pages/JoinBoard'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import './index.css'

//
import ForgotPassword from './pages/ForgotPassword'
//

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  return !user ? children : <Navigate to="/dashboard" replace />
}

// Board is full screen — no Navbar
function AppRoutes() {
  return (
    <Routes>
      <Route path="/board/:boardId" element={
        <ProtectedRoute><Board /></ProtectedRoute>
      } />
      <Route path="/join/:token" element={<JoinBoard />} />
      <Route path="/*" element={<WithNavbar />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
    </Routes>
  )
}

function WithNavbar() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}