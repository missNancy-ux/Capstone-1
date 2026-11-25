import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell, type PortalTab } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompanyPortalPage } from './pages/CompanyPortalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

type AuthRoute = 'login' | 'register';

function getInitialAuthRoute(): AuthRoute {
  return window.location.pathname === '/register' ? 'register' : 'login';
}

function MainRouter() {
  const { user, isAdmin } = useAuth();
  const [authRoute, setAuthRoute] = useState<AuthRoute>(getInitialAuthRoute);
  const [activeTab, setActiveTab] = useState<PortalTab>('opportunities');

  useEffect(() => {
    const onPopState = () => {
      setAuthRoute(window.location.pathname === '/register' ? 'register' : 'login');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (user) {
      setAuthRoute('login');
    }
    if (user?.role === 'company') {
      setActiveTab('company');
    } else if (user?.role === 'admin') {
      setActiveTab('admin');
    } else if (user?.role === 'student') {
      setActiveTab('opportunities');
    }
  }, [user]);

  const navigateAuth = (target: AuthRoute) => {
    setAuthRoute(target);
    const nextPath = target === 'register' ? '/register' : '/login';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  if (!user) {
    if (authRoute === 'register') {
      return <RegisterPage onNavigateLogin={() => navigateAuth('login')} />;
    }
    return <LoginPage onNavigateRegister={() => navigateAuth('register')} />;
  }

  return (
    <AppShell activeTab={activeTab} onSelectTab={setActiveTab}>
      {activeTab === 'opportunities' && (
        <OpportunitiesPage onGoToApplications={() => setActiveTab('applications')} />
      )}
      {activeTab === 'applications' && (
        <ApplicationsPage onBrowseOpportunities={() => setActiveTab('opportunities')} />
      )}
      {activeTab === 'company' && <CompanyPortalPage />}
      {activeTab === 'admin' && isAdmin && <AdminDashboardPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
