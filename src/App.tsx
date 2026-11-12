import { useCallback, useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import {
  ForgotPasswordView,
  LoginView,
  RegisterView,
  ResetPasswordView,
} from './components/AuthViews';
import { DashboardView } from './components/DashboardView';
import { ProfileView } from './components/ProfileView';
import { MailpitView } from './components/MailpitView';
import { LaravelSourceView } from './components/LaravelSourceView';
import { apiRequest, setStoredSessionToken } from './lib/api';
import { AppView, MailMessage, User } from './types/auth';

function parseRouteFromLocation(): {
  view: AppView;
  token: string;
  email: string;
} {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  if (path === '/register') return { view: 'register', token, email };
  if (path === '/forgot-password') return { view: 'forgot-password', token, email };
  if (path === '/reset-password') return { view: 'reset-password', token, email };
  if (path === '/verify-email') return { view: 'verify-email', token, email };
  if (path === '/profile') return { view: 'profile', token, email };
  if (path === '/mailpit') return { view: 'mailpit', token, email };
  if (path === '/laravel-source') return { view: 'laravel-source', token, email };
  if (path === '/dashboard') return { view: 'dashboard', token, email };
  return { view: 'login', token, email };
}

function viewToPath(view: AppView): string {
  switch (view) {
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'forgot-password':
      return '/forgot-password';
    case 'reset-password':
      return '/reset-password';
    case 'verify-email':
      return '/verify-email';
    case 'dashboard':
      return '/dashboard';
    case 'profile':
      return '/profile';
    case 'mailpit':
      return '/mailpit';
    case 'laravel-source':
      return '/laravel-source';
  }
}

export default function App() {
  const initial = parseRouteFromLocation();
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [activeView, setActiveView] = useState<AppView>(initial.view);
  const [resetToken, setResetToken] = useState(initial.token);
  const [resetEmail, setResetEmail] = useState(initial.email);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [unreadMailCount, setUnreadMailCount] = useState(0);

  const refreshMailCount = useCallback(async () => {
    try {
      const res = await apiRequest<{ messages: MailMessage[] }>('/api/mail');
      setUnreadMailCount(res.messages.filter((m) => !m.readAt).length);
    } catch {
      setUnreadMailCount(0);
    }
  }, []);

  const navigate = useCallback((view: AppView, query = '') => {
    const nextPath = `${viewToPath(view)}${query}`;
    if (window.location.pathname + window.location.search !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setActiveView(view);
  }, []);

  const verifyEmailWithToken = useCallback(
    async (token: string) => {
      try {
        const res = await apiRequest<{ user: User; message: string }>('/api/auth/verify-email', {
          method: 'POST',
          body: { token },
        });
        setUser(res.user);
        setLoginStatus(res.message);
        navigate('dashboard');
      } catch {
        setLoginStatus('The verification link is invalid or has expired.');
        navigate(user ? 'dashboard' : 'login');
      }
    },
    [navigate, user],
  );

  useEffect(() => {
    async function bootstrap() {
      setBooting(true);
      try {
        const me = await apiRequest<{ user: User | null }>('/api/auth/me');
        setUser(me.user);

        const parsed = parseRouteFromLocation();
        if (parsed.view === 'verify-email' && parsed.token) {
          await verifyEmailWithToken(parsed.token);
        } else if (me.user && ['login', 'register', 'forgot-password'].includes(parsed.view)) {
          navigate('dashboard');
        } else if (!me.user && ['dashboard', 'profile'].includes(parsed.view)) {
          navigate('login');
        }
      } finally {
        setBooting(false);
        refreshMailCount();
      }
    }
    bootstrap();
  }, [navigate, refreshMailCount]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseRouteFromLocation();
      setResetToken(parsed.token);
      setResetEmail(parsed.email);
      setActiveView(parsed.view);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  async function handleLogout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network/session errors during logout
    }
    setStoredSessionToken(null);
    setUser(null);
    setLoginStatus('You have been signed out.');
    navigate('login');
  }

  async function handleMailAction(actionPath: string) {
    const url = new URL(actionPath, window.location.origin);
    const token = url.searchParams.get('token') ?? '';
    const email = url.searchParams.get('email') ?? '';

    if (url.pathname === '/verify-email' && token) {
      await verifyEmailWithToken(token);
      return;
    }

    if (url.pathname === '/reset-password') {
      setResetToken(token);
      setResetEmail(email);
      navigate('reset-password', url.search);
    }
  }

  const effectiveView: AppView = (() => {
    if (!user && (activeView === 'dashboard' || activeView === 'profile')) {
      return 'login';
    }
    if (user && (activeView === 'login' || activeView === 'register')) {
      return 'dashboard';
    }
    return activeView;
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar
        user={user}
        activeView={effectiveView}
        unreadMailCount={unreadMailCount}
        onNavigate={(view) => {
          setLoginStatus(null);
          navigate(view);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {booting ? (
          <div className="max-w-5xl mx-auto px-6 py-16 text-sm text-slate-500">
            Restoring session...
          </div>
        ) : effectiveView === 'login' ? (
          <LoginView
            statusMessage={loginStatus}
            onSuccess={(signedInUser) => {
              setUser(signedInUser);
              setLoginStatus(null);
              navigate('dashboard');
            }}
            onNavigate={(view) => {
              setLoginStatus(null);
              navigate(view);
            }}
          />
        ) : effectiveView === 'register' ? (
          <RegisterView
            onSuccess={(createdUser) => {
              setUser(createdUser);
              refreshMailCount();
              navigate('dashboard');
            }}
            onNavigate={(view) => navigate(view)}
          />
        ) : effectiveView === 'forgot-password' ? (
          <ForgotPasswordView
            onNavigate={(view) => navigate(view)}
            onMailDispatched={refreshMailCount}
          />
        ) : effectiveView === 'reset-password' ? (
          <ResetPasswordView
            initialToken={resetToken}
            initialEmail={resetEmail}
            onSuccess={(msg) => {
              setLoginStatus(msg);
              navigate('login');
            }}
            onNavigate={(view) => navigate(view)}
          />
        ) : effectiveView === 'dashboard' && user ? (
          <DashboardView
            user={user}
            onUserUpdated={setUser}
            onNavigate={(view) => navigate(view)}
            onSessionSelfRevoked={() => {
              setStoredSessionToken(null);
              setUser(null);
              setLoginStatus('Your session was revoked or expired.');
              navigate('login');
            }}
            onMailDispatched={refreshMailCount}
          />
        ) : effectiveView === 'profile' && user ? (
          <ProfileView
            user={user}
            onUserUpdated={setUser}
            onAccountDeleted={() => {
              setStoredSessionToken(null);
              setUser(null);
              setLoginStatus('Your account has been permanently deleted.');
              navigate('login');
            }}
            onMailDispatched={refreshMailCount}
          />
        ) : effectiveView === 'mailpit' ? (
          <MailpitView
            onTriggerAction={handleMailAction}
            onMessagesChanged={refreshMailCount}
          />
        ) : (
          <LaravelSourceView />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>ForgeAuth — Full-Stack Authentication Suite</span>
          <span>Laravel 11 · Vue 3 · Inertia.js · Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}
