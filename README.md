# X-Clone 專案啟動指南

這是一個模仿 Twitter/X 核心功能的作業專案，完整程式位於 `web/` 目錄。專案使用 Next.js App Router、NextAuth、Prisma 與 PostgreSQL，並實作 OAuth 登入、使用者 `@userID` 設定、貼文/留言/按讚/轉發等功能。

## 目錄結構

```
hw5/
├── README.md               # 本文件
├── .gitignore              # Git 忽略規則
├── image/                  # 作業提供的 UI 參考圖（已加入 .gitignore）
├── guideline.txt           # 作業說明檔案（已加入 .gitignore）
└── web/                    # Next.js + Prisma + NextAuth 原始碼
```

## 技術堆疊

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS v4
- NextAuth（Google / GitHub OAuth）
- Prisma ORM + PostgreSQL
- RESTful API（貼文、留言、愛心、轉發、追蹤、草稿）
- 規劃整合 Pusher 進行即時同步

## 事前準備

1. Node.js 20 以上版本（建議搭配 npm）
2. PostgreSQL 14 以上，或可連線的雲端資料庫
3. Google / GitHub OAuth 憑證各一組

## 建立環境變數

在 `web/.env` 建立以下內容（請勿提交至 Git）：

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=請自行產生的安全隨機字串

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

- 產生 `NEXTAUTH_SECRET`：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `DATABASE_URL` 請替換為實際的 PostgreSQL 連線字串。

### OAuth 回呼網址（本機開發）

| Provider | 設定入口 | Callback URL |
|----------|----------|--------------|
| Google   | Google Cloud Console → Credentials | `http://localhost:3000/api/auth/callback/google` |
| GitHub   | GitHub → Settings → Developer settings → OAuth Apps | `http://localhost:3000/api/auth/callback/github` |

部署正式環境時，請改用實際網域並同步更新 OAuth 設定。

## 安裝與啟動

```bash
cd web
npm install                # 安裝相依套件

npx prisma migrate dev     # 套用 Prisma schema，建立資料表
# npx prisma generate      # 如需手動重新產生 Prisma Client

npm run dev                # 啟動 Next.js 開發伺服器
```

瀏覽 `http://localhost:3000`：
- 未登入 → 顯示登入前 Landing Page，可選擇 OAuth Provider。
- 已登入 → 會自動導向 `/home` 並顯示含 Sidebar 的主畫面。

## 核心功能摘要

- **登入流程**：登出/未登入時進入 Landing Page，使用 Google / GitHub OAuth。登入後若尚未設定 `@userID`，會被導向 `setup-username`。
- **使用者代號驗證**：`@userID` 僅允許 3–15 個小寫字母或底線，輸入時即時檢查格式與是否被占用，並提供推薦選項。
- **首頁（Home）**：具 All / Following 篩選、貼文時間排序、留言/按讚/轉發/刪除、自動展開留言、支援遞迴路由進入單篇貼文或留言串。
- **發文（Post）**：Modal 與 inline composer，遵守 280 字上限；網址計算 23 字元；Hashtag/Mention 不計字數；可儲存 Draft。
- **個人頁（Profile）**：區分自己與他人視圖，包含 Follow / Following、貼文/喜歡清單、編輯個人資料 Modal。
- **自動登出**：使用者 30 分鐘內無操作（可於 `LayoutWrapper.tsx` 調整 `IDLE_TIMEOUT`）後，下次互動會自動登出並回到登入頁。

## 常用指令（於 `web/` 目錄）

- `npm run dev`：開發模式
- `npm run build`：建置正式版
- `npm run start`：啟動正式伺服器
- `npm run lint`：執行 ESLint
- `npx prisma migrate dev`：套用資料庫遷移
- `npx prisma studio`：啟動 Prisma Studio 管理資料（可選）

## 疑難排解

- **OAuth callback 錯誤**：確認 Provider 設定的 Redirect URI 與 `.env` 完全一致。
- **Prisma P1000 認證失敗**：確認 `DATABASE_URL` 帳密與資料庫服務啟動狀態。
- **登入狀態混亂**：可以在網頁中點選 Sign out，或清除瀏覽器 Cookie；NextAuth 預設 Session 有效期 30 天。

## 待完成項目

- 撰寫端對端/元件測試（Playwright / Testing Library）
- 串接 Pusher 進行即時更新
- 依照作業附件調整 UI 細節、RWD 與無障礙
- 加入種子資料與測試工具腳本

---

若要在其他機器或部署環境執行，請複製 `.env` 並確認資料庫可對外連線；切勿將敏感環境變數提交至版本控制。祝開發順利！

