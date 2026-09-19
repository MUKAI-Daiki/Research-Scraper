import { Chrome, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (e) {
      // Keep the underlying error out of the UI: it can carry backend
      // configuration detail. Log it for developers instead.
      console.error('Google sign-in failed:', e);
      setError('サインインに失敗しました。しばらくしてからもう一度お試しください。');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-600/20 mb-2">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-accent-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M11 8v6" />
              <path d="M8 11h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Research Scraper &<br />Coding Studio</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Webデータの収集・質的コーディング・分析を<br />ブラウザ上で一気通貫で行える研究支援ツール
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg
                       border border-slate-600 bg-brand-800 px-4 py-3
                       text-sm font-medium text-white transition-all duration-200
                       hover:bg-brand-700 hover:border-slate-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Chrome className="h-5 w-5" />
            )}
            Googleアカウントでサインイン
          </button>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <p className="text-xs text-slate-500">
          サインインすることで、
          <a href="#/terms" className="text-accent-400/80 hover:text-accent-300 underline underline-offset-2">利用規約</a>
          および
          <a href="#/privacy" className="text-accent-400/80 hover:text-accent-300 underline underline-offset-2">プライバシーポリシー</a>
          に同意したものとみなされます。
        </p>
      </div>
    </div>
  );
}
