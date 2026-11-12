import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import express, { NextFunction, Request, Response } from 'express';
import JSZip from 'jszip';

const PORT = 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, '.auth-data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const LARAVEL_DIR = path.join(ROOT_DIR, 'laravel-inertia-vue-auth');
const SESSION_COOKIE = 'forgeauth_session';
const XSRF_COOKIE = 'XSRF-TOKEN';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  remember: boolean;
  passwordConfirmedAt: string | null;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
}

interface VerificationTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

interface PasswordResetRecord {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

interface MailMessageRecord {
  id: string;
  to: string;
  subject: string;
  type: 'verify_email' | 'password_reset' | 'security_alert';
  actionPath: string | null;
  token: string | null;
  body: string;
  sentAt: string;
  readAt: string | null;
}

interface AuditLogRecord {
  id: string;
  userId: string | null;
  email: string;
  event: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface StoreData {
  users: UserRecord[];
  sessions: SessionRecord[];
  emailVerifications: VerificationTokenRecord[];
  passwordResets: PasswordResetRecord[];
  mailInbox: MailMessageRecord[];
  auditLogs: AuditLogRecord[];
}

interface RateLimitBucket {
  attempts: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitBucket>();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derived);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createEmptyStore(): StoreData {
  const now = new Date().toISOString();
  const demoUserId = crypto.randomUUID();
  return {
    users: [
      {
        id: demoUserId,
        name: 'Elena Vance',
        email: 'demo@forgeauth.dev',
        passwordHash: hashPassword('password123'),
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    sessions: [],
    emailVerifications: [],
    passwordResets: [],
    mailInbox: [
      {
        id: crypto.randomUUID(),
        to: 'demo@forgeauth.dev',
        subject: 'Welcome to ForgeAuth — Demo Account Ready',
        type: 'security_alert',
        actionPath: null,
        token: null,
        body: 'Your demo account (demo@forgeauth.dev / password123) is pre-verified and ready. Register a new account or trigger a password reset to inspect live signed links here.',
        sentAt: now,
        readAt: null,
      },
    ],
    auditLogs: [
      {
        id: crypto.randomUUID(),
        userId: demoUserId,
        email: 'demo@forgeauth.dev',
        event: 'account.seeded',
        ipAddress: '127.0.0.1',
        userAgent: 'ForgeAuth System Seeder',
        createdAt: now,
      },
    ],
  };
}

function ensureStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createEmptyStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    const fallback = createEmptyStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveStore(store: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function getUserAgent(req: Request): string {
  return String(req.headers['user-agent'] || 'Unknown Client').slice(0, 180);
}

function serializeUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function isHttpsRequest(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function setSessionCookies(
  req: Request,
  res: Response,
  rawSessionToken: string,
  remember: boolean,
): void {
  const maxAgeSeconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 2;
  const xsrf = crypto.randomBytes(24).toString('hex');
  const https = isHttpsRequest(req);
  const sameSite: 'none' | 'lax' = https ? 'none' : 'lax';

  res.cookie(SESSION_COOKIE, rawSessionToken, {
    httpOnly: true,
    sameSite,
    secure: https,
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  });
  res.cookie(XSRF_COOKIE, xsrf, {
    httpOnly: false,
    sameSite,
    secure: https,
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  });
}

function clearSessionCookies(req: Request, res: Response): void {
  const https = isHttpsRequest(req);
  const opts = {
    path: '/',
    sameSite: (https ? 'none' : 'lax') as 'none' | 'lax',
    secure: https,
  };
  res.clearCookie(SESSION_COOKIE, opts);
  res.clearCookie(XSRF_COOKIE, opts);
}

function recordAudit(
  store: StoreData,
  req: Request,
  event: string,
  email: string,
  userId: string | null = null,
): void {
  store.auditLogs.unshift({
    id: crypto.randomUUID(),
    userId,
    email,
    event,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    createdAt: new Date().toISOString(),
  });
  if (store.auditLogs.length > 100) {
    store.auditLogs = store.auditLogs.slice(0, 100);
  }
}

function getAuthContext(req: Request, store: StoreData): { user: UserRecord | null; session: SessionRecord | null } {
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
  const cookies = parseCookies(req);
  const rawToken = bearerToken || cookies[SESSION_COOKIE];
  if (!rawToken) return { user: null, session: null };

  const tokenHash = sha256(rawToken);
  const now = Date.now();
  const session = store.sessions.find((s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > now);
  if (!session) return { user: null, session: null };

  const user = store.users.find((u) => u.id === session.userId) || null;
  if (!user) return { user: null, session: null };

  return { user, session };
}

function issueVerificationEmail(store: StoreData, user: UserRecord): void {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60);

  store.emailVerifications = store.emailVerifications.filter((v) => v.userId !== user.id);
  store.emailVerifications.push({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: sha256(rawToken),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  store.mailInbox.unshift({
    id: crypto.randomUUID(),
    to: user.email,
    subject: 'Verify Email Address — ForgeAuth',
    type: 'verify_email',
    actionPath: `/verify-email?token=${rawToken}`,
    token: rawToken,
    body: `Hello ${user.name}, please verify your email address (${user.email}) by clicking the verification link below. This signed token expires in 60 minutes.`,
    sentAt: now.toISOString(),
    readAt: null,
  });
}

function collectLaravelFiles(dir: string, base = ''): Array<{ path: string; content: string }> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: Array<{ path: string; content: string }> = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'vendor') continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectLaravelFiles(fullPath, relPath));
    } else {
      files.push({
        path: relPath,
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function validateCsrfIfPresent(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const cookies = parseCookies(req);
  const cookieToken = cookies[XSRF_COOKIE];
  const headerToken = req.headers['x-xsrf-token'];

  if (cookieToken && headerToken !== cookieToken) {
    res.status(419).json({
      message: 'CSRF token mismatch. Please refresh and try again.',
    });
    return;
  }
  next();
}

async function startServer() {
  ensureStore();
  const app = express();
  app.use(express.json());

  // Ensure XSRF-TOKEN cookie exists on initial visits (Laravel Sanctum / Inertia convention)
  app.use((req, res, next) => {
    const cookies = parseCookies(req);
    if (!cookies[XSRF_COOKIE]) {
      const https = isHttpsRequest(req);
      res.cookie(XSRF_COOKIE, crypto.randomBytes(24).toString('hex'), {
        httpOnly: false,
        sameSite: https ? 'none' : 'lax',
        secure: https,
        path: '/',
        maxAge: 1000 * 60 * 60 * 24,
      });
    }
    next();
  });

  app.use('/api', validateCsrfIfPresent);

  // Current auth state (Inertia shared props equivalent)
  app.get('/api/auth/me', (req, res) => {
    const store = ensureStore();
    const { user, session } = getAuthContext(req, store);
    if (!user || !session) {
      res.json({
        user: null,
        session: null,
      });
      return;
    }

    session.lastActiveAt = new Date().toISOString();
    saveStore(store);

    const passwordConfirmed =
      session.passwordConfirmedAt !== null &&
      Date.now() - new Date(session.passwordConfirmedAt).getTime() < 1000 * 60 * 15;

    res.json({
      user: serializeUser(user),
      session: {
        id: session.id,
        remember: session.remember,
        passwordConfirmed,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
      },
    });
  });

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, password_confirmation } = req.body ?? {};
    const errors: Record<string, string> = {};

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';
    const cleanConfirmation = typeof password_confirmation === 'string' ? password_confirmation : '';

    if (cleanName.length < 2) errors.name = 'The name field must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (cleanPassword.length < 8) {
      errors.password = 'The password field must be at least 8 characters.';
    }
    if (cleanPassword !== cleanConfirmation) {
      errors.password_confirmation = 'The password confirmation does not match.';
    }

    const store = ensureStore();
    if (!errors.email && store.users.some((u) => u.email === cleanEmail)) {
      errors.email = 'The email has already been taken.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(422).json({ message: 'Validation failed.', errors });
      return;
    }

    const now = new Date();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      emailVerifiedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    store.users.push(user);
    issueVerificationEmail(store, user);

    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: sha256(rawSessionToken),
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      remember: false,
      passwordConfirmedAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString(),
      createdAt: now.toISOString(),
    };
    store.sessions.push(session);

    recordAudit(store, req, 'user.registered', user.email, user.id);
    saveStore(store);

    setSessionCookies(req, res, rawSessionToken, false);
    res.status(201).json({
      user: serializeUser(user),
      sessionToken: rawSessionToken,
      message: 'Account created. Verification email dispatched to Mailpit Inbox.',
    });
  });

  // Login with rate limiting (5 attempts / 60s)
  app.post('/api/auth/login', (req, res) => {
    const { email, password, remember } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';
    const rememberBool = Boolean(remember);

    const throttleKey = `${cleanEmail}|${getClientIp(req)}`;
    const nowMs = Date.now();
    const bucket = loginAttempts.get(throttleKey);
    if (bucket && bucket.resetAt > nowMs && bucket.attempts >= 5) {
      const retryAfter = Math.ceil((bucket.resetAt - nowMs) / 1000);
      res.status(429).json({
        message: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        errors: {
          email: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        },
        retryAfter,
      });
      return;
    }

    const errors: Record<string, string> = {};
    if (!cleanEmail) errors.email = 'The email field is required.';
    if (!cleanPassword) errors.password = 'The password field is required.';
    if (Object.keys(errors).length > 0) {
      res.status(422).json({ message: 'Validation failed.', errors });
      return;
    }

    const store = ensureStore();
    const user = store.users.find((u) => u.email === cleanEmail);

    if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
      const nextBucket: RateLimitBucket =
        bucket && bucket.resetAt > nowMs
          ? { attempts: bucket.attempts + 1, resetAt: bucket.resetAt }
          : { attempts: 1, resetAt: nowMs + 60_000 };
      loginAttempts.set(throttleKey, nextBucket);

      recordAudit(store, req, 'auth.failed', cleanEmail, user?.id ?? null);
      saveStore(store);

      res.status(422).json({
        message: 'These credentials do not match our records.',
        errors: {
          email: 'These credentials do not match our records.',
        },
      });
      return;
    }

    loginAttempts.delete(throttleKey);
    const now = new Date();
    const ttlMs = rememberBool ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 2;
    const rawSessionToken = crypto.randomBytes(32).toString('hex');

    const session: SessionRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: sha256(rawSessionToken),
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      remember: rememberBool,
      passwordConfirmedAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      createdAt: now.toISOString(),
    };

    store.sessions.push(session);
    recordAudit(store, req, 'auth.login', user.email, user.id);
    saveStore(store);

    setSessionCookies(req, res, rawSessionToken, rememberBool);
    res.json({
      user: serializeUser(user),
      sessionToken: rawSessionToken,
      message: 'Signed in successfully.',
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const store = ensureStore();
    const { user, session } = getAuthContext(req, store);
    if (session) {
      store.sessions = store.sessions.filter((s) => s.id !== session.id);
      if (user) {
        recordAudit(store, req, 'auth.logout', user.email, user.id);
      }
      saveStore(store);
    }
    clearSessionCookies(req, res);
    res.json({ message: 'Signed out.' });
  });

  // Resend verification email
  app.post('/api/auth/verification-notification', (req, res) => {
    const store = ensureStore();
    const { user } = getAuthContext(req, store);
    if (!user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }
    if (user.emailVerifiedAt) {
      res.json({ status: 'already-verified', message: 'Email is already verified.' });
      return;
    }

    issueVerificationEmail(store, user);
    recordAudit(store, req, 'verification.resent', user.email, user.id);
    saveStore(store);

    res.json({
      status: 'verification-link-sent',
      message: 'A new verification link has been sent to the Mailpit Inbox.',
    });
  });

  // Verify email by token
  app.post('/api/auth/verify-email', (req, res) => {
    const { token } = req.body ?? {};
    if (typeof token !== 'string' || !token) {
      res.status(422).json({ message: 'Verification token is required.' });
      return;
    }

    const store = ensureStore();
    const tokenHash = sha256(token);
    const now = Date.now();
    const record = store.emailVerifications.find(
      (v) => v.tokenHash === tokenHash && new Date(v.expiresAt).getTime() > now,
    );

    if (!record) {
      res.status(422).json({ message: 'Invalid or expired verification token.' });
      return;
    }

    const user = store.users.find((u) => u.id === record.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    user.emailVerifiedAt = nowIso;
    user.updatedAt = nowIso;
    store.emailVerifications = store.emailVerifications.filter((v) => v.userId !== user.id);
    recordAudit(store, req, 'email.verified', user.email, user.id);
    saveStore(store);

    res.json({
      user: serializeUser(user),
      message: 'Email address verified successfully.',
    });
  });

  // Forgot password
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(422).json({
        message: 'Validation failed.',
        errors: { email: 'Please enter a valid email address.' },
      });
      return;
    }

    const store = ensureStore();
    const user = store.users.find((u) => u.email === cleanEmail);
    if (!user) {
      res.status(422).json({
        message: 'We cannot find a user with that email address.',
        errors: { email: 'We cannot find a user with that email address.' },
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    store.passwordResets = store.passwordResets.filter((r) => r.email !== cleanEmail);
    store.passwordResets.push({
      id: crypto.randomUUID(),
      email: cleanEmail,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
      createdAt: now.toISOString(),
    });

    store.mailInbox.unshift({
      id: crypto.randomUUID(),
      to: cleanEmail,
      subject: 'Reset Password Notification — ForgeAuth',
      type: 'password_reset',
      actionPath: `/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`,
      token: rawToken,
      body: `You are receiving this email because we received a password reset request for ${cleanEmail}. This reset link will expire in 60 minutes.`,
      sentAt: now.toISOString(),
      readAt: null,
    });

    recordAudit(store, req, 'password.reset_requested', cleanEmail, user.id);
    saveStore(store);

    res.json({
      status: 'We have emailed your password reset link to the Mailpit Inbox.',
    });
  });

  // Reset password
  app.post('/api/auth/reset-password', (req, res) => {
    const { token, email, password, password_confirmation } = req.body ?? {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';
    const cleanConfirmation = typeof password_confirmation === 'string' ? password_confirmation : '';

    const errors: Record<string, string> = {};
    if (typeof token !== 'string' || !token) errors.email = 'Reset token is missing.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) errors.email = 'Please enter a valid email address.';
    if (cleanPassword.length < 8) errors.password = 'The password field must be at least 8 characters.';
    if (cleanPassword !== cleanConfirmation) {
      errors.password_confirmation = 'The password confirmation does not match.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(422).json({ message: 'Validation failed.', errors });
      return;
    }

    const store = ensureStore();
    const tokenHash = sha256(token);
    const now = Date.now();
    const resetRecord = store.passwordResets.find(
      (r) =>
        r.email === cleanEmail &&
        r.tokenHash === tokenHash &&
        new Date(r.expiresAt).getTime() > now,
    );

    if (!resetRecord) {
      res.status(422).json({
        message: 'This password reset token is invalid or expired.',
        errors: { email: 'This password reset token is invalid or expired.' },
      });
      return;
    }

    const user = store.users.find((u) => u.email === cleanEmail);
    if (!user) {
      res.status(422).json({
        message: 'We cannot find a user with that email address.',
        errors: { email: 'We cannot find a user with that email address.' },
      });
      return;
    }

    user.passwordHash = hashPassword(cleanPassword);
    user.updatedAt = new Date().toISOString();
    store.passwordResets = store.passwordResets.filter((r) => r.email !== cleanEmail);
    store.sessions = store.sessions.filter((s) => s.userId !== user.id);

    recordAudit(store, req, 'password.reset_completed', user.email, user.id);
    saveStore(store);

    res.json({
      status: 'Your password has been reset. You can now sign in with your new credentials.',
    });
  });

  // Confirm password (Laravel password.confirm middleware)
  app.post('/api/auth/confirm-password', (req, res) => {
    const store = ensureStore();
    const { user, session } = getAuthContext(req, store);
    if (!user || !session) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !verifyPassword(password, user.passwordHash)) {
      res.status(422).json({
        message: 'The provided password is incorrect.',
        errors: { password: 'The provided password is incorrect.' },
      });
      return;
    }

    session.passwordConfirmedAt = new Date().toISOString();
    recordAudit(store, req, 'auth.password_confirmed', user.email, user.id);
    saveStore(store);

    res.json({ confirmed: true, passwordConfirmedAt: session.passwordConfirmedAt });
  });

  // Update password
  app.put('/api/auth/password', (req, res) => {
    const store = ensureStore();
    const { user } = getAuthContext(req, store);
    if (!user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const { current_password, password, password_confirmation } = req.body ?? {};
    const errors: Record<string, string> = {};

    if (typeof current_password !== 'string' || !verifyPassword(current_password, user.passwordHash)) {
      errors.current_password = 'The current password is incorrect.';
    }
    if (typeof password !== 'string' || password.length < 8) {
      errors.password = 'The password field must be at least 8 characters.';
    }
    if (password !== password_confirmation) {
      errors.password_confirmation = 'The password confirmation does not match.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(422).json({ message: 'Validation failed.', errors });
      return;
    }

    user.passwordHash = hashPassword(password);
    user.updatedAt = new Date().toISOString();
    recordAudit(store, req, 'password.updated', user.email, user.id);
    saveStore(store);

    res.json({ message: 'Password updated successfully.' });
  });

  // Update profile
  app.patch('/api/profile', (req, res) => {
    const store = ensureStore();
    const { user } = getAuthContext(req, store);
    if (!user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const { name, email } = req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const errors: Record<string, string> = {};

    if (cleanName.length < 2) errors.name = 'The name field must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (
      !errors.email &&
      store.users.some((u) => u.email === cleanEmail && u.id !== user.id)
    ) {
      errors.email = 'The email has already been taken.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(422).json({ message: 'Validation failed.', errors });
      return;
    }

    const emailChanged = user.email !== cleanEmail;
    user.name = cleanName;
    user.email = cleanEmail;
    user.updatedAt = new Date().toISOString();

    if (emailChanged) {
      user.emailVerifiedAt = null;
      issueVerificationEmail(store, user);
    }

    recordAudit(store, req, 'profile.updated', user.email, user.id);
    saveStore(store);

    res.json({
      user: serializeUser(user),
      emailChanged,
      message: emailChanged
        ? 'Profile updated. A new verification email has been sent.'
        : 'Profile updated successfully.',
    });
  });

  // Delete account
  app.delete('/api/profile', (req, res) => {
    const store = ensureStore();
    const { user } = getAuthContext(req, store);
    if (!user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !verifyPassword(password, user.passwordHash)) {
      res.status(422).json({
        message: 'The provided password is incorrect.',
        errors: { password: 'The provided password is incorrect.' },
      });
      return;
    }

    store.users = store.users.filter((u) => u.id !== user.id);
    store.sessions = store.sessions.filter((s) => s.userId !== user.id);
    store.emailVerifications = store.emailVerifications.filter((v) => v.userId !== user.id);
    recordAudit(store, req, 'account.deleted', user.email, null);
    saveStore(store);

    clearSessionCookies(req, res);
    res.json({ message: 'Account permanently deleted.' });
  });

  // Active sessions
  app.get('/api/sessions', (req, res) => {
    const store = ensureStore();
    const { user, session } = getAuthContext(req, store);
    if (!user || !session) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const now = Date.now();
    const userSessions = store.sessions
      .filter((s) => s.userId === user.id && new Date(s.expiresAt).getTime() > now)
      .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
      .map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        remember: s.remember,
        isCurrentDevice: s.id === session.id,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
      }));

    res.json({ sessions: userSessions });
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const store = ensureStore();
    const { user, session } = getAuthContext(req, store);
    if (!user || !session) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const targetId = req.params.id;
    const exists = store.sessions.some((s) => s.id === targetId && s.userId === user.id);
    if (!exists) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    store.sessions = store.sessions.filter((s) => !(s.id === targetId && s.userId === user.id));
    recordAudit(store, req, 'session.revoked', user.email, user.id);
    saveStore(store);

    if (targetId === session.id) {
      clearSessionCookies(req, res);
    }

    res.json({ message: 'Session revoked.', selfRevoked: targetId === session.id });
  });

  app.delete('/api/sessions', (req, res) => {
    const store = ensureStore();
    const { user, session } = getAuthContext(req, store);
    if (!user || !session) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    store.sessions = store.sessions.filter(
      (s) => s.userId !== user.id || s.id === session.id,
    );
    recordAudit(store, req, 'sessions.revoked_others', user.email, user.id);
    saveStore(store);

    res.json({ message: 'All other browser sessions have been signed out.' });
  });

  // Audit logs for authenticated user
  app.get('/api/audit-logs', (req, res) => {
    const store = ensureStore();
    const { user } = getAuthContext(req, store);
    if (!user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    const logs = store.auditLogs.filter(
      (l) => l.userId === user.id || l.email === user.email,
    );
    res.json({ logs });
  });

  // Mailpit-style local inbox (accessible for testing registration & password reset flows)
  app.get('/api/mail', (_req, res) => {
    const store = ensureStore();
    res.json({ messages: store.mailInbox });
  });

  app.post('/api/mail/:id/read', (req, res) => {
    const store = ensureStore();
    const msg = store.mailInbox.find((m) => m.id === req.params.id);
    if (msg && !msg.readAt) {
      msg.readAt = new Date().toISOString();
      saveStore(store);
    }
    res.json({ ok: true });
  });

  app.delete('/api/mail', (_req, res) => {
    const store = ensureStore();
    store.mailInbox = [];
    saveStore(store);
    res.json({ ok: true });
  });

  // Laravel + Vue 3 + Inertia + Tailwind source explorer
  app.get('/api/laravel/files', (_req, res) => {
    const files = collectLaravelFiles(LARAVEL_DIR);
    res.json({ files });
  });

  // Downloadable ZIP archive of the complete Laravel + Vue Inertia project
  app.get('/api/laravel/download', async (_req, res) => {
    const files = collectLaravelFiles(LARAVEL_DIR);
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path, file.content);
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="laravel-vue-inertia-auth.zip"');
    res.send(buffer);
  });

  // Honest Git environment inspection
  app.get('/api/git/status', (_req, res) => {
    let initialized = false;
    let remotes: string[] = [];
    let branch = '';
    let phpAvailable = false;

    try {
      execSync('php -v', { stdio: 'ignore' });
      phpAvailable = true;
    } catch {
      phpAvailable = false;
    }

    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: ROOT_DIR, stdio: 'ignore' });
      initialized = true;
      branch = execSync('git branch --show-current', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
      const rawRemotes = execSync('git remote -v', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
      remotes = rawRemotes ? rawRemotes.split('\n') : [];
    } catch {
      initialized = false;
    }

    res.json({
      gitInitialized: initialized,
      branch,
      remotes,
      phpAvailable,
      laravelFilesCount: collectLaravelFiles(LARAVEL_DIR).length,
    });
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ForgeAuth server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
