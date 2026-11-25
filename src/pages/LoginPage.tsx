import React, { useEffect, useState } from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { UserProfile } from '../types/domain';

interface LoginPageProps {
  onNavigateRegister: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage({ onNavigateRegister }: LoginPageProps) {
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [adminStatus, setAdminStatus] = useState<{
    hasAdminAccount: boolean;
    requiresEnvPasscode: boolean;
  } | null>(null);
  const [panelMode, setPanelMode] = useState<'user' | 'admin'>('user');
  const [adminAction, setAdminAction] = useState<'signin' | 'setup'>('setup');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');

  useEffect(() => {
    void apiRequest<{ hasAdminAccount: boolean; requiresEnvPasscode: boolean }>(
      '/api/auth/admin-status'
    )
      .then((res) => {
        setAdminStatus(res);
        setAdminAction(res.hasAdminAccount && !res.requiresEnvPasscode ? 'signin' : 'setup');
      })
      .catch(() => null);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      if (panelMode === 'admin' && res.user.role !== 'admin') {
        setErrorMsg('This account does not have Admin access.');
        return;
      }
      setSession(res.token, res.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (adminName.trim().length < 2) {
      setErrorMsg('Admin name must be at least 2 characters.');
      return;
    }
    if (!EMAIL_REGEX.test(adminEmail.trim())) {
      setErrorMsg('Please enter a valid admin email address.');
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (adminStatus?.requiresEnvPasscode && !adminPasscode.trim()) {
      setErrorMsg('Please enter the Admin Passcode.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/setup-admin',
        {
          method: 'POST',
          body: JSON.stringify({
            displayName: adminName.trim(),
            email: adminEmail.trim(),
            password: adminPassword,
            passcode: adminPasscode,
          }),
        }
      );
      setSession(res.token, res.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Admin setup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateAdmin = Boolean(
    !adminStatus || !adminStatus.hasAdminAccount || adminStatus.requiresEnvPasscode
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-[#f2f7fd] to-sky-100/80 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-sky-200 border-t-4 border-t-[#0f294a] rounded-xl p-8 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold text-sky-700">Capstone 1 Attachment Finder</p>
          <h1 className="font-display text-2xl font-semibold text-[#0f294a] mt-1">
            {panelMode === 'admin'
              ? adminAction === 'setup' && canCreateAdmin
                ? 'Admin Setup'
                : 'Admin Sign In'
              : 'Sign In'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {panelMode === 'admin'
              ? adminAction === 'setup' && canCreateAdmin
                ? 'Create the Admin account to verify companies and manage vacancies.'
                : 'Sign in with your Admin email and password.'
              : 'Sign in as a student or company to continue.'}
          </p>
        </div>

        <div className="mb-5 p-1 bg-sky-100/80 rounded-lg grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setPanelMode('user');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              panelMode === 'user'
                ? 'bg-[#0f294a] text-white shadow-xs'
                : 'text-[#0f294a] hover:bg-sky-200/60'
            }`}
          >
            Student / Company
          </button>
          <button
            type="button"
            onClick={() => {
              setPanelMode('admin');
              setErrorMsg(null);
              if (adminStatus?.hasAdminAccount && !adminStatus.requiresEnvPasscode) {
                setAdminAction('signin');
              }
            }}
            className={`py-2 px-3 text-sm font-medium rounded-md cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors ${
              panelMode === 'admin'
                ? 'bg-[#0f294a] text-white shadow-xs'
                : 'text-[#0f294a] hover:bg-sky-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {panelMode === 'admin' && adminAction === 'setup' && canCreateAdmin ? (
          <form onSubmit={handleAdminSetup} noValidate className="space-y-4">
            <div>
              <label htmlFor="adm-name" className="block text-sm font-medium text-[#0f294a] mb-1">
                Admin Name
              </label>
              <input
                id="adm-name"
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. System Admin"
                className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
              />
            </div>
            <div>
              <label htmlFor="adm-email" className="block text-sm font-medium text-[#0f294a] mb-1">
                Admin Email
              </label>
              <input
                id="adm-email"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
              />
            </div>
            <div>
              <label htmlFor="adm-password" className="block text-sm font-medium text-[#0f294a] mb-1">
                Password (min 6 chars)
              </label>
              <input
                id="adm-password"
                type="password"
                required
                minLength={6}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
              />
            </div>
            {adminStatus?.requiresEnvPasscode && (
              <div>
                <label htmlFor="adm-passcode" className="block text-sm font-medium text-[#0f294a] mb-1">
                  Admin Passcode
                </label>
                <input
                  id="adm-passcode"
                  type="password"
                  required
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] disabled:opacity-60 cursor-pointer transition-colors"
            >
              {submitting ? 'Creating Admin...' : 'Create Admin Account'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setAdminAction('signin');
                  setErrorMsg(null);
                }}
                className="text-xs font-medium text-sky-700 hover:text-[#0f294a] underline cursor-pointer"
              >
                Already have an Admin account? Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignIn} noValidate className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#0f294a] mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={panelMode === 'admin' ? 'admin@example.com' : 'you@example.com'}
                className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#0f294a] mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-[#0f294a]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173d6b] disabled:opacity-60 cursor-pointer transition-colors"
            >
              {submitting ? 'Signing In...' : panelMode === 'admin' ? 'Sign In as Admin' : 'Sign In'}
            </button>

            {panelMode === 'admin' && canCreateAdmin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAction('setup');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-medium text-sky-700 hover:text-[#0f294a] underline cursor-pointer"
                >
                  Create Admin Account
                </button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-sky-100 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-600">Don't have an account?</span>
          <button
            type="button"
            onClick={onNavigateRegister}
            className="px-4 py-2 text-sm font-medium text-[#0f294a] bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 cursor-pointer whitespace-nowrap transition-colors"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
