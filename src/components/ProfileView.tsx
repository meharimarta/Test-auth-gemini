import React, { useState } from 'react';
import { ApiValidationError, apiRequest } from '../lib/api';
import { User } from '../types/auth';

interface ProfileViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onAccountDeleted: () => void;
  onMailDispatched: () => void;
}

export function ProfileView({
  user,
  onUserUpdated,
  onAccountDeleted,
  onMailDispatched,
}: ProfileViewProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSavedMsg, setPasswordSavedMsg] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileErrors({});
    setProfileSavedMsg(null);
    setSavingProfile(true);

    try {
      const res = await apiRequest<{ user: User; emailChanged: boolean; message: string }>(
        '/api/profile',
        {
          method: 'PATCH',
          body: { name, email },
        },
      );
      onUserUpdated(res.user);
      setProfileSavedMsg(res.message);
      if (res.emailChanged) {
        onMailDispatched();
      }
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setProfileErrors(err.errors);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSavedMsg(null);
    setSavingPassword(true);

    try {
      const res = await apiRequest<{ message: string }>('/api/auth/password', {
        method: 'PUT',
        body: {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        },
      });
      setPasswordSavedMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setPasswordErrors(err.errors);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);

    try {
      await apiRequest('/api/profile', {
        method: 'DELETE',
        body: { password: deletePassword },
      });
      setShowDeleteModal(false);
      onAccountDeleted();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setDeleteError(err.errors.password || err.message);
      } else {
        setDeleteError('Unable to delete account.');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Profile &amp; Security</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your identity details, rotate your password, or permanently close your account.
        </p>
      </div>

      {/* Profile Information */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-base font-semibold text-slate-900">Profile Information</h2>
        <p className="mt-1 text-sm text-slate-500">
          Changing your email address clears verification status and dispatches a fresh verification email.
        </p>

        <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5 max-w-lg">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {profileErrors.name && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{profileErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {profileErrors.email && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{profileErrors.email}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
            {profileSavedMsg && (
              <span className="text-sm font-medium text-emerald-700">{profileSavedMsg}</span>
            )}
          </div>
        </form>
      </section>

      {/* Update Password */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-base font-semibold text-slate-900">Update Password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm your current password before setting a new credential.
        </p>

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-5 max-w-lg">
          <div>
            <label htmlFor="current-pw" className="block text-sm font-medium text-slate-700 mb-1.5">
              Current Password
            </label>
            <input
              id="current-pw"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {passwordErrors.current_password && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {passwordErrors.current_password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-pw" className="block text-sm font-medium text-slate-700 mb-1.5">
              New Password
            </label>
            <input
              id="new-pw"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {passwordErrors.password && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{passwordErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-pw" className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirm-pw"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {passwordErrors.password_confirmation && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {passwordErrors.password_confirmation}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
            {passwordSavedMsg && (
              <span className="text-sm font-medium text-emerald-700">{passwordSavedMsg}</span>
            )}
          </div>
        </form>
      </section>

      {/* Delete Account */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-base font-semibold text-slate-900">Delete Account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Once your account is deleted, all active sessions and identity records are permanently removed.
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              setDeletePassword('');
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setShowDeleteModal(false)}
          />
          <form
            onSubmit={handleDeleteAccount}
            className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Confirm Account Deletion
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Enter your current password to confirm permanent deletion of{' '}
              <span className="font-medium text-slate-900">{user.email}</span>.
            </p>

            <div className="mt-5">
              <label htmlFor="delete-pw" className="block text-sm font-medium text-slate-700 mb-1.5">
                Current Password
              </label>
              <input
                id="delete-pw"
                type="password"
                required
                autoFocus
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              {deleteError && <p className="mt-1.5 text-xs font-medium text-red-600">{deleteError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
