import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import EditorDashboard from './pages/EditorDashboard';
import PublicProfile from './pages/PublicProfile';
import NotFound from './pages/NotFound';
import { WebGLShader } from './components/ui/web-gl-shader';
import Home from './pages/Home';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)", scale: 1.02 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen w-full flex flex-col"
    >
      {children}
    </motion.div>
  );
};

function BackgroundOverlay() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  
  return (
    <motion.div 
      initial={false}
      animate={{ 
        backdropFilter: isLandingPage ? "blur(0px)" : "blur(24px)",
        backgroundColor: isLandingPage ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.6)"
      }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[1] pointer-events-none"
    />
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  const getBaseRoute = (pathname: string) => {
    if (pathname.startsWith('/editor')) return '/editor';
    return pathname;
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={getBaseRoute(location.pathname)}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/activate" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/editor/*" element={
          <ProtectedRoute>
            <PageWrapper>
              <EditorDashboard />
            </PageWrapper>
          </ProtectedRoute>
        } />
        <Route path="/profile/:username" element={<PageWrapper><PublicProfile /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0D0F12] text-[#E8ECF0] font-sans relative overflow-hidden">
          {/* WebGL Shader Background Layer */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <WebGLShader />
          </div>
          
          {/* Persistent Dynamic Overlay for non-landing pages */}
          <BackgroundOverlay />
          
          {/* Main Content Layer */}
          <div className="relative z-10 min-h-screen">
            <AnimatedRoutes />
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
