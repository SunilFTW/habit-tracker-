import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Discipline from './pages/Discipline';
import HardThing from './pages/HardThing';
import Fitness from './pages/Fitness';
import DesignerGrowth from './pages/DesignerGrowth';
import LifeManagement from './pages/LifeManagement';
import Skincare from './pages/Skincare';
import Haircare from './pages/Haircare';
import FutureSelf from './pages/FutureSelf';
import WinsVault from './pages/WinsVault';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected App Routes */}
        <Route path="/app/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/discipline" element={<Discipline />} />
                <Route path="/hard-thing" element={<HardThing />} />
                <Route path="/fitness" element={<Fitness />} />
                <Route path="/growth" element={<DesignerGrowth />} />
                <Route path="/life" element={<LifeManagement />} />
                <Route path="/skincare" element={<Skincare />} />
                <Route path="/haircare" element={<Haircare />} />
                <Route path="/future-self" element={<FutureSelf />} />
                <Route path="/wins" element={<WinsVault />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
