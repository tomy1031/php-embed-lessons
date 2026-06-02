# RPGで学ぶ フルスタックPHP カリキュラム 設計書

- 日付: 2026-06-02
- ステータス: ドラフト（ユーザーレビュー待ち）
- 対象基盤: 既存の `php-embed-lessons`（php-wasm学習システム。`lessons/*.html` に `<php-run>`/`<php-exercise>`）

---

## 1. 目的

PHP完全初心者が、**RPGゲームの比喩で概念をつかみ → 同じ概念を実システムでの使い方として再演**しながら、最終的に**フルスタックPHPエンジニアに必要な範囲を網羅**して学べる、ブラウザだけで動く教材を作る。

## 2. 確定した方針（ブレスト結果）

| 論点 | 決定 |
|---|---|
| 対象学習者 | 完全初心者（プログラミングほぼ未経験）。ペースはゆっくり、比喩を強めに |
| RPG↔実システム | **各レッスン二部構成**：① RPGで概念 → ② 実システムで再演 |
| 実行戦略 | **段階的ハイブリッド**：基礎＋DB入門はphp-wasmでライブ（DBはSQLite）。フォーム/セッションは擬似リクエスト注入で可能範囲ライブ。本物MySQL/デプロイは「読むコード＋図解＋ローカルXAMPP手順」 |
| 画像 | `chatgpt-batch-image-gen` スキルで生成。統一アートスタイル、レッスン毎にプロンプトmanifest、`lessons/assets/img/<lesson>/` に保存 |
| 配布 | 既存どおり：master マージで GitHub Pages 自動公開（リンク共有） |

## 3. レッスン標準テンプレート

各レッスンHTMLは次の骨格に統一する（`<head>` で `/src/index.ts` を読み込む）。

1. **導入**：RPGの場面イラスト（画像）＋「このレッスンのねらい」(箇条書き3点)
2. **① RPGで概念**：短い解説 → `<php-run>`（動く例）→ `<php-exercise>`（採点付き演習、RPG題材）
3. **② 実システムで再演**：「実務ではこう使う」短い解説 → `<php-run>` または `<php-exercise>`（EC/ユーザー管理等の題材）
4. **まとめ＆チェック**：要点3行 ＋ 仕上げの採点付き演習1問
5. **ナビ**：前後レッスンへのリンク（`<course-nav>` が course manifest から自動描画）

各レッスンは「解説段落は短く（2〜4文）、手を動かす量を多く」を原則とする。

## 4. カリキュラム全体マップ

実行欄: **live**=php-wasmでそのまま実行 / **sqlite**=PDO+SQLiteでライブ / **sim**=擬似リクエスト注入でライブ / **read**=読むコード＋図解＋手順（ライブ無し）

### Phase A — RPGで基礎をつかむ（全レッスン live）
| # | テーマ | RPGの題材 | 実システム再演 | 実行 |
|---|---|---|---|---|
| A01 | 変数とデータ型 | HP/MP/名前/レベル（int/float/string/bool/null） | 商品価格・在庫・ユーザー名 | live |
| A02 | 演算子と比較（`==`/`===`） | ダメージ計算・命中判定。`==`/`===`/`<=>`/論理/三項/`??`・truthiness | フォーム値の比較・在庫判定 | live |
| A03 | 制御構文 | if/elseif/switch（戦闘コマンド）、while/for/foreach（ターン/敵列）、break/continue | 注文ステータス分岐・一覧ループ | live |
| A04 | 配列 | パーティ/インベントリ。添字・連想・多次元・主要関数 | カート・商品リスト | live |
| A05 | 関数 | スキル/技。引数・戻り値・デフォルト・型宣言・可変長・スコープ | 税/送料計算の関数化 | live |
| A06 | 文字列 | 戦闘ログ。補間・ヒアドキュメント・sprintf・主要関数 | 表示フォーマット・スラッグ生成 | live |
| A07 | 連想配列とデータ構造 | モンスター図鑑（ネスト・反復・整列） | 設定/JSON的データ | live |
| A08 | クラスとオブジェクト | `$character` クラス（プロパティ/メソッド/コンストラクタ/`$this`） | User/Product クラス | live |
| A09 | 継承とポリモーフィズム | `Character` → `Hero`/`Magician`/`Monster`。override・abstract・interface(`Battler`) | PaymentMethod(Credit/PayPay) 等 | live |
| A10 | カプセル化・static・定数・enum | public/private/protected・getter/setter・static(図鑑数)・const・enum(属性/状態) | ステータス定数・設定値 | live |
| A11 | 例外処理 | 戦闘不能/不正コマンド。try/catch/finally/throw・独自例外 | 入力エラー/DBエラー処理 | live |

### Phase B — 実システムへの橋渡し（中級）
| # | テーマ | RPGの題材 | 実システム再演 | 実行 |
|---|---|---|---|---|
| B01 | 名前空間・Composer・オートロード | コードをギルド別に整理（PSR-4） | ライブラリ導入 | read |
| B02 | ファイルとJSON | セーブデータ（file_get/put・json） | 設定ファイル・エクスポート | live |
| B03 | 日付・時刻 | クエスト期限（DateTime・差分） | 注文日時・有効期限 | live |
| B04 | 正規表現 | 呪文詠唱パターン照合（preg_*） | メール/電話バリデーション | live |
| B05 | HTTPと`$_GET`/`$_POST` | 酒場の依頼掲示板＝フォーム | 検索/問い合わせフォーム | sim |
| B06 | セッションとクッキー | 冒険の進行/ログイン状態 | ログイン維持・カート保持 | sim |
| B07 | DB入門（PDO+SQLite） | 世界のセーブDB。接続・CRUD・プリペアド | 商品/ユーザーCRUD | sqlite |
| B08 | SQL実践とリレーション | パーティ⇔メンバー・所持アイテム。JOIN・外部キー・集計 | 注文⇔明細 | sqlite |
| B09 | セキュリティ基礎 | 不正コマンド対策。XSS/SQLi/CSRF/password_hash・検証 | ログイン/フォーム防御 | sim/read |
| B10 | 本物のMySQL | SQLiteとの違い・接続・XAMPP/MAMP手順 | 本番DB接続 | read |

### Phase C — フルスタック実践（上級）
| # | テーマ | RPGの題材 | 実システム再演 | 実行 |
|---|---|---|---|---|
| C01 | アーキテクチャとMVC | 入力→処理→描画 をMVCに対応 | Request→Controller→Model→View | sim |
| C02 | ルーティング/フロントコントローラ | ワールドマップの行き先振り分け | URLルーティング | sim/read |
| C03 | テンプレートとビュー | UI描画（エスケープ込みの出力分離） | 一覧/詳細ページ生成 | live |
| C04 | REST API | ギルドAPIでデータ授受（JSON・ステータスコード） | 商品API | sim |
| C05 | テスト（PHPUnit） | 戦闘ロジックの自動検証（アサーション・設計） | ユニットテスト | read/live一部 |
| C06 | フレームワーク概観（Laravel等） | 冒険を加速する装備の位置づけ | 実務での選択基準 | read |
| C07 | デプロイと環境 | 世界を公開する（env・本番設定・Git・手順） | 公開フロー（本リポのPages例） | read |
| C08 | キャップストーン | RPGデータ管理Webアプリを作る総合課題 | DB＋フォーム＋認証＋一覧/詳細 | sqlite/sim |

合計 29 レッスン。`read` のレッスンも、実行できる部分（純粋ロジック）は `<php-exercise>` でライブにする。

## 5. 必要なインフラ改修（既存システムへの追加）

| 改修 | 内容 | どのPhaseで必要 |
|---|---|---|
| レッスンの再帰探索 | `vite.config.ts` の入力を `lessons/**/*.html` に拡張し、`lessons/phase-a/` 等のサブフォルダを許可 | 第1増分 |
| コース目次＆ナビ | `lessons/course.json`（順序・タイトル・パス）＋ `<course-nav>` Webコンポーネント（前後リンク自動描画）＋ コース目次ページ | 第1増分 |
| レッスン用CSS/テンプレ | 二部構成・図版・コールアウト用の `src/styles/course.css`（`index.ts` で読込） | 第1増分 |
| コース整合E2E | `solution` と `expected` の両方を持つ全 `<php-exercise>` について、solution実行→`正解` を自動検証するPlaywrightテスト | 第1増分 |
| 擬似リクエスト注入 | `WasmExecutor` に実行前 `$_GET/$_POST/$_SESSION/$_SERVER` を注入する仕組み（オプション） | Phase B |
| 画像配置 | `lessons/assets/img/<lesson>/`。HTMLは想定ファイル名を参照し、未生成でもalt textで成立 | 随時 |

## 6. 画像パイプライン

- スキル `chatgpt-batch-image-gen`（Chrome拡張＋GPT）で生成し `~/Pictures/chatgpt/` 経由で取り込み → `lessons/assets/img/<lesson>/` に配置。
- **統一アートスタイル**：全画像で共通のスタイル接頭辞プロンプト（例：「やわらかい2Dゲームアート、明るい配色、日本語UI想定の余白」）を使う。
- 各レッスンは画像プロンプトを `lessons/<phase>/<lesson>.images.md` に列挙（用途・ファイル名・alt・プロンプト）。生成は別工程（ユーザー＋Chrome拡張）で、HTMLは先にファイル名を参照して作る。

## 7. 検証方針

- **採点演習の自己整合**：各 `<php-exercise>` が `expected` を持つなら `solution` も持ち、`solution` 実行結果が正規化比較で `expected` に一致すること（コース整合E2Eで全レッスン自動チェック）。
- **ビルド**：`npm run build` がエラーなく全レッスンを出力。
- **リンク**：course.json の各パスが存在し、ナビが前後を正しく指す。

## 8. 命名・配置

- レッスン: `lessons/phase-a/a01-variables.html` … `lessons/phase-c/c08-capstone.html`
- コース目次: `lessons/index.html`（course.json から生成 or 手書きのTOC）
- 既存デモ（`lessons/01-variables.html` 等）: 本カリキュラムが正式版。デモは `lessons/demo/` へ移動し、目次は新カリキュラムを指す（デモは残すが非リンク）。

## 9. 増分（モジュール）戦略

仕様書＝全体マップ。実装は publishable な増分（モジュール）ごとの連続プランで進める。

1. **増分1（最初のプラン）**：インフラ改修（§5の第1増分4点）＋ Phase A の A01〜A03（完全執筆）。← これ単体で「公開できる導入コース」になる
2. **増分2**：Phase A A04〜A11
3. **増分3**：Phase B インフラ（擬似リクエスト注入）＋ B01〜B10
4. **増分4**：Phase C C01〜C08

各増分は独立して `npm test` / build / コース整合E2E が緑になり、マージで公開される。

## 10. スコープ外・既知の制限

- 本物のMySQLの**ライブ実行**・実デプロイのライブは対象外（読む＋手順で扱う）。
- フレームワーク（Laravel等）の本格チュートリアルは対象外（概観・位置づけのみ）。
- セキュリティは入門範囲（網羅的な脆弱性対策の専門書ではない）。
- 無限ループの強制停止不可（基盤の制限。教材に無限ループを含めない）。

## 11. 変更履歴
| 日付 | 変更 |
|---|---|
| 2026-06-02 | 初版ドラフト |
