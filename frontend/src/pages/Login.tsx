import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { accessToken, refreshToken, user } = res.data;
      login(accessToken, refreshToken, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (userRole: 'admin' | 'manager' | 'staff' | 'viewer') => {
    setUsername(userRole);
    setPassword(`${userRole}123`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFD] dark:bg-[#07090E] relative overflow-hidden px-4 transition-colors duration-250">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/70 dark:bg-[#111827]/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl shadow-xl dark:shadow-2xl relative z-10 animate-fade-in">
        <div className="text-center mb-6">
          <div className="mb-4">
            <img src="/logo.png" alt="NKB Manufacturing Corp." className="h-28 object-contain mx-auto" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">TikTok Shop Profit & Operations Management</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-550/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-550 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#162031] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-550 absolute left-3 top-3.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#162031] border border-slate-800 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/10 hover-scale focus:outline-none transition-all flex items-center justify-center cursor-pointer"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a
            href="/api/public/instructions"
            download
            className="text-xs font-semibold text-teal-600 dark:text-emerald-400 hover:text-teal-500 dark:hover:text-emerald-300 hover:underline transition-all inline-flex items-center gap-1 cursor-pointer"
          >
            📥 Download User Manual (Word .doc)
          </a>
        </div>

        {/* Quick Sandbox Login Buttons */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 text-center">
            Sandbox Sandbox Roles (Auto Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager')}
              className="py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff')}
              className="py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('viewer')}
              className="py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
