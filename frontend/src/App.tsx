import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DutyProvider, useDuty } from './context/DutyContext';
import { SyncProvider } from './context/SyncContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AdminDashboard } from './pages/AdminDashboard';
import { CashierPortal } from './pages/CashierPortal';
import { DutyClosingPage } from './pages/DutyClosingPage';
import { CustomerPortal } from './pages/CustomerPortal';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { HistoricalLedgerPage } from './pages/HistoricalLedgerPage';
import { SettingsPage } from './pages/SettingsPage';
import { InitialSetupPage } from './pages/auth/InitialSetupPage';
import { LoginPage } from './pages/auth/LoginPage';
import { InternetOfflineModal } from './components/InternetOfflineModal';

const AppContent: React.FC = () => {
  const { currentUser, isInitialSetup } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const saved = localStorage.getItem('bunk_current_page');
    if (saved) return saved;
    return 'dashboard';
  });

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem('bunk_current_page', page);
  };

  // If no users exist in database, display initial Setup Wizard
  if (isInitialSetup) {
    return <InitialSetupPage />;
  }

  // If users exist but no active session is selected, display Login page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Auto-switch default page based on active role if not already valid
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem('bunk_current_page');
      if (!saved) {
        if (currentUser.role === 'ADMIN') {
          handleNavigate('dashboard');
        } else if (currentUser.role === 'CASHIER' || currentUser.role === 'SUPPORT_CASHIER') {
          handleNavigate('cashier');
        } else if (currentUser.role === 'CUSTOMER') {
          handleNavigate('customer');
        }
      }
    }
  }, [currentUser?.role]);

  const renderPage = () => {
    const role = currentUser?.role;
    switch (currentPage) {
      case 'dashboard':
        return role === 'ADMIN' ? <AdminDashboard onNavigate={handleNavigate} /> : <CashierPortal onNavigate={handleNavigate} />;
      case 'cashier':
        return <CashierPortal onNavigate={handleNavigate} />;
      case 'closing':
        return role === 'ADMIN' ? <DutyClosingPage onNavigate={handleNavigate} /> : <CashierPortal onNavigate={handleNavigate} />;
      case 'customer':
        return <CustomerPortal />;
      case 'staff':
        return role === 'ADMIN' ? <StaffManagementPage /> : <CashierPortal onNavigate={handleNavigate} />;
      case 'history':
        return <HistoricalLedgerPage />;
      case 'settings':
        return role === 'ADMIN' ? <SettingsPage /> : <CashierPortal onNavigate={handleNavigate} />;
      default:
        return role === 'ADMIN' ? <AdminDashboard onNavigate={handleNavigate} /> : <CashierPortal />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

        <main className="flex-1 p-4 md:p-8 min-w-0 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DutyProvider>
          <SyncProvider>
            <InternetOfflineModal />
            <AppContent />
          </SyncProvider>
        </DutyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
