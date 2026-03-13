import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Maintenance from './pages/Maintenance';
import Inventory from './pages/Inventory';
import Configuration from './pages/Configuration';
import Login from './pages/Login';

const AppRoutes = () => {
  const { user } = useAuth();
  const userRole = (user?.role || user?.Role || '').toString().toUpperCase().trim();
  const isAdmin = userRole === 'ADMIN';

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="inventory" element={<Inventory />} />
          {isAdmin && <Route path="config" element={<Configuration />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
