# Not-X - 社群網站平台

一個功能完整的社群網站平台，實作了發文、留言、按讚、轉發、追蹤等核心功能，並支援即時互動。

## 🚀 部署連結

**線上展示**: https://wp1141-swart-gamma.vercel.app

## 📋 功能清單

### 用戶認證與授權
- ✅ Google OAuth 登入
- ✅ GitHub OAuth 登入
- ✅ 自訂使用者 ID (@username)
- ✅ 使用者 ID 即時驗證與可用性檢查
- ✅ 30 分鐘自動登出機制

### 發文功能
- ✅ 發布新貼文
- ✅ 280 字元限制
- ✅ URL 自動辨識（計為 23 字元）
- ✅ Hashtag (#) 和 Mention (@) 不計入字數
- ✅ 草稿儲存功能
- ✅ 刪除自己的貼文

### 互動功能
- ✅ 按讚/取消讚
- ✅ 留言（支援遞迴留言）
- ✅ 轉發/取消轉發
- ✅ **即時更新** - 使用 Pusher 實現按讚、留言、轉發的即時同步

### 社交功能
- ✅ 追蹤/取消追蹤用戶
- ✅ 查看追蹤者/正在追蹤列表
- ✅ Following Feed（只顯示追蹤用戶的貼文）

### 個人頁面
- ✅ 個人資料頁面
- ✅ 編輯個人資料（名稱、簡介、頭像、封面圖）
- ✅ 查看個人貼文
- ✅ 查看按讚的貼文
- ✅ 貼文/追蹤/粉絲統計

### UI/UX
- ✅ 響應式設計（RWD）
- ✅ 深色主題
- ✅ Loading 狀態
- ✅ 時間顯示（幾秒前、幾分鐘前等）
- ✅ Modal 彈窗（發文、編輯資料）

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Home Feed  │  │   Profile    │  │  Post Modal  │      │
│  │   (發文列表)  │  │  (個人頁面)   │  │  (發文視窗)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                 │                 │              │
│           └─────────────────┴─────────────────┘              │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   RESTful API     │
                    │   (Next.js API)   │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
  ┌─────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
  │  NextAuth  │      │   Prisma    │      │   Pusher    │
  │  (OAuth)   │      │    (ORM)    │      │ (即時通訊)   │
  └────────────┘      └──────┬──────┘      └─────────────┘
                              │
                      ┌───────▼────────┐
                      │   PostgreSQL   │
                      │   (Vercel DB)  │
                      └────────────────┘
```

## 🛠️ 技術堆疊

### 前端
- **框架**: Next.js 16 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS v4
- **狀態管理**: React Hooks

### 後端
- **API**: Next.js API Routes (RESTful)
- **ORM**: Prisma
- **資料庫**: PostgreSQL (Vercel Postgres)
- **認證**: NextAuth.js
- **即時通訊**: Pusher

### 部署
- **平台**: Vercel
- **CI/CD**: GitHub Auto-deployment

## 📦 安裝與啟動

### 環境需求
- Node.js 20+
- PostgreSQL 14+
- npm 或 yarn

### 1. Clone 專案
```bash
git clone https://github.com/chiahua-yang/wp1141.git
cd wp1141/hw5/web
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 設定環境變數
在 `web/` 目錄建立 `.env` 檔案：

```env
# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Pusher
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-pusher-cluster
```

### 4. 初始化資料庫
```bash
npx prisma migrate dev
npx prisma generate
```

### 5. 啟動開發伺服器
```bash
npm run dev
```

訪問 http://localhost:3000

## 🔑 OAuth 設定

### Google OAuth
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 創建 OAuth 2.0 Client ID
3. 設定 Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google`

### GitHub OAuth
1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)
2. 創建 OAuth App
3. 設定 Authorization callback URL:
   - `http://localhost:3000/api/auth/callback/github`
   - `https://your-domain.vercel.app/api/auth/callback/github`

### Pusher 設定
1. 前往 [Pusher Dashboard](https://dashboard.pusher.com/)
2. 創建新的 App
3. 複製 App ID, Key, Secret, Cluster 到 `.env`

## 📂 專案結構

```
web/
├── src/
│   ├── app/                    # Next.js App Router 頁面
│   │   ├── api/               # API Routes
│   │   │   ├── auth/         # NextAuth
│   │   │   ├── posts/        # 貼文相關 API
│   │   │   ├── users/        # 用戶相關 API
│   │   │   └── drafts/       # 草稿 API
│   │   ├── home/             # 首頁
│   │   ├── profile/          # 個人頁面
│   │   ├── post/[id]/        # 單篇貼文
│   │   └── user/[userId]/    # 用戶頁面
│   ├── components/            # React 組件
│   │   ├── HomeFeed.tsx      # 首頁動態
│   │   ├── Post.tsx          # 貼文組件
│   │   ├── PostModal.tsx     # 發文彈窗
│   │   ├── ProfilePage.tsx   # 個人頁面
│   │   └── LayoutWrapper.tsx # 全域布局
│   └── lib/                   # 工具函數
│       ├── auth.ts           # NextAuth 配置
│       ├── prisma.ts         # Prisma Client
│       ├── pusher.ts         # Pusher Server
│       └── pusher-client.ts  # Pusher Client
├── prisma/
│   └── schema.prisma         # 資料庫 Schema
└── public/                    # 靜態資源
```

## 🗄️ 資料庫結構

主要資料表：
- **User**: 用戶資料
- **Post**: 貼文（支援遞迴留言）
- **PostLike**: 按讚記錄
- **Repost**: 轉發記錄
- **Follow**: 追蹤關係
- **Draft**: 草稿儲存

## 🚀 部署到 Vercel

1. 推送程式碼到 GitHub
2. 前往 [Vercel](https://vercel.com/)，導入專案
3. 設定 **Root Directory** 為 `hw5/web`（從 repo 根目錄算起）
4. 配置環境變數（見下方「長期部署檢查清單」）
5. 部署！

### 讓 Vercel 連結與設定長期不失效

要讓線上網址穩定、登入與資料庫等設定不失效，請依下列步驟一次設好並保留在 Vercel 與 OAuth 後台。

| 項目 | 說明 |
|------|------|
| **Production 網址** | Vercel 的 Production 部署網址（如 `https://xxx.vercel.app`）在未刪專案前不會過期。請固定用 **Production** 分支（通常是 `main`）部署，不要依賴 Preview 網址當正式環境。 |
| **環境變數全部在 Vercel 設** | 到 **Vercel Dashboard → 你的專案 → Settings → Environment Variables**，把下面清單的變數都設在 **Production**（可順便設 Preview 以利測試）。不要只靠本地 `.env`，否則重新部署或新環境都會失效。 |
| **NEXTAUTH_URL** | 在 Vercel 上**必須**設成你的 Production 網址，例如 `https://wp1141-swart-gamma.vercel.app`（結尾不要加 `/`）。設成 `localhost` 會導致登入 callback 失敗。 |
| **NEXTAUTH_SECRET** | 用 `openssl rand -base64 32` 產生一組固定值，在 Vercel 設好後就不要改，否則既有 session 會失效。 |
| **DATABASE_URL** | 使用 **雲端 PostgreSQL**（Vercel Postgres、Neon、Supabase、Railway 等）。本地 `localhost` 在 Vercel 上無法連線。若用 Vercel Postgres，在 Vercel 專案裡連結後會自動注入。 |
| **OAuth Redirect URI** | 在 **Google Cloud Console** 與 **GitHub OAuth App** 的授權 callback 中，加入你的 Production 網址：<br>• Google: `https://你的網址/api/auth/callback/google`<br>• GitHub: `https://你的網址/api/auth/callback/github`<br>若之後換了 Vercel 網址，要記得回 OAuth 後台改這兩個 URI，否則登入會失效。 |
| **Pusher / SMTP** | 與本地相同，把 `PUSHER_*`、`SMTP_*` 等變數在 Vercel Environment Variables 設好即可。 |
| **Root Directory** | 在 Vercel 專案設定中 **Root Directory** 固定為 `hw5/web`，不要改回 repo 根目錄，否則 build 會失敗。 |
| **不要刪除專案** | 刪除 Vercel 專案後，該專案的網址會失效。若只是重新部署，同一個專案會沿用同一組 Production 網址。 |

**建議一次檢查清單（部署前）：**

- [ ] Vercel 專案 Root Directory = `hw5/web`
- [ ] 所有環境變數已在 Vercel 的 **Production** 環境設定
- [ ] `NEXTAUTH_URL` = 你的 Vercel Production 網址（例如 `https://wp1141-swart-gamma.vercel.app`）
- [ ] `DATABASE_URL` 為雲端 PostgreSQL 連線字串（非 localhost）
- [ ] Google / GitHub OAuth 的 Authorized redirect URI 已包含 `https://你的網址/api/auth/callback/google` 與 `.../api/auth/callback/github`
- [ ] 專案已連接 GitHub，Production 分支為 `main`（或你指定的分支）

## 📝 常用指令

```bash
npm run dev          # 開發模式
npm run build        # 建置生產版本
npm run start        # 啟動生產伺服器
npm run lint         # 執行 ESLint
npx prisma studio    # 開啟資料庫管理介面
npx prisma migrate dev  # 執行資料庫遷移
```

## 🐛 疑難排解

### OAuth 登入失敗
- 確認 Redirect URI 設定正確
- 檢查 Client ID 和 Secret 是否正確

### 資料庫連接失敗
- 確認 DATABASE_URL 格式正確
- 檢查資料庫服務是否啟動

### 即時更新不工作
- 確認 Pusher 環境變數設定正確
- 檢查瀏覽器 Console 是否有錯誤

## 👥 作者

Jerry (chiahua-yang)

## 📄 授權

本專案為課程作業，僅供學習使用。
