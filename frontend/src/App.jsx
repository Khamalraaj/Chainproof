import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ShipmentDetails from './pages/ShipmentDetails';
import CreateShipment from './pages/CreateShipment';
import Login from './pages/Login';
import MediatorHandoff from './pages/MediatorHandoff';
import ManagerSignoff from './pages/ManagerSignoff';
import ConsumerSearch from './pages/ConsumerSearch';
import ConsumerDashboard from './pages/ConsumerDashboard';
import DriverScan from './pages/DriverScan';
import AboutPage from './pages/AboutPage';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/about" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/about" />;
  return children;
};


function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* ── Public full-page routes (own header/footer) ── */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/driver-scan" element={<DriverScan />} />

      {/* ── Authenticated routes (shared Navbar + layout) ── */}
      <Route path="/*" element={
        <>
          <Navbar />
          <div className="layout-container">
            <Routes>
              <Route path="/search" element={
                <ProtectedRoute>
                  <ConsumerSearch />
                </ProtectedRoute>
              } />
              <Route path="/shipment/:id" element={
                <ProtectedRoute>
                  <ShipmentDetails />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                user ? (
                  <ProtectedRoute>
                    {user.role === 'mediator' ? <Navigate to="/handoff" /> :
                     (user.role === 'consumer' || user.role === 'customer') ? <Navigate to="/search" /> : <Dashboard />}
                  </ProtectedRoute>
                ) : <Navigate to="/about" />
              } />

              <Route path="/consumer" element={<Navigate to="/search" />} />
              <Route path="/create" element={
                <ProtectedRoute allowedRoles={['manager', 'senior_manager']}>
                  <CreateShipment />
                </ProtectedRoute>
              } />
              <Route path="/signoff" element={
                <ProtectedRoute allowedRoles={['manager', 'senior_manager']}>
                  <ManagerSignoff />
                </ProtectedRoute>
              } />
              <Route path="/handoff" element={<MediatorHandoff />} />
            </Routes>
          </div>
        </>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
