'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/config/api';
import CodexaLogo from '@/components/CodexaLogo';

export default function LoginPage() {
  const [role, setRole] = useState<'lecturer' | 'invigilator'>('lecturer');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Background ping to wake up Render backend container immediately
    const pingBackend = async () => {
      try {
        await fetch(`${getApiUrl()}/auth/ping`, { mode: 'cors' });
      } catch (e) {
        // Silent warm-up
      }
    };
    pingBackend();

    // Check if returning from Google OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const oauthError = params.get('error');

    if (oauthError) {
      setError('Google Sign-In failed or was cancelled. Please try again.');
    }

    if (token && userStr) {
      try {
        const user = decodeURIComponent(userStr);
        localStorage.setItem('codexa_token', token);
        localStorage.setItem('codexa_user', user);
        
        window.history.replaceState({}, document.title, window.location.pathname);
        router.push('/dashboard');
      } catch (err) {
        console.error('Failed to parse Google OAuth user data', err);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'invigilator') {
        const accessCode = username.trim().toUpperCase();
        const invigilatorKey = password.trim();

        const examRes = await fetch(`${getApiUrl()}/exams/access/${accessCode}`);
        if (!examRes.ok) {
          throw new Error('Exam not found or has been closed.');
        }

        const res = await fetch(`${getApiUrl()}/exams/access/${accessCode}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invigilatorPassword: invigilatorKey }),
        });

        if (!res.ok) {
          throw new Error('Authentication failed. Invalid invigilator password.');
        }

        sessionStorage.setItem(`invigilator_password_${accessCode}`, invigilatorKey);
        router.push(`/invigilate/${accessCode}`);
      } else {
        const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
        const body = isRegisterMode 
          ? { username, password, name: fullName } 
          : { username, password };

        const res = await fetch(`${getApiUrl()}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Something went wrong');
        }

        const data = await res.json();
        localStorage.setItem('codexa_token', data.access_token);
        localStorage.setItem('codexa_user', JSON.stringify(data.user));
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-[#030712] text-slate-100 selection:bg-[#bf4507]/30 selection:text-[#bf4507] relative overflow-hidden">
      {/* Subtle Background Glow Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1b2852]/20 via-[#030712]/80 to-[#030712] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0c1222] border border-[#1a2440] p-8 rounded-3xl shadow-2xl relative z-10 overflow-hidden backdrop-blur-xl">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#bf4507] to-transparent" />
        
        {/* LOGO Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <CodexaLogo size="lg" layout="vertical" className="mb-2" />
          <div className="inline-block mt-2 text-[10px] bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            {role === 'lecturer' ? 'Lecturer Portal' : 'Invigilator Station'}
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-[#070b18] p-1.5 rounded-2xl mb-6 font-medium text-xs border border-[#161e36]">
          <button
            type="button"
            onClick={() => {
              setRole('lecturer');
              setError('');
              setUsername('');
              setPassword('');
            }}
            className={`flex-1 py-2.5 text-center rounded-xl transition-all ${
              role === 'lecturer'
                ? 'bg-[#1b2852] text-white shadow-md font-bold border border-[#2a3a5c]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lecturer Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('invigilator');
              setIsRegisterMode(false);
              setError('');
              setUsername('');
              setPassword('');
            }}
            className={`flex-1 py-2.5 text-center rounded-xl transition-all ${
              role === 'invigilator'
                ? 'bg-[#1b2852] text-white shadow-md font-bold border border-[#2a3a5c]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Invigilator Access
          </button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && role === 'lecturer' && (
            <div>
              <label htmlFor="fullName" className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm"
                placeholder="Jane Doe"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">
              {role === 'lecturer' ? 'Username' : 'Exam Access Code'}
            </label>
            <input
              id="username"
              type="text"
              placeholder={role === 'lecturer' ? 'e.g. jdoe' : 'e.g. ABCD'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm font-mono"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">
              {role === 'lecturer' ? 'Password' : 'Invigilator Key'}
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-[#bf4507] hover:bg-[#c24709] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(191,69,7,0.3)] active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide mt-2"
          >
            {loading ? 'Authenticating...' : (role === 'invigilator' ? 'Enter Operations Center' : (isRegisterMode ? 'Create Account' : 'Sign In'))}
          </button>
        </form>

        {role === 'lecturer' && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <span className="border-b border-[#161e36] w-1/5 lg:w-1/4"></span>
              <span className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">or continue with</span>
              <span className="border-b border-[#161e36] w-1/5 lg:w-1/4"></span>
            </div>

            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={() => {
                setGoogleLoading(true);
                window.location.href = `${getApiUrl()}/auth/google`;
              }}
              className="w-full mt-6 bg-[#070b18] hover:bg-[#0f172a] border border-[#161e36] hover:border-[#bf4507] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {googleLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting to Google...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
                setUsername('');
                setPassword('');
                setFullName('');
              }}
              className="w-full mt-6 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {isRegisterMode ? 'Already have an account? Sign in instead' : "Don't have an account? Create one"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
