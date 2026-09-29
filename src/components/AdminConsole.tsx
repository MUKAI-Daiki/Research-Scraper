import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import UserDetailView from '@/components/UserDetailView';
import {
  Users, Activity, BarChart3, ChevronRight,
  Twitter, Globe, Calendar, Hash,
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: string;
  created_at: string;
}

interface UsageStat {
  api_type: string;
  total_calls: number;
  total_results: number;
  last_used: string | null;
}

interface DailyUsage {
  day: string;
  api_type: string;
  calls: number;
  results: number;
}

export default function AdminConsole() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, role, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      addToast('ユーザー一覧の読み込みに失敗しました', 'error');
    } else {
      setUsers(data || []);
    }
    setLoadingUsers(false);
  }, [addToast]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    const [summaryRes, dailyRes] = await Promise.all([
      supabase.from('api_usage_summary').select('*'),
      supabase.from('api_usage_daily').select('*').limit(30),
    ]);

    if (summaryRes.error || dailyRes.error) {
      addToast('API使用量の読み込みに失敗しました', 'error');
      setLoadingStats(false);
      return;
    }

    setUsageStats((summaryRes.data || []) as UsageStat[]);
    setDailyUsage((dailyRes.data || []) as DailyUsage[]);
    setLoadingStats(false);
  }, [addToast]);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [loadUsers, loadStats]);

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (selectedUser) {
    return (
      <UserDetailView
        user={selectedUser}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  const xStats = usageStats.find(s => s.api_type === 'x_api');
  const geminiStats = usageStats.find(s => s.api_type === 'gemini');

  return (
    <div className="min-h-screen bg-brand-950">
      <div className="mx-auto max-w-[1200px] px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="ユーザー数"
            value={users.length}
            loading={loadingUsers}
            accent="accent"
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="総API呼び出し"
            value={usageStats.reduce((s, u) => s + u.total_calls, 0)}
            loading={loadingStats}
            accent="accent"
          />
          <StatCard
            icon={<Twitter className="h-5 w-5" />}
            label="X API 呼び出し"
            value={xStats?.total_calls ?? 0}
            sub={`${xStats?.total_results ?? 0} 件取得`}
            loading={loadingStats}
            accent="blue"
          />
          <StatCard
            icon={<Globe className="h-5 w-5" />}
            label="Gemini API 呼び出し"
            value={geminiStats?.total_calls ?? 0}
            sub={`${geminiStats?.total_results ?? 0} 件取得`}
            loading={loadingStats}
            accent="emerald"
          />
        </div>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent-400" />
            日別API使用量（直近）
          </h2>
          {loadingStats ? (
            <LoadingRows count={5} />
          ) : dailyUsage.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">まだAPI使用履歴がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">日付</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">API</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">呼び出し</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">取得件数</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyUsage.map((d) => (
                    <tr key={`${d.day}_${d.api_type}`} className="border-b border-slate-800/50 hover:bg-brand-900/50">
                      <td className="py-2 px-3 text-slate-300 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        {d.day}
                      </td>
                      <td className="py-2 px-3">
                        <ApiTypeBadge type={d.api_type} />
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">{d.calls}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{d.results}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent-400" />
            ユーザー一覧
          </h2>
          {loadingUsers ? (
            <LoadingRows count={4} />
          ) : users.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">ユーザーがいません</p>
          ) : (
            <div className="space-y-1">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-brand-800/60 transition-colors group text-left"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-brand-700 flex items-center justify-center text-xs font-medium text-slate-300 shrink-0">
                      {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium truncate">
                        {u.display_name || u.email}
                      </span>
                      {u.role === 'admin' && (
                        <span className="text-[10px] font-semibold bg-accent-600/20 text-accent-400 px-1.5 py-0.5 rounded">
                          管理者
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="truncate">{u.email}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Hash className="h-3 w-3" />
                        {new Date(u.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, loading, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  loading: boolean;
  accent: 'accent' | 'blue' | 'emerald';
}) {
  const accentClasses = {
    accent: 'bg-accent-600/20 text-accent-400',
    blue: 'bg-blue-600/20 text-blue-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${accentClasses[accent]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          {loading ? (
            <div className="h-6 w-16 bg-brand-800 rounded animate-pulse mt-0.5" />
          ) : (
            <>
              <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
              {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ApiTypeBadge({ type }: { type: string }) {
  if (type === 'x_api') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-600/15 text-blue-400 px-2 py-0.5 rounded-full">
        <Twitter className="h-3 w-3" /> X API
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-600/15 text-emerald-400 px-2 py-0.5 rounded-full">
      <Globe className="h-3 w-3" /> Gemini
    </span>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 bg-brand-800/50 rounded animate-pulse" />
      ))}
    </div>
  );
}
