import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkoutProvider } from './contexts/WorkoutContext';
import { ToastContainer } from './components/Toast';
import { MainLayout } from './components/layout/MainLayout';
import { Feed } from './pages/Feed';
import { Shop } from './pages/Shop';
import { WorkoutPlan } from './pages/WorkoutPlan';
import { NewWorkout } from './pages/NewWorkout';
import { ActiveWorkoutWrapper } from './components/ActiveWorkoutWrapper';
import { Diet } from './pages/Diet';
import { Premium } from './pages/Premium';
import { Profile } from './pages/Profile';
import { AuthLogin } from './pages/AuthLogin';
import { AuthSignUp } from './pages/AuthSignUp';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { DataDeletion } from './pages/DataDeletion';
import { Loader2 } from 'lucide-react';
import { ForgottenWorkoutManager } from './components/ForgottenWorkoutManager';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <Loader2 size={32} className="animate-spin text-[#1D63FF]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <Loader2 size={32} className="animate-spin text-[#1D63FF]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes — full screen, no MainLayout */}
      <Route path="/login" element={<PublicRoute><AuthLogin /></PublicRoute>} />
      <Route path="/auth/cadastro" element={<PublicRoute><AuthSignUp /></PublicRoute>} />
      <Route path="/privacidade" element={<PrivacyPolicy />} />
      <Route path="/excluir-dados" element={<DataDeletion />} />

      {/* Protected full screen routes */}
      <Route path="/treino/novo" element={<ProtectedRoute><NewWorkout /></ProtectedRoute>} />
      <Route path="/treino/executar" element={<ProtectedRoute><></></ProtectedRoute>} />

      {/* Protected routes with MainLayout */}
      <Route path="*" element={
        <ProtectedRoute>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/perfil/:userId" element={<Profile />} />
              <Route path="/loja" element={<Shop />} />
              <Route path="/treino" element={<WorkoutPlan />} />
              <Route path="/dieta" element={<Diet />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MainLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <WorkoutProvider>
        <Router>
          <ToastContainer />
          <AppRoutes />
          <ActiveWorkoutWrapper />
          <ForgottenWorkoutManager />
        </Router>
      </WorkoutProvider>
    </AuthProvider>
  );
}

export default App;
