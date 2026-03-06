# Not-X 社群網站平台 - AI 開發指南

## 專案概覽

**專案名稱**: Not-X (類 Twitter/X 社群網站平台)
**線上展示**: https://wp1141-swart-gamma.vercel.app
**技術棧**: Next.js 16 + TypeScript + Prisma + PostgreSQL + NextAuth.js + Pusher
**部署平台**: Vercel

---

## 核心技術架構

### 前端
- **框架**: Next.js 16 (App Router)
- **語言**: TypeScript 5 (嚴格模式)
- **樣式**: Tailwind CSS v4
- **狀態管理**: React Hooks
- **即時通訊**: Pusher-js 8.4.0

### 後端
- **API**: Next.js API Routes (RESTful)
- **ORM**: Prisma 6.18.0
- **資料庫**: PostgreSQL (Vercel Postgres)
- **認證**: NextAuth.js 4.24.13 with Prisma Adapter
- **即時通訊**: Pusher 5.2.0 (Server)
- **密碼加密**: bcryptjs 2.4.3
- **Email**: nodemailer 7.0.13
- **驗證**: Zod 4.1.12

---

## 目錄結構

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 全域佈局
│   │   ├── page.tsx            # 登入/註冊頁
│   │   ├── providers.tsx       # SessionProvider
│   │   ├── home/               # 首頁動態
│   │   ├── profile/            # 個人頁面
│   │   ├── post/[id]/          # 貼文詳情頁
│   │   ├── user/[userId]/      # 其他用戶頁面
│   │   ├── setup-username/     # 設定 @userId
│   │   └── api/                # API Routes
│   │       ├── auth/           # 認證相關
│   │       ├── posts/          # 貼文相關
│   │       ├── drafts/         # 草稿相關
│   │       ├── user/           # 當前用戶
│   │       └── users/          # 其他用戶
│   ├── components/             # React 組件
│   │   ├── LayoutWrapper.tsx   # 自動登出 & userId 檢查
│   │   ├── Sidebar.tsx         # 側邊欄導航
│   │   ├── HomeFeed.tsx        # 首頁動態列表
│   │   ├── Post.tsx            # 貼文組件（即時更新）
│   │   ├── PostModal.tsx       # 發文彈窗
│   │   └── ProfilePage.tsx     # 個人頁面組件
│   └── lib/                    # 工具函數
│       ├── auth.ts             # NextAuth 配置
│       ├── prisma.ts           # Prisma Client
│       ├── pusher.ts           # Pusher Server
│       ├── pusher-client.ts    # Pusher Client
│       ├── timeFormat.ts       # 時間格式化
│       └── validation.ts       # Zod Schema
└── prisma/
    ├── schema.prisma           # 資料庫 Schema
    └── migrations/             # 遷移歷史
```

---

## 資料庫架構

### User 用戶模型
```prisma
model User {
  id                 String   @id @default(cuid())
  userId             String?  @unique       // @username (3-15 字元，小寫英數字底線)
  name               String?                // OAuth 取得的名字
  displayName        String?                // 顯示名稱
  email              String?  @unique
  passwordHash       String?  @db.Text      // Email 註冊密碼（bcrypt）
  birthday           DateTime?              // 生日
  lastSignInProvider String?                // 最後登入方式（google/github/credentials）
  image              String?                // 頭像 URL
  coverImage         String?                // 封面圖 URL
  bio                String?  @db.Text      // 個人簡介

  // 統計欄位（非正規化，提升查詢效能）
  postsCount         Int      @default(0)
  followersCount     Int      @default(0)
  followingCount     Int      @default(0)

  // 關聯
  posts              Post[]     @relation("UserPosts")
  likes              PostLike[]
  reposts            Repost[]
  following          Follow[]   @relation("Following")
  followers          Follow[]   @relation("Followers")
  drafts             Draft[]
}
```

### Post 貼文模型（遞迴結構）
```prisma
model Post {
  id        String   @id @default(cuid())
  authorId  String
  content   String   @db.Text
  createdAt DateTime @default(now())

  // 遞迴結構：支援無限層留言
  parentId  String?
  parent    Post?    @relation("PostToComments", fields: [parentId])
  comments  Post[]   @relation("PostToComments")

  // 關聯
  author    User     @relation("UserPosts", fields: [authorId], onDelete: Cascade)
  likes     PostLike[]
  reposts   Repost[]

  @@index([createdAt])
  @@index([authorId])
}
```

### PostLike, Repost, Follow
- 使用 `@@unique([userId, postId])` 防止重複按讚/轉發
- 使用 `@@unique([followerId, followingId])` 防止重複追蹤
- 所有關聯都設定 `onDelete: Cascade` 確保資料一致性

---

## API 路由規範

### 認證 API
| 端點 | 方法 | 功能 | 請求 | 回應 |
|------|------|------|------|------|
| `/api/auth/[...nextauth]` | * | NextAuth 核心 | - | - |
| `/api/auth/email/register` | POST | Email 註冊 | `{ name, email, password, birthday }` | `{ success: true }` |
| `/api/auth/email/send-code` | POST | 發送驗證碼 | `{ email }` | `{ success: true }` |
| `/api/auth/email/verify-code` | POST | 驗證碼驗證 | `{ email, code }` | `{ valid: boolean }` |
| `/api/auth/accounts` | GET | 取得關聯帳號 | - | `Account[]` |

### 貼文 API
| 端點 | 方法 | 功能 | 查詢參數 | 請求 | 回應 |
|------|------|------|----------|------|------|
| `/api/posts` | GET | 取得貼文列表 | `filter=all/following`, `userId` | - | `Post[]` |
| `/api/posts` | POST | 建立貼文/留言 | - | `{ content, parentId? }` | `Post` |
| `/api/posts/[id]` | GET | 取得單篇貼文 | - | - | `Post + Comments` |
| `/api/posts/[id]` | DELETE | 刪除貼文 | - | - | `{ success: true }` |
| `/api/posts/[id]/like` | POST | 按讚/取消讚 | - | - | `{ liked: boolean }` |
| `/api/posts/[id]/repost` | POST | 轉發/取消轉發 | - | - | `{ reposted: boolean }` |
| `/api/posts/liked` | GET | 已按讚貼文 | `userId` | - | `Post[]` |

### 用戶 API
| 端點 | 方法 | 功能 | 請求 | 回應 |
|------|------|------|------|------|
| `/api/user/current` | GET | 當前用戶資訊 | - | `User` |
| `/api/user/handle` | PATCH | 設定 @userId | `{ userId }` | `User` |
| `/api/user/handle/availability` | GET | 檢查可用性 | `?userId=xxx` | `{ available: boolean }` |
| `/api/user/profile` | PATCH | 更新個人資料 | `{ displayName?, bio?, image?, coverImage? }` | `User` |
| `/api/users/[userId]` | GET | 取得用戶資訊 | - | `User` |
| `/api/users/[userId]/follow` | POST | 追蹤/取消追蹤 | - | `{ following: boolean }` |

---

## 即時互動機制 (Pusher)

### 即時更新事件
| Channel | Event | Data | 觸發時機 |
|---------|-------|------|----------|
| `post-{postId}` | `like-update` | `{ postId, liked, likeCount, userId }` | 按讚/取消讚 |
| `post-{postId}` | `repost-update` | `{ postId, repostCount }` | 轉發/取消轉發 |
| `post-{postId}` | `comment-update` | `{ postId, commentCount }` | 新增留言 |

### 使用方式
```typescript
// Server (API Route)
import { triggerPusherEvent } from "@/lib/pusher";
await triggerPusherEvent(`post-${postId}`, "like-update", {
  postId,
  liked: true,
  likeCount: 42,
  userId: currentUser.id,
});

// Client (Component)
import { getPusherClient } from "@/lib/pusher-client";
const pusher = getPusherClient();
const channel = pusher.subscribe(`post-${postId}`);
channel.bind("like-update", (data) => {
  setLikeCount(data.likeCount);
});
```

---

## 重要業務邏輯

### 1. 字元計數規則（280 字元限制）
```typescript
// URL 固定佔 23 字元（Twitter 規則）
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Hashtag (#) 和 Mention (@) 不計入字數
const hashtagMentionRegex = /[#@]\w+/g;

function calculateCharCount(content: string): number {
  let count = content.length;

  // 扣除 URL 實際長度，加上 23
  const urls = content.match(URL_REGEX);
  if (urls) {
    urls.forEach(url => {
      count = count - url.length + 23;
    });
  }

  // 扣除 Hashtag 和 Mention
  const hashtagMentions = content.match(hashtagMentionRegex);
  if (hashtagMentions) {
    hashtagMentions.forEach(tag => {
      count -= tag.length;
    });
  }

  return count;
}
```

### 2. 貼文列表邏輯

#### All Feed（所有貼文）
```typescript
const posts = await prisma.post.findMany({
  where: { parentId: null },  // 只顯示頂層貼文，不顯示留言
  orderBy: { createdAt: "desc" },
  include: {
    author: true,
    likes: true,
    reposts: true,
    _count: { select: { comments: true } },
  },
});
```

#### Following Feed（追蹤用戶的貼文）
```typescript
// 1. 取得正在追蹤的用戶 ID
const following = await prisma.follow.findMany({
  where: { followerId: currentUser.id },
  select: { followingId: true },
});
const followingIds = following.map(f => f.followingId);

// 2. 取得追蹤用戶的原創貼文
const posts = await prisma.post.findMany({
  where: {
    authorId: { in: followingIds },
    parentId: null,
  },
});

// 3. 取得追蹤用戶的轉發
const reposts = await prisma.repost.findMany({
  where: { userId: { in: followingIds } },
  include: { post: { include: { author: true } } },
});

// 4. 合併並去重，按時間排序
const combined = [...posts, ...reposts.map(r => r.post)]
  .filter((post, index, self) => self.findIndex(p => p.id === post.id) === index)
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

#### User Profile Posts（用戶貼文 + 轉發）
```typescript
// 1. 用戶的原創貼文
const userPosts = await prisma.post.findMany({
  where: { authorId: userId, parentId: null },
});

// 2. 用戶轉發的貼文
const userReposts = await prisma.repost.findMany({
  where: { userId },
  include: { post: { include: { author: true } } },
});

// 3. 合併（不去重，可顯示轉發自己的貼文）
const combined = [...userPosts, ...userReposts.map(r => r.post)]
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

### 3. 遞迴留言結構
- `parentId = null`: 頂層貼文
- `parentId` 存在: 留言
- 留言可以有留言（無限層級）
- 點擊留言導向該留言的詳情頁（`/post/[id]`），顯示該留言的所有子留言

### 4. 認證流程

#### 首次註冊流程
1. OAuth 或 Email 註冊
2. 檢查是否已設定 `userId`（`LayoutWrapper.tsx`）
3. 若未設定，強制導向 `/setup-username`
4. 設定 `userId`（3-15 字元，小寫英數字底線，唯一）
5. 完成後導回原頁面

#### userId 驗證規則
```typescript
export const USER_ID_REGEX = /^[a-z0-9_]{3,15}$/;
```

#### 自動登出機制（`LayoutWrapper.tsx`）
```typescript
const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 分鐘

// 監聽用戶活動
events = ["click", "keydown", "mousemove", "scroll", "touchstart"];

// 無活動則自動登出
if (inactiveTime > IDLE_TIMEOUT) {
  signOut({ callbackUrl: "/" });
}
```

### 5. 時間格式化（`timeFormat.ts`）
```typescript
// < 60s: "45s"
// < 60m: "23m"
// < 24h: "5h"
// < 30d: "7d"
// >= 30d: "Jan 15" or "Jan 15, 2024"（跨年顯示年份）
```

---

## 環境變數配置

### 必要環境變數（`.env`）
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# GitHub OAuth
GITHUB_CLIENT_ID=<from GitHub Developer Settings>
GITHUB_CLIENT_SECRET=<from GitHub Developer Settings>

# Pusher
PUSHER_APP_ID=<from Pusher Dashboard>
PUSHER_SECRET=<from Pusher Dashboard>
NEXT_PUBLIC_PUSHER_KEY=<from Pusher Dashboard>
NEXT_PUBLIC_PUSHER_CLUSTER=<from Pusher Dashboard>
```

### OAuth Callback URLs
- **Google**: `{NEXTAUTH_URL}/api/auth/callback/google`
- **GitHub**: `{NEXTAUTH_URL}/api/auth/callback/github`

---

## 重要設計模式

### 1. NextAuth 配置（`lib/auth.ts`）
```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },  // Database Session（安全）
  providers: [
    GoogleProvider({ allowDangerousEmailAccountLinking: true }),
    GithubProvider({ allowDangerousEmailAccountLinking: true }),
    CredentialsProvider({ ... }),  // Email + Password
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // 注入 userId 到 session
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { userId: true },
      });
      return {
        ...session,
        user: { ...session.user, userId: dbUser?.userId, id: user.id },
      };
    },
  },
};
```

### 2. Prisma Client 單例（`lib/prisma.ts`）
```typescript
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 3. 非正規化計數欄位
- `User.postsCount`, `User.followersCount`, `User.followingCount`
- **優點**: 避免每次查詢都 `COUNT(*)`，提升效能
- **缺點**: 需在 API 中手動維護一致性
- **維護時機**:
  - 建立貼文 → `postsCount++`
  - 刪除貼文 → `postsCount--`
  - 追蹤用戶 → `followersCount++`, `followingCount++`
  - 取消追蹤 → `followersCount--`, `followingCount--`

### 4. 客戶端狀態管理（`Post.tsx`）
```typescript
const [liked, setLiked] = useState(initialLiked);
const [likeCount, setLikeCount] = useState(initialLikeCount);

// Optimistic Update
const handleLike = async () => {
  setLiked(!liked);
  setLikeCount(liked ? likeCount - 1 : likeCount + 1);

  const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
  const data = await res.json();

  // 如果失敗，rollback
  if (!res.ok) {
    setLiked(liked);
    setLikeCount(initialLikeCount);
  }
};

// Pusher 即時更新（其他用戶的按讚）
useEffect(() => {
  const channel = pusher.subscribe(`post-${post.id}`);
  channel.bind("like-update", (data) => {
    if (data.userId !== currentUser.id) {
      setLikeCount(data.likeCount);
    }
  });
}, []);
```

---

## 開發與部署指令

### 本地開發
```bash
cd web
npm install
cp .env.example .env  # 填入實際環境變數

# 資料庫初始化
npx prisma migrate dev
npx prisma generate

# 啟動開發伺服器
npm run dev  # http://localhost:3000

# 開啟資料庫管理介面
npx prisma studio  # http://localhost:5555
```

### 生產建置
```bash
npm run build
npm run start
```

### Vercel 部署
1. 推送到 GitHub
2. Vercel 導入專案，Root Directory 設為 `web`
3. 配置所有環境變數
4. 自動部署

---

## 功能清單

### 已實現功能
- ✅ Google / GitHub / Email 多重登入
- ✅ Email 驗證碼註冊
- ✅ 自訂 @userId
- ✅ 發布貼文（280 字元限制）
- ✅ 留言（遞迴結構）
- ✅ 按讚/轉發（Toggle）
- ✅ 追蹤/取消追蹤
- ✅ All Feed / Following Feed
- ✅ 個人頁面（Posts / Likes）
- ✅ 編輯個人資料（名稱、簡介、頭像、封面）
- ✅ 即時更新（Pusher）
- ✅ 草稿儲存
- ✅ 自動登出（3 分鐘無活動）
- ✅ 記住登入帳號

### 潛在改進
- [ ] 圖片/影片上傳
- [ ] 通知系統
- [ ] 搜尋功能（用戶、貼文、Hashtag）
- [ ] Hashtag 頁面
- [ ] 趨勢/熱門話題
- [ ] 私訊功能
- [ ] 書籤/收藏
- [ ] 長文支援（超過 280 字元）

---

## 修改指南

### 修改現有功能
1. **找到對應的 API Route**（`src/app/api/`）
2. **修改業務邏輯**（Prisma 查詢）
3. **更新前端組件**（`src/components/`）
4. **如需即時更新，加入 Pusher 事件**

### 新增功能
1. **設計資料模型**（`prisma/schema.prisma`）
2. **建立 Migration**（`npx prisma migrate dev --name feature_name`）
3. **建立 API Route**（`src/app/api/feature/route.ts`）
4. **建立前端組件**（`src/components/Feature.tsx`）
5. **整合到現有頁面**（`src/app/page.tsx` 等）

### 資料庫修改
```bash
# 1. 修改 schema.prisma
# 2. 建立 Migration
npx prisma migrate dev --name your_migration_name

# 3. 重新生成 Prisma Client
npx prisma generate

# 4. 檢視資料庫（optional）
npx prisma studio
```

### 除錯技巧
1. **API 錯誤**: 檢查 Network Tab，查看 Response
2. **資料庫錯誤**: 檢查 Prisma 查詢語法，使用 `prisma studio` 驗證資料
3. **認證錯誤**: 檢查 NextAuth 配置，查看 Session
4. **即時更新失效**: 檢查 Pusher Dashboard，確認事件是否觸發

---

## 常見問題

### Q: 為什麼有些用戶沒有 `userId`？
A: OAuth 首次登入時不會要求設定 `userId`，需在 `LayoutWrapper.tsx` 檢查並導向 `/setup-username`。

### Q: 為什麼按讚後沒有即時更新？
A: 檢查 Pusher 配置是否正確，確認 API Route 中有呼叫 `triggerPusherEvent`。

### Q: 為什麼 Following Feed 沒有顯示轉發的貼文？
A: 檢查 `/api/posts` 的邏輯，確認有查詢 `Repost` 並合併到結果中。

### Q: 如何重置資料庫？
A: `npx prisma migrate reset`（會刪除所有資料）

### Q: 如何新增 OAuth Provider（如 Twitter）？
A:
1. 安裝 `next-auth` Provider（如 `TwitterProvider`）
2. 在 `lib/auth.ts` 加入 Provider
3. 設定環境變數（`TWITTER_CLIENT_ID` 等）
4. 更新登入頁面 UI

---

## 關鍵檔案路徑速查

| 功能 | 檔案路徑 |
|------|---------|
| NextAuth 配置 | `web/src/lib/auth.ts` |
| Prisma Client | `web/src/lib/prisma.ts` |
| Pusher Server | `web/src/lib/pusher.ts` |
| Pusher Client | `web/src/lib/pusher-client.ts` |
| 資料庫 Schema | `web/prisma/schema.prisma` |
| 登入頁面 | `web/src/app/page.tsx` |
| 首頁動態 | `web/src/app/home/page.tsx` |
| 個人頁面 | `web/src/app/profile/page.tsx` |
| 貼文詳情頁 | `web/src/app/post/[id]/page.tsx` |
| 設定 userId | `web/src/app/setup-username/page.tsx` |
| 發文彈窗 | `web/src/components/PostModal.tsx` |
| 貼文組件 | `web/src/components/Post.tsx` |
| 側邊欄 | `web/src/components/Sidebar.tsx` |
| 自動登出 | `web/src/components/LayoutWrapper.tsx` |
| 貼文 API | `web/src/app/api/posts/route.ts` |
| 按讚 API | `web/src/app/api/posts/[id]/like/route.ts` |
| 追蹤 API | `web/src/app/api/users/[userId]/follow/route.ts` |

---

## 版本歷史

- **2025-11-05**: 初始化專案
- **2025-11-09**: 新增封面圖功能
- **2026-02-27**: 新增 Email 註冊、密碼、生日欄位
- **2026-02-28**: 新增最後登入方式記錄

---

**最後更新**: 2026-03-02
