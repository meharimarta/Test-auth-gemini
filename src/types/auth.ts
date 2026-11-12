export interface User {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  remember: boolean;
  passwordConfirmed: boolean;
  lastActiveAt: string;
  expiresAt: string;
}

export interface ActiveSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  remember: boolean;
  isCurrentDevice: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  email: string;
  event: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface MailMessage {
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

export interface LaravelFile {
  path: string;
  content: string;
}

export interface GitEnvironmentInfo {
  gitInitialized: boolean;
  branch: string;
  remotes: string[];
  phpAvailable: boolean;
  laravelFilesCount: number;
}

export type AppView =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'dashboard'
  | 'profile'
  | 'mailpit'
  | 'laravel-source';
