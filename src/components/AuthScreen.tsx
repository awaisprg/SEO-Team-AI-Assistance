import React, { useState } from 'react';
import { Sparkles, Shield, Lock, Mail, ArrowRight, User, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { clearAuthToken } from '../lib/supabaseClient';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (email.trim().toLowerCase() === 'awais7475@prgmd.com') {
      setError('The admin email awais7475@prgmd.com already exists. Please switch to Sign In.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      clearAuthToken();
      localStorage.setItem('auth_token', data.token);
      setInfo('Account created successfully! Entering workspace...');
      setTimeout(() => {
        onAuthenticated();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0528] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#8963FB]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-[#2F20A2]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <a
          href="https://goldflexmarketing.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-5 transition-opacity hover:opacity-90"
        >
          <img
            src="https://goldflexmarketing.com/wp-content/uploads/2026/01/Gold-Flex-Marketing-White-1024x260.png"
            alt="Gold Flex Marketing"
            className="h-10 sm:h-12 w-auto mx-auto object-contain"
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
            <div className="w-10 h-10 rounded-xl bg-[#8963FB] flex items-center justify-center text-white font-bold">
              GF
            </div>
            <span>Gold Flex Marketing</span>
          </div>
        </a>

        <h2 className="text-xl font-bold tracking-tight text-white">
          SEO & Content Team Intelligence
        </h2>
        <p className="mt-1.5 text-xs text-[#A78AFD]">
          Executive workstream retrieval, AI initiative audits & management briefs
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-[#1C213E] py-8 px-6 shadow-2xl border border-[#2F20A2]/50 sm:rounded-2xl sm:px-10 backdrop-blur-xs">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-[#0C0528] p-1 border border-[#272D56] mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isSignUp
                  ? 'bg-[#8963FB] text-white shadow-sm'
                  : 'text-[#A78AFD] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isSignUp
                  ? 'bg-[#8963FB] text-white shadow-sm'
                  : 'text-[#A78AFD] hover:text-white'
              }`}
            >
              Create new account
            </button>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-5 rounded-lg bg-[#BC2D3B]/20 border border-[#BC2D3B]/60 p-3.5 text-xs text-rose-200 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-5 rounded-lg bg-[#198754]/20 border border-[#198754]/60 p-3.5 text-xs text-emerald-200 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {!isSignUp ? (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#EAEAEC] mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E6D7B]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="awais7475@prgmd.com or your email"
                    className="block w-full pl-9.5 pr-3 py-2 text-sm bg-[#0C0528] border border-[#272D56] rounded-lg text-white placeholder-[#6E6D7B] focus:outline-hidden focus:ring-2 focus:ring-[#8963FB] focus:border-[#8963FB]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#EAEAEC]">
                    Password
                  </label>
                </div>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E6D7B]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-9.5 pr-10 py-2 text-sm bg-[#0C0528] border border-[#272D56] rounded-lg text-white placeholder-[#6E6D7B] focus:outline-hidden focus:ring-2 focus:ring-[#8963FB] focus:border-[#8963FB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6E6D7B] hover:text-[#A78AFD] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#8963FB] hover:bg-[#7852E8] active:bg-[#683EE6] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#8963FB] disabled:opacity-50 transition-all shadow-md shadow-[#8963FB]/25 cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Admin Access Callout */}
              <div className="mt-4 pt-4 border-t border-[#272D56]">
                <div className="flex items-start space-x-2 text-[11px] text-[#A78AFD] bg-[#0C0528] p-3 rounded-lg border border-[#272D56]">
                  <Shield className="w-3.5 h-3.5 text-[#8963FB] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Admin Account:</strong> <code className="text-[#A78AFD] font-mono">awais7475@prgmd.com</code>
                  </span>
                </div>
              </div>
            </form>
          ) : (
            /* Create New Account Form */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#EAEAEC] mb-1.5">
                  Full Name
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E6D7B]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="block w-full pl-9.5 pr-3 py-2 text-sm bg-[#0C0528] border border-[#272D56] rounded-lg text-white placeholder-[#6E6D7B] focus:outline-hidden focus:ring-2 focus:ring-[#8963FB] focus:border-[#8963FB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EAEAEC] mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E6D7B]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agency.com"
                    className="block w-full pl-9.5 pr-3 py-2 text-sm bg-[#0C0528] border border-[#272D56] rounded-lg text-white placeholder-[#6E6D7B] focus:outline-hidden focus:ring-2 focus:ring-[#8963FB] focus:border-[#8963FB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EAEAEC] mb-1.5">
                  Password
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6E6D7B]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full pl-9.5 pr-10 py-2 text-sm bg-[#0C0528] border border-[#272D56] rounded-lg text-white placeholder-[#6E6D7B] focus:outline-hidden focus:ring-2 focus:ring-[#8963FB] focus:border-[#8963FB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6E6D7B] hover:text-[#A78AFD] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#8963FB] hover:bg-[#7852E8] active:bg-[#683EE6] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#8963FB] disabled:opacity-50 transition-all shadow-md shadow-[#8963FB]/25 cursor-pointer"
                >
                  <span>{loading ? 'Creating account...' : 'Create new account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
