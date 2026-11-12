import { AppView, User } from '../types/auth';

interface TopBarProps {
  user: User | null;
  activeView: AppView;
  unreadMailCount: number;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

export function TopBar({
  user,
  activeView,
  unreadMailCount,
  onNavigate,
  onLogout,
}: TopBarProps) {
  const navItems: Array<{ label: string; view: AppView }> = user
    ? [
        { label: 'Overview', view: 'dashboard' },
        { label: 'Profile & Security', view: 'profile' },
        {
          label: unreadMailCount > 0 ? `Mailpit Inbox (${unreadMailCount})` : 'Mailpit Inbox',
          view: 'mailpit',
        },
        { label: 'Laravel Source', view: 'laravel-source' },
      ]
    : [
        { label: 'Sign In', view: 'login' },
        { label: 'Create Account', view: 'register' },
        {
          label: unreadMailCount > 0 ? `Mailpit Inbox (${unreadMailCount})` : 'Mailpit Inbox',
          view: 'mailpit',
        },
        { label: 'Laravel Source', view: 'laravel-source' },
      ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onNavigate(user ? 'dashboard' : 'login')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
        >
          ForgeAuth
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-sm ${
                  isActive
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Sign Out
            </button>
          ) : (
            <a
              href="/api/laravel/download"
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Export Laravel Zip
            </a>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 px-6 py-2 flex items-center gap-5 overflow-x-auto text-xs font-medium text-slate-600">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`whitespace-nowrap shrink-0 py-1 ${
                isActive ? 'text-slate-900 font-semibold underline underline-offset-4' : 'hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
