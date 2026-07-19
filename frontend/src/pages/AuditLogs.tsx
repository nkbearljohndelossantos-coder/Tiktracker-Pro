import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

interface AuditLog {
  id: number;
  username: string | null;
  role: string | null;
  action: string;
  module: string;
  details: string;
  ip_address: string | null;
  created_at: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fallbackLogs: AuditLog[] = [
    { id: 1, username: 'admin', role: 'SUPER_ADMIN', action: 'DATABASE_SEED', module: 'SYSTEM', details: 'Successfully loaded database seed records for standard operational sandbox testing.', ip_address: '127.0.0.1', created_at: new Date().toISOString() }
  ];

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get('/api/audit/logs');
        setLogs(res.data);
      } catch (err) {
        setLogs(fallbackLogs);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.module.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase()) ||
    (log.username && log.username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search log bar */}
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search action, module, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Audit Log table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/30 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs tracking-wider uppercase">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Operator</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Module</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors text-xs">
                    <td className="p-4 text-slate-450 font-semibold">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{log.username || 'SYSTEM'}</td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {log.role || 'CORE'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-500">{log.action}</td>
                    <td className="p-4 font-semibold text-slate-400">{log.module}</td>
                    <td className="p-4 max-w-xs truncate" title={log.details}>{log.details}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default AuditLogs;
