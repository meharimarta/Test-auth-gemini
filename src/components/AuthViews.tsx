import React, { useState } from 'react';
import { Eye, EyeOff, Lock, MailCheck, ShieldCheck } from 'lucide-react';
import { ApiValidationError, apiRequest, setStoredSessionToken } from '../lib/api';
import { AppView, User } from '../types/auth';

interface AuthFormContainerProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function AuthFormContainer({ title, subtitle, children }: AuthFormContainerProps) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-12 gap-12 items-start">
      <div className="lg:col-span-5 lg:pt-4 space-y-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 text-balance">
            Session-first identity for Laravel &amp; Vue Inertia
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Test real scrypt-hashed registration, rate-limited login, signed email verification, and password recovery live—then export the full Laravel 11 + Vue 3 + Inertia.js + Tailwind CSS codebase for your repository.
          </p>
        </div>

        <dl className="pt-6 border-t border-slate-200 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
            <div>
              <dt className="font-medium text-slate-900">Cryptographic Session &amp; CSRF Guards</dt>
              <dd className="text-slate-600 mt-0.5">
                HttpOnly cookies paired with XSRF-TOKEN validation and per-user scrypt password hashing.
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MailCheck className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
            <div>
              <dt className="font-medium text-slate-900">Built-In Mailpit Verification Inbox</dt>
              <dd className="text-slate-600 mt-0.5">
                Inspect verification and password-reset emails instantly without external SMTP setup.
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
            <div>
              <dt className="font-medium text-slate-900">Rate Limiting &amp; Password Confirmation</dt>
              <dd className="text-slate-600 mt-0.5">
                5-attempt login lockout window plus re-authentication before destructive actions.
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="lg:col-span-7 flex justify-center lg:justify-end">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

interface LoginViewProps {
  statusMessage: string | null;
  onSuccess: (user: User) => void;
  onNavigate: (view: AppView) => void;
}

export function LoginView({ statusMessage, onSuccess, onNavigate }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await apiRequest<{ user: User; sessionToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password, remember },
      });
      if (res.sessionToken) {
        setStoredSessionToken(res.sessionToken);
      }
      onSuccess(res.user);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setErrors(err.errors);
        if (Object.keys(err.errors).length === 0) {
          setFormError(err.message);
        }
      } else {
        setFormError('Unable to reach authentication server.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount() {
    setEmail('demo@forgeauth.dev');
    setPassword('password123');
    setErrors({});
    setFormError(null);
  }

  return (
    <AuthFormContainer
      title="Sign in to your account"
      subtitle="Enter your email and password to start an authenticated session."
    >
      {statusMessage && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
          {statusMessage}
        </div>
      )}

      {formError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-900"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span className="text-sm text-slate-600">Keep me signed in (30 days)</span>
          </label>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={fillDemoAccount}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Fill Demo Credentials (demo@forgeauth.dev)
          </button>
        </div>
      </form>

      <p className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
        Need an account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('register')}
          className="font-medium text-slate-900 hover:underline underline-offset-4"
        >
          Create one
        </button>
      </p>
    </AuthFormContainer>
  );
}

interface RegisterViewProps {
  onSuccess: (user: User) => void;
  onNavigate: (view: AppView) => void;
}

export function RegisterView({ onSuccess, onNavigate }: RegisterViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const res = await apiRequest<{ user: User; sessionToken?: string }>('/api/auth/register', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        },
      });
      if (res.sessionToken) {
        setStoredSessionToken(res.sessionToken);
      }
      onSuccess(res.user);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setErrors(err.errors);
      } else {
        setErrors({ email: 'Registration failed. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormContainer
      title="Create your account"
      subtitle="Register with your name, email address, and a password of at least 8 characters."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Full Name
          </label>
          <input
            id="reg-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.name && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@analytical.org"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm Password
          </label>
          <input
            id="reg-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.password_confirmation && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password_confirmation}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
        Already registered?{' '}
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="font-medium text-slate-900 hover:underline underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </AuthFormContainer>
  );
}

interface ForgotPasswordViewProps {
  onNavigate: (view: AppView) => void;
  onMailDispatched: () => void;
}

export function ForgotPasswordView({ onNavigate, onMailDispatched }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setStatus(null);
    setSubmitting(true);

    try {
      const res = await apiRequest<{ status: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setStatus(res.status);
      onMailDispatched();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setErrors(err.errors);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormContainer
      title="Reset your password"
      subtitle="Enter your account email and we will dispatch a signed reset link to the Mailpit Inbox."
    >
      {status && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 space-y-2">
          <p className="font-medium">{status}</p>
          <button
            type="button"
            onClick={() => onNavigate('mailpit')}
            className="text-xs font-semibold underline underline-offset-4 hover:text-emerald-950"
          >
            Open Mailpit Inbox
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@forgeauth.dev"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Sending link...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
        Remembered your password?{' '}
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="font-medium text-slate-900 hover:underline underline-offset-4"
        >
          Back to sign in
        </button>
      </p>
    </AuthFormContainer>
  );
}

interface ResetPasswordViewProps {
  initialToken: string;
  initialEmail: string;
  onSuccess: (statusMsg: string) => void;
  onNavigate: (view: AppView) => void;
}

export function ResetPasswordView({
  initialToken,
  initialEmail,
  onSuccess,
  onNavigate,
}: ResetPasswordViewProps) {
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const res = await apiRequest<{ status: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        },
      });
      onSuccess(res.status);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setErrors(err.errors);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormContainer
      title="Choose a new password"
      subtitle="Verify your reset token and set a new password for your account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="reset-token" className="block text-sm font-medium text-slate-700 mb-1.5">
            Reset Token
          </label>
          <input
            id="reset-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700 mb-1.5">
            New Password
          </label>
          <input
            id="reset-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="reset-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm New Password
          </label>
          <input
            id="reset-confirm"
            type="password"
            required
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {errors.password_confirmation && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password_confirmation}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Updating password...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="font-medium text-slate-900 hover:underline underline-offset-4"
        >
          Return to sign in
        </button>
      </p>
    </AuthFormContainer>
  );
}
