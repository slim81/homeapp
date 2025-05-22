import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Global, css } from '@emotion/react';
import { ThemeProvider } from './theme/ThemeProvider';
import { HomeAssistantProvider } from './contexts/HomeAssistantContext';
import { SceneProvider } from './contexts/SceneContext';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Lights } from './pages/Lights';
import { Scenes } from './pages/Scenes';
import { Music } from './pages/Music';
import { Developer } from './pages/Developer';
import { useHomeAssistant } from './contexts/HomeAssistantContext';

// Global styles
const globalStyles = css`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    font-family: 'Roboto', Arial, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    height: 100%;
    overflow: hidden; /* Prevent scrolling on tablet */
  }
  
  /* Optimize for tablet display */
  @media (max-width: 1024px) {
    html {
      font-size: 14px;
    }
  }
  
  /* Forced landscape mode */
  @media (orientation: portrait) {
    html, body {
      height: 100vh;
      overflow: hidden;
    }
  }
`;

// Protected route component with connection persistence
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isConnected, isConnecting } = useHomeAssistant();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // When the component mounts or connection state changes, update loading state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Give time for connection to establish
    
    return () => clearTimeout(timer);
  }, [isConnected, isConnecting]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Only redirect if not connected and not in the process of connecting
  if (!isConnected && !isConnecting) {
    console.log('Not connected and not connecting, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="lights" 
          element={
            <ProtectedRoute>
              <Lights />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="scenes" 
          element={
            <ProtectedRoute>
              <Scenes />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="music" 
          element={
            <ProtectedRoute>
              <Music />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="developer" 
          element={
            <ProtectedRoute>
              <Developer />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Global styles={globalStyles} />
      <HomeAssistantProvider>
        <SceneProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SceneProvider>
      </HomeAssistantProvider>
    </ThemeProvider>
  );
}