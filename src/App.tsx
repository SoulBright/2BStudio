import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomeRedirect } from './pages/HomeRedirect'
import { LoginPage } from './pages/LoginPage'
import { MyTasksPage } from './pages/MyTasksPage'
import { ObjectPage } from './pages/ObjectPage'
import { ObjectsPage } from './pages/ObjectsPage'
import { TaskPage } from './pages/TaskPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="objects" element={<ObjectsPage />} />
              <Route path="objects/:id" element={<ObjectPage />} />
              <Route path="tasks/:id" element={<TaskPage />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
