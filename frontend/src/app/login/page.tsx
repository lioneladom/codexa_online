'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/config/api';
import CodexaLogo from '@/components/CodexaLogo';

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);

  const handleRipple = (e: React.MouseEvent<HTMLElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, id }]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 1000);
  };

  useEffect(() => {
    // Check if we just returned from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');

    if (token && userStr) {
      try {
        const user = decodeURIComponent(userStr);
        localStorage.setItem('codexa_token', token);
        localStorage.setItem('codexa_user', user);
        
        // Clean up URL and redirect to dashboard
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
      console.log('Success!', data);
      localStorage.setItem('codexa_token', data.access_token);
      localStorage.setItem('codexa_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main 
      className="flex min-h-screen items-center justify-center p-6 bg-aurora text-[#f0f2f8] relative overflow-hidden"
      onClick={handleRipple}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple-effect"
          style={{ left: ripple.x, top: ripple.y, width: 100, height: 100 }}
        />
      ))}
      <div className="z-10 w-full max-w-md bg-[#0c1222]/60 backdrop-blur-2xl border border-[#1a2440]/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" />
        
        {/* LOGO Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <CodexaLogo size="lg" layout="vertical" className="mb-2" />
          <span className="inline-block mt-2 text-[10px] bg-accent/15 border border-accent/30 text-accent font-bold px-3 py-0.5 rounded-full uppercase tracking-widest">
            Lecturer Portal
          </span>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegisterMode && (
            <div>
              <label htmlFor="fullName" className="block text-[11px] uppercase tracking-wider text-accent font-extrabold mb-2">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#070b18] border border-[#1a2440] rounded-xl text-[#f0f2f8] placeholder-[#7b8aaa] focus:outline-none focus:border-accent transition-all text-sm"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-[11px] uppercase tracking-wider text-accent font-extrabold mb-2">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#070b18] border border-[#1a2440] rounded-xl text-[#f0f2f8] placeholder-[#7b8aaa] focus:outline-none focus:border-accent transition-all text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] uppercase tracking-wider text-accent font-extrabold mb-2">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#070b18] border border-[#1a2440] rounded-xl text-[#f0f2f8] placeholder-[#7b8aaa] focus:outline-none focus:border-accent transition-all text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Please wait...' : (isRegisterMode ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-[#1a2440] w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-[#7b8aaa] uppercase font-bold tracking-wider">or continue with</span>
          <span className="border-b border-[#1a2440] w-1/5 lg:w-1/4"></span>
        </div>

        <button
          type="button"
          onClick={() => {
            // Mock or actual redirect for Google OAuth
            window.location.href = `${getApiUrl()}/auth/google`;
          }}
          className="w-full mt-6 bg-[#070b18] hover:bg-[#0f172a] border border-[#1a2440] hover:border-accent text-[#f0f2f8] font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm flex items-center justify-center gap-3 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
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
          className="w-full mt-5 text-xs font-semibold text-[#7b8aaa] hover:text-white transition-colors text-center"
        >
          {isRegisterMode ? 'Already have an account? Sign in instead' : "Don't have an account? Create one"}
        </button>
      </div>
    </main>
  );
}
