import React, { useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import StationsPage from './pages/StationsPage';
import StationDetailPage from './pages/StationDetailPage';
import CreateAppointmentPage from './pages/CreateAppointmentPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import RecyclerOrdersPage from './pages/RecyclerOrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

interface NavParams {
  stationId?: number;
  stationName?: string;
}

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('stations');
  const [navParams, setNavParams] = useState<NavParams>({});

  const handleNavigate = useCallback((page: string, params?: NavParams) => {
    setCurrentPage(page);
    if (params) {
      setNavParams(prev => ({ ...prev, ...params }));
    }
  }, []);

  if (loading) {
    return <div className="loading" style={{ paddingTop: 100 }}>加载中...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  // Set default page based on role
  const effectivePage = (currentPage === 'stations' && user.role === 'admin') ? 'admin' : currentPage;

  const renderPage = () => {
    switch (effectivePage) {
      case 'stations':
        return <StationsPage onNavigate={handleNavigate} />;
      case 'station-detail':
        return <StationDetailPage stationId={navParams.stationId || 0} onNavigate={handleNavigate} />;
      case 'create-appointment':
        return <CreateAppointmentPage stationId={navParams.stationId || 0} stationName={navParams.stationName || ''} onNavigate={handleNavigate} />;
      case 'appointments':
        return <MyAppointmentsPage />;
      case 'recycler-orders':
        return <RecyclerOrdersPage />;
      case 'profile':
        return <ProfilePage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <StationsPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app">
      <Navbar currentPage={effectivePage} onNavigate={handleNavigate} />
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
}
