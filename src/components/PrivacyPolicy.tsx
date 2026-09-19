import { ArrowLeft, Database } from 'lucide-react';

const APP_NAME = 'Research Scraper & Coding Studio';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-brand-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <a href="#/" className="btn-ghost text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-accent-400" />
            <span className="text-sm font-semibold text-white">{APP_NAME}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="prose-custom">
          <h1>プライバシーポリシー</h1>
          <p className="text-sm text-slate-500">最終更新日: 2026年9月19日</p>

          <p>
            {APP_NAME}（以下「本サービス」）は、利用者のプライバシーを尊重し、
            個人情報の保護に努めます。本プライバシーポリシーは、本サービスにおける
            個人情報の取り扱いについて説明するものです。
          </p>

          <h2>1. 収集する情報</h2>
          <p>本サービスでは、以下の情報を収集します。</p>

          <h3>1.1 アカウント情報</h3>
          <p>
            Googleアカウントを使用してサインインする際、以下の情報がGoogleから提供されます。
          </p>
          <ul>
            <li>氏名（表示名）</li>
            <li>メールアドレス</li>
            <li>プロフィール画像のURL</li>
          </ul>

          <h3>1.2 利用者が作成するデータ</h3>
          <p>
            本サービスの利用に伴い、以下のデータが保存されます。
          </p>
          <ul>
            <li>検索クエリ（キーワード、検索条件）</li>
            <li>収集されたWebデータ（テキスト、URL、メタデータ）</li>
            <li>質的コード（タグ）の定義と付与情報</li>
            <li>研究考察メモ</li>
          </ul>

          <h2>2. 情報の利用目的</h2>
          <p>収集した情報は、以下の目的に限り利用します。</p>
          <ul>
            <li>本サービスの機能提供（データ収集、保存、分析支援）</li>
            <li>利用者の認証およびアカウント管理</li>
            <li>サービスの改善および不具合の修正</li>
          </ul>

          <h2>3. 情報の共有・第三者提供</h2>
          <p>
            本サービスは、以下の場合を除き、利用者の個人情報を第三者に提供しません。
          </p>
          <ul>
            <li>利用者の同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>
              サービス提供に必要な範囲で業務委託先（Supabase Inc.によるデータベースホスティング、
              Google LLCによる認証サービス）に提供する場合。
              これらの委託先は、それぞれのプライバシーポリシーに従い情報を取り扱います。
            </li>
          </ul>

          <h2>4. データの保管とセキュリティ</h2>
          <ul>
            <li>
              すべてのデータは、Supabase上のデータベースに暗号化された通信（TLS）を
              介して保管されます。
            </li>
            <li>
              データベースにはRow Level Security（行レベルセキュリティ）が適用されており、
              各利用者は自身のデータにのみアクセスできます。
            </li>
            <li>
              認証にはSupabase AuthおよびGoogle OAuthを使用しており、
              本サービスがパスワードを保管することはありません。
            </li>
          </ul>

          <h2>5. Cookieおよびローカルストレージ</h2>
          <p>
            本サービスは、認証セッションの維持のためにブラウザのローカルストレージを
            使用します。トラッキング目的のCookieは使用しません。
          </p>

          <h2>6. 利用者の権利</h2>
          <p>利用者は以下の権利を有します。</p>
          <ul>
            <li>自身のデータの閲覧およびエクスポート（CSV / JSON形式）</li>
            <li>自身のデータの削除の要求</li>
            <li>アカウントの削除の要求</li>
          </ul>
          <p>
            これらの要求については、本サービスの管理者にメールにてご連絡ください。
          </p>

          <h2>7. 未成年の利用者について</h2>
          <p>
            本サービスは教育・研究目的で提供されており、学生の利用を想定しています。
            未成年の利用者がサインインする場合は、保護者の同意を得た上でご利用ください。
          </p>

          <h2>8. ポリシーの変更</h2>
          <p>
            本ポリシーは必要に応じて改定されることがあります。重要な変更がある場合は、
            本サービス上で通知します。変更後も本サービスを継続して利用する場合、
            改定後のポリシーに同意したものとみなされます。
          </p>

          <h2>9. お問い合わせ</h2>
          <p>
            プライバシーに関するご質問やお問い合わせは、
            本サービスの管理者までメールにてご連絡ください。
          </p>
        </article>
      </main>
    </div>
  );
}
