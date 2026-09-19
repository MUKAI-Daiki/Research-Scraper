# **Webスクレイピング・データ収集システム システム設計書**

本ドキュメントは、学生の研究・探究活動を支援するための「AIスクレイピングおよび質的データコーディングWebシステム」の基本設計・詳細設計書です。

# **1\. システム概要**

## **1.1 目的**

学生が研究テーマに応じたWeb上の情報（ネットニュース、各種ブログ記事、Xの公開ポスト等）を安全かつ迅速に収集・蓄積し、ブラウザ上で閲覧・質的コーディング（タグ付け・分類・考察メモ作成）・データ出力（CSV/JSON）までを一元管理できる環境を提供する。

## **1.2 コア構成方針**

* **フロントエンド**: React \+ Tailwind CSS（Bolt.newで生成・管理）  
* **バックエンド / DB / 認証**: Supabase（Google OAuth認証、PostgreSQL、Row Level Security、Edge Functions）  
* **データ収集エンジン**:  
  1. **X (旧Twitter) API v2**: 公式API（有料従量課金）による確実なポスト収集  
  2. **Gemini Search Grounding**: ネットニュース、各種ブログ、一般Web公開情報の構造化抽出

# **2\. システムアーキテクチャ設計**

## **2.1 全体構成**

\[ ブラウザ (学生用Web UI) \]

   │

   ├── ① Google OAuth 認証 ───► \[ Supabase Auth \]

   │

   ├── ② 検索条件・クエリ送信 ──► \[ Supabase Edge Functions (API Gateway) \]

   │                               │

   │                               ├── \[X (Twitter) API v2\] (有料)

   │                               │      └─ ポスト検索・本文取得

   │                               │

   │                               └── \[Gemini API (Search Grounding)\]

   │                                      └─ ニュース・ブログの検索・構造化抽出

   │                               │

   │                               ▼

   ├── ③ データ取得・表示 ◄──── \[ Supabase Database (PostgreSQL \+ RLS) \]

   │                                  ├─ searches (検索履歴)

   │                                  ├─ scraped\_items (収集データ)

   │                                  └─ qualitative\_codes (質的コーディング)

   └── ④ ブラウザ上での操作

          ├─ 収集データのフィルタ・閲覧

          ├─ 質的コーディング（タグ付与・考察メモ入力）

          └─ CSV / JSON エクスポート

## **2.2 採用技術スタック一覧**

| レイヤー | 技術 / サービス | 選定理由 |
| :---- | :---- | :---- |
| **開発環境** | Bolt.new | プロンプトベースでのUI生成、Supabase直接連携、高速な反復開発 |
| **フロントエンド** | React, Vite, Tailwind CSS, Lucide React | 操作性の高いSPA構築、軽快な動作とレスポンシブデザイン |
| **バックエンド** | Supabase Edge Functions (Deno / TypeScript) | APIキーの完全秘匿、外部APIのオーケストレーション |
| **認証** | Supabase Auth (Google OAuth 2.0) | 大学の学術用Googleアカウント等で安全・簡潔にログイン |
| **データベース** | Supabase Database (PostgreSQL) | 強固なリレーショナルモデルと全文検索機能 |
| **セキュリティ** | Row Level Security (RLS) | データベース層での学生別データ完全隔離 |
| **データソース1** | X API v2 (Recent Search) | 公式エンドポイントによる確実なポストデータ取得 |
| **データソース2** | Gemini API (gemini-1.5-flash / Search Tool) | Google検索インデックスを活用した汎用WebデータのJSON抽出 |

# **3\. 機能要件・機能設計**

## **3.1 認証・ユーザー管理機能**

* **Google OAuth認証**:  
  * 学生はGoogleアカウントでワンクリックログイン。  
  * 必要に応じて大学ドメインのアカウントのみを許可するホワイトリスト制限を付与。  
* **データ分離**:  
  * 全ての検索結果・コーディング作業はログイン中のユーザーID（auth.uid()）に紐づけられ、他学生の作業内容とは完全に隔離。

## **3.2 検索・スクレイピング機能**

* **キーワード指定**:  
  * AND（すべての語を含む）  
  * OR（いずれかの語を含む）  
  * NOT（除外する語）  
* **ソース選択（チェックボックス）**:  
  - [ ] X (Twitter): X API経由  
  - [ ] ネットニュース: Gemini Search Grounding経由（主要ニュースサイト優先）  
  - [ ] 各種ブログ: Gemini Search Grounding経由（note、はてなブログ等を対象）  
  - [ ] 一般Web/Threads等: Gemini Search Grounding経由（Google公開インデックス）  
* **取得件数上限設定**:  
  * コスト抑制のため、1回の実行あたり「10件 / 25件 / 50件」の選択式とし、デフォルトを少なめに設定。

## **3.3 データ閲覧・コーディング機能**

* **一覧表示（データテーブル / カードビュー切替）**:  
  * ソース種別、タイトル/投稿者、本文抜粋、URL、収集日時を表示。  
* **質的コーディング（タグ付け・アノテーション）**:  
  * 学生が自由にコード（カテゴリ、ラベル、ポジ/ネガ、テーマ等）を作成し、色分けしてアイテムに付与。  
  * アイテムごとに分析メモ（研究用考察）を記述可能。  
* **インライン検索・ソート**:  
  * 収集済みデータ内でのキーワード絞り込みや、付与したコードによるフィルタリング。

## **3.4 エクスポート機能**

* **CSV出力**: 分析ソフトウェア（Excel、SPSS、R等）に取り込みやすい形式でダウンロード。  
* **JSON出力**: 生データおよびコーディング結果を含む全属性をエクスポート。

# **4\. データベース設計 (Supabase / PostgreSQL)**

## **4.1 テーブル定義**

\-- 1\. 検索セッション管理テーブル

CREATE TABLE searches (

    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

    user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    query\_and TEXT\[\],

    query\_or TEXT\[\],

    query\_not TEXT\[\],

    selected\_sources TEXT\[\] NOT NULL,

    total\_results INT DEFAULT 0,

    created\_at TIMESTAMPTZ DEFAULT now()

);

\-- 2\. 収集アイテムテーブル

CREATE TABLE scraped\_items (

    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

    search\_id UUID REFERENCES searches(id) ON DELETE CASCADE NOT NULL,

    user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    source\_type TEXT NOT NULL CHECK (source\_type IN ('x', 'news', 'blog', 'web')),

    title TEXT,

    content TEXT NOT NULL,

    url TEXT,

    author\_name TEXT,

    published\_at TIMESTAMPTZ,

    raw\_metadata JSONB,

    created\_at TIMESTAMPTZ DEFAULT now()

);

\-- 3\. 質的コーディング（タグ定義）テーブル

CREATE TABLE qualitative\_codes (

    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

    user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    name TEXT NOT NULL,

    color\_hex TEXT DEFAULT '\#3B82F6',

    description TEXT,

    created\_at TIMESTAMPTZ DEFAULT now()

);

\-- 4\. アイテムとコードの紐付け（中間テーブル＋メモ）

CREATE TABLE item\_codings (

    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

    item\_id UUID REFERENCES scraped\_items(id) ON DELETE CASCADE NOT NULL,

    code\_id UUID REFERENCES qualitative\_codes(id) ON DELETE CASCADE NOT NULL,

    user\_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    memo TEXT,

    created\_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE (item\_id, code\_id)

);

## **4.2 行セキュリティポリシー (RLS)**

すべてのテーブルでRLSを有効化し、他人のデータにアクセスできないように制御します。ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

ALTER TABLE scraped\_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE qualitative\_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE item\_codings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own searches" ON searches

    FOR ALL USING (auth.uid() \= user\_id);

CREATE POLICY "Users can access own scraped items" ON scraped\_items

    FOR ALL USING (auth.uid() \= user\_id);

CREATE POLICY "Users can access own qualitative codes" ON qualitative\_codes

    FOR ALL USING (auth.uid() \= user\_id);

CREATE POLICY "Users can access own item codings" ON item\_codings

    FOR ALL USING (auth.uid() \= user\_id);

# **5\. 外部API連携仕様**

## **5.1 X API v2 (Recent Search) 連携仕様**

* **エンドポイント**: `/2/tweets/search/recent` (GET)  
* **認証方式**: Bearer Token (Application-Only Authentication)  
* **クエリマッピング**:  
  * AND: 半角スペース区切り (例: `keyword1 keyword2`)  
  * OR: 丸括弧とOR演算子 (例: `(termA OR termB)`)  
  * NOT: マイナス記号 (例: `-excludeWord`)  
  * ノイズ除外設定: `-is:retweet -is:reply`  
* **取得パラメータ**: `tweet.fields=created_at,author_id,text`, `expansions=author_id`, `user.fields=name,username`

## **5.2 Gemini API (Search Grounding) 連携仕様**

* **SDK**: Google Gen AI SDK  
* **推奨モデル**: `gemini-1.5-flash`  
* **設定**: `tools: [{ googleSearch: {} }]` を有効化し、レスポンス形式をJSON Schemaで指定。  
* **ドメイン指定フィルタ**:  
  * ネットニュース: 主要ニュースメディアのドメインを自動付加  
  * ブログ記事: 各種ブログプラットフォームのドメインを自動付加  
* **システム指示**:指定されたキーワードに基づき、最新のWeb情報を収集・要約し、指定されたJSON構造で出力すること。

# **6\. コスト管理・セキュリティ設計**

1. **X API 課金上限保護**:  
   * Edge Function側で1回あたりの最大取得件数（上限20〜50件）を厳密に制限。  
   * データベース内にユーザーごとの「日次/月次リクエスト制限カウンター」を導入し、意図せぬ過剰請求を防止。  
2. **APIキーの秘匿管理**:  
   * `GEMINI_API_KEY` および `X_BEARER_TOKEN` はフロントエンドに一切含めず、Supabase Secrets（環境変数）に格納。  
3. **CSVインジェクション対策**:  
   * エクスポート時、セルの先頭文字が `=`, `+`, `-`, `@` の場合はエスケープ処理（シングルクォート付加）を実施。

# **7\. 実装・開発ロードマップ（Bolt.new活用）**

* **Step 1: Bolt.new によるUIおよび基本機能の実装**  
  * Google OAuth認証、検索条件入力、結果テーブル、質的コーディング機能、CSVエクスポートUIを構築。  
* **Step 2: Supabaseプロジェクト連携**  
  * Google OAuth Providerの有効化、テーブル定義SQLおよびRLSポリシーの適用。  
* **Step 3: Supabase Edge Functions の作成**  
  * `search-proxy` 関数を作成し、X APIとGemini APIを並列実行して共通フォーマットでDB保存・返却。  
* **Step 4: 動作検証と制限値のチューニング**  
  * マルチユーザー動作確認、取得件数・APIクォータ・コストの最適化。

