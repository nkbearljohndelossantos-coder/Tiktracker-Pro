import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Database, Check, AlertCircle, UserPlus } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    company_name: 'TikTracker Pro Inc.',
    currency: 'PHP',
    low_stock_threshold: '20',
    ocr_confidence_threshold: '60',
    profit_warning_threshold: '15.00'
  });
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // New User Registration Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER'>('VIEWER');
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [userErr, setUserErr] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        if (res.data && Object.keys(res.data).length > 0) {
          setSettings(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveErr(null);
    try {
      await axios.put('/api/settings', settings);
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveErr(err.response?.data?.error || 'Failed to update system variables.');
    }
  };

  const handleBackup = () => {
    window.open('/api/settings/backup', '_blank');
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);
    setUserErr(null);
    setRegistering(true);

    try {
      await axios.post('/api/auth/register', {
        username: newUsername,
        password: newPassword,
        email: newEmail,
        role: newRole
      });
      setUserMsg(`Successfully registered new user: ${newUsername} as ${newRole}.`);
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewRole('VIEWER');
    } catch (err: any) {
      setUserErr(err.response?.data?.error || 'Failed to register user.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core System Variables */}
        <div className="p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-emerald-500" />
              <span>System Configuration</span>
            </h3>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4.5 h-4.5" />
                <span>Variables successfully updated in db.</span>
              </div>
            )}

            {saveErr && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{saveErr}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Currency</label>
                  <input
                    type="text"
                    value={settings.currency}
                    onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Low Stock Limit</label>
                  <input
                    type="number"
                    value={settings.low_stock_threshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">OCR Confidence limit %</label>
                  <input
                    type="number"
                    value={settings.ocr_confidence_threshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, ocr_confidence_threshold: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Margin Warning Alert %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.profit_warning_threshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, profit_warning_threshold: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs hover-scale focus:outline-none transition-all"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Database Export Backups & User registration */}
        <div className="space-y-6">
          {/* Backups Panel */}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl">
              <h3 className="font-extrabold text-base mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                <span>System Data Backups</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Export all primary database tables (orders, settlements, waybills, returns, product cost listings, and audit trails) directly as a single portable JSON backup file.
              </p>
              <button
                onClick={handleBackup}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl text-xs transition-colors hover:text-emerald-500 flex items-center justify-center gap-2"
              >
                <Database className="w-4.5 h-4.5 text-emerald-500" />
                <span>Download System Portable Backup (.json)</span>
              </button>
            </div>
          )}

          {/* New User Account Registration */}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl">
              <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                <span>Register User Credentials</span>
              </h3>

              {userMsg && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4.5 h-4.5" />
                  <span>{userMsg}</span>
                </div>
              )}

              {userErr && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{userErr}</span>
                </div>
              )}

              <form onSubmit={handleRegisterUser} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="john_doe"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="email@tiktracker.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5 uppercase">RBAC Role Clearance</label>
                    <select
                      value={newRole}
                      onChange={(e: any) => setNewRole(e.target.value)}
                      className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="STAFF">Staff</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={registering}
                    className="py-2 px-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl hover-scale transition-all disabled:opacity-50"
                  >
                    {registering ? 'Creating Account...' : 'Register User'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Settings;
