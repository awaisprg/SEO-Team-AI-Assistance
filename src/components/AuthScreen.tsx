import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { clearAuthToken } from '../lib/supabaseClient';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      // Store authenticated token
      clearAuthToken();
      localStorage.setItem('auth_token', data.token);
      onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09061A] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* Background visual geometry */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-[#7C52F5]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#2A1C94]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <a
          href="https://goldflexmarketing.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center mb-6 transition-transform hover:scale-[1.02]"
        >
          <img
            src="https://goldflexmarketing.com/wp-content/uploads/2026/01/Gold-Flex-Marketing-White-1024x260.png"
            alt="Gold Flex Marketing"
            className="h-10 sm:h-11 w-auto mx-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
              const fallback = document.getElementById('auth-gfm-fallback');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div
            id="auth-gfm-fallback"
            style={{ display: 'none' }}
            className="items-center justify-center space-x-2 text-white font-bold text-xl"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C52F5] to-[#2A1C94] flex items-center justify-center text-white font-bold">
              GF
            </div>
            <span>Gold Flex Marketing</span>
          </div>
        </a>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          SEO & Content Intelligence Hub
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Executive workstream retrieval, deliverable auditing & team operations
        </p>
      </div>

      {/* Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#120E2E]/90 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-800/80 rounded-2xl sm:px-10">
          <div className="mb-6 pb-4 border-b border-slate-800/60">
            <h2 className="text-base font-semibold text-white">Account Sign In</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your authorized credentials to access the workspace
            </p>
          </div>

          {/* Feedback error alert */}
          {error && (
            <div
              id="auth-error-alert"
              className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-200 flex items-start space-x-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-medium text-slate-200 mb-1.5">
                Work Email
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-9.5 pr-3 py-2.5 text-sm bg-[#09061A]/80 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password-input" className="block text-xs font-medium text-slate-200">
                  Password
                </label>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-9.5 pr-10 py-2.5 text-sm bg-[#09061A]/80 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] active:from-[#572FD6] active:to-[#461EC6] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#7C52F5] disabled:opacity-50 transition-all shadow-md shadow-[#7C52F5]/25 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Access Policy Footnote */}
          <div className="mt-6 pt-5 border-t border-slate-800/70 text-center">
            <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-[#7C52F5]" />
              <span>Restricted Agency Portal</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Access is provisioned exclusively by the agency administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
