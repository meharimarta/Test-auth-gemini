import { useEffect, useState } from 'react';
import { apiRequest, ApiValidationError } from '../lib/api';
import { ActiveSession, AppView, AuditLog, User } from '../types/auth';

interface DashboardViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onNavigate: (view: AppView) => void;
  onSessionSelfRevoked: () => void;
  onMailDispatched: () => void;
}

export function DashboardView({
  user,
  onUserUpdated,
  onNavigate,
  onSessionSelfRevoked,
  onMailDispatched,
}: DashboardViewProps) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [sessionsRes, logsRes] = await Promise.all([
        apiRequest<{ sessions: ActiveSession[] }>('/api/sessions'),
        apiRequest<{ logs: AuditLog[] }>('/api/audit-logs'),
      ]);
      setSessions(sessionsRes.sessions);
      setAuditLogs(logsRes.logs);
    } catch (err) {
      if (err instanceof ApiValidationError && err.status === 401) {
        onSessionSelfRevoked();
        return;
      }
      setVerifyError(
        err instanceof Error ? err.message : 'Unable to load session data.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleResendVerification() {
    setBusyAction(true);
    setNotice(null);
    setVerifyError(null);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/verification-notification', {
        method: 'POST',
      });
      setNotice(res.message);
      onMailDispatched();
    } catch (err) {
      if (err instanceof ApiValidationError && err.status === 401) {
        onSessionSelfRevoked();
        return;
      }
      setVerifyError(err instanceof Error ? err.message : 'Unable to resend verification email.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleVerifyTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setBusyAction(true);
    try {
      const res = await apiRequest<{ user: User; message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: { token: verifyTokenInput.trim() },
      });
      onUserUpdated(res.user);
      setNotice(res.message);
      setVerifyTokenInput('');
      await loadDashboardData();
    } catch (err) {
      setVerifyError(err instanceof ApiValidationError ? err.message : 'Verification failed.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const res = await apiRequest<{ message: string; selfRevoked: boolean }>(
        `/api/sessions/${sessionId}`,
        { method: 'DELETE' },
      );
      if (res.selfRevoked) {
        onSessionSelfRevoked();
        return;
      }
      setNotice(res.message);
      await loadDashboardData();
    } catch (err) {
      if (err instanceof ApiValidationError && err.status === 401) {
        onSessionSelfRevoked();
        return;
      }
      setVerifyError(err instanceof Error ? err.message : 'Unable to revoke session.');
    }
  }

  async function handleRevokeOtherSessions() {
    setBusyAction(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/sessions', {
        method: 'DELETE',
      });
      setNotice(res.message);
      await loadDashboardData();
    } catch (err) {
      if (err instanceof ApiValidationError && err.status === 401) {
        onSessionSelfRevoked();
        return;
      }
      setVerifyError(err instanceof Error ? err.message : 'Unable to sign out other devices.');
    } finally {
      setBusyAction(false);
    }
  }

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            Welcome back, {user.name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            <span>{user.email}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className={user.emailVerifiedAt ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
              {user.emailVerifiedAt ? 'Email Verified' : 'Pending Email Verification'}
            </span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{sessions.length} active session{sessions.length === 1 ? '' : 's'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Edit Profile
          </button>
          {sessions.length > 1 && (
            <button
              type="button"
              disabled={busyAction}
              onClick={handleRevokeOtherSessions}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              Sign Out Other Devices
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {!user.emailVerifiedAt && (
        <section className="bg-amber-50/70 border border-amber-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Email verification required
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                A verification email was sent to <span className="font-medium text-slate-900">{user.email}</span> in the Mailpit Inbox. Click the link inside that email or paste the verification token below.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('mailpit')}
                className="px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Open Mailpit Inbox
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={handleResendVerification}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                Resend Email
              </button>
            </div>
          </div>

          <form onSubmit={handleVerifyTokenSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              value={verifyTokenInput}
              onChange={(e) => setVerifyTokenInput(e.target.value)}
              placeholder="Paste verification token..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busyAction || !verifyTokenInput.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Verify Token
            </button>
          </form>
          {verifyError && <p className="text-xs font-medium text-red-600">{verifyError}</p>}
        </section>
      )}

      {/* Active Sessions Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Active Sessions</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Authenticated browser sessions stored on the server.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {sessions.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">IP Address</th>
                <th className="px-6 py-3 font-medium">User Agent</th>
                <th className="px-6 py-3 font-medium">Persistence</th>
                <th className="px-6 py-3 font-medium text-right">Last Active</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                    Loading active sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-mono text-xs tabular-nums text-slate-900 whitespace-nowrap">
                      {session.ipAddress}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">
                      {session.userAgent}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {session.remember ? 'Remembered (30d)' : 'Standard (2h)'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs tabular-nums text-slate-500 text-right whitespace-nowrap">
                      {formatTimestamp(session.lastActiveAt)}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {session.isCurrentDevice ? (
                        <span className="text-xs font-medium text-emerald-700">Current device</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Authentication Audit Log */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Authentication Activity</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Chronological record of sign-ins, verifications, password changes, and revocations.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {auditLogs.length} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Event</th>
                <th className="px-6 py-3 font-medium">IP Address</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-500">
                    No authentication events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 12).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                      {log.event}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600 max-w-sm truncate">
                      {log.userAgent}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs tabular-nums text-slate-500 text-right whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
