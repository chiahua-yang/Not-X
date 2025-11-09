# X-Clone å°ˆæ¡ˆå•Ÿå‹•æŒ‡å—

é€™æ˜¯ä¸€å€‹æ¨¡ä»¿ Twitter/X æ ¸å¿ƒåŠŸèƒ½çš„ä½œæ¥­å°ˆæ¡ˆï¼Œå®Œæ•´ç¨‹å¼ä½æ–¼ web/ ç›®éŒ„ã€‚å°ˆæ¡ˆä½¿ç”¨ Next.js App Routerã€NextAuthã€Prisma èˆ‡ PostgreSQLï¼Œä¸¦å¯¦ä½œ OAuth ç™»å…¥ã€ä½¿ç”¨è€… @userID è¨­å®šã€è²¼æ–‡/ç•™è¨€/æŒ‰è®š/è½‰ç™¼ç­‰åŠŸèƒ½ã€‚

## ç›®éŒ„çµæ§‹

`
hw5/
â”œâ”€â”€ README.md               # æœ¬æ–‡ä»¶
â”œâ”€â”€ .gitignore              # Git å¿½ç•¥è¦å‰‡
â”œâ”€â”€ image/                  # ä½œæ¥­æä¾›çš„ UI åƒè€ƒåœ– (å·²åŠ å…¥ .gitignore)
â”œâ”€â”€ guideline.txt           # ä½œæ¥­èªªæ˜Žæª”æ¡ˆ (å·²åŠ å…¥ .gitignore)
â””â”€â”€ web/                    # Next.js + Prisma + NextAuth åŽŸå§‹ç¢¼
`

## æŠ€è¡“å †ç–Š

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- NextAuthï¼ˆGoogle / GitHub / Facebook OAuthï¼‰
- Prisma ORM + PostgreSQL
- RESTful APIï¼ˆè²¼æ–‡ã€ç•™è¨€ã€æ„›å¿ƒã€è½‰ç™¼ã€è¿½è¹¤ã€è‰ç¨¿ï¼‰
- è¦åŠƒæ•´åˆ Pusher é€²è¡Œå³æ™‚åŒæ­¥

## äº‹å‰æº–å‚™

1. Node.js 20 ä»¥ä¸Šç‰ˆæœ¬ï¼ˆå»ºè­°æ­é… npmï¼‰
2. PostgreSQL 14 ä»¥ä¸Šï¼Œæˆ–å¯é€£ç·šçš„é›²ç«¯è³‡æ–™åº«
3. Google / GitHub / Facebook OAuth æ†‘è­‰å„ä¸€çµ„

## å»ºç«‹ç’°å¢ƒè®Šæ•¸

åœ¨ web/.env å»ºç«‹ä»¥ä¸‹å…§å®¹ï¼ˆè«‹å‹¿æäº¤è‡³ Gitï¼‰ï¼š

`
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=è«‹è‡ªè¡Œç”¢ç”Ÿçš„å®‰å…¨éš¨æ©Ÿå­—ä¸²

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
`

- ç”¢ç”Ÿ NEXTAUTH_SECRETï¼š
  `ash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  `
- DATABASE_URL è«‹æ›¿æ›ç‚ºå¯¦éš›çš„ PostgreSQL é€£ç·šå­—ä¸²ã€‚

### OAuth å›žå‘¼ç¶²å€ (æœ¬æ©Ÿé–‹ç™¼)

| Provider | è¨­å®šå…¥å£ | Callback URL |
|----------|----------|--------------|
| Google   | Google Cloud Console â†’ Credentials | http://localhost:3000/api/auth/callback/google |
| GitHub   | GitHub â†’ Settings â†’ Developer settings â†’ OAuth Apps | http://localhost:3000/api/auth/callback/github |
| Facebook | Meta for Developers â†’ Products â†’ Facebook Login â†’ Settings | http://localhost:3000/api/auth/callback/facebook |

éƒ¨ç½²æ­£å¼ç’°å¢ƒæ™‚ï¼Œè«‹æ”¹ç”¨å¯¦éš›ç¶²åŸŸä¸¦åŒæ­¥æ›´æ–° OAuth è¨­å®šã€‚

## å®‰è£èˆ‡å•Ÿå‹•

`ash
cd web
npm install                # å®‰è£ç›¸ä¾å¥—ä»¶

npx prisma migrate dev     # å¥—ç”¨ Prisma schemaï¼Œå»ºç«‹è³‡æ–™è¡¨
# npx prisma generate      # å¦‚éœ€æ‰‹å‹•é‡æ–°ç”¢ç”Ÿ Prisma Client

npm run dev                # å•Ÿå‹• Next.js é–‹ç™¼ä¼ºæœå™¨
`

ç€è¦½ http://localhost:3000ï¼š
- æœªç™»å…¥ â†’ é¡¯ç¤ºç™»å…¥å‰ Landing Pageï¼Œå¯é¸æ“‡ OAuth Providerã€‚
- å·²ç™»å…¥ â†’ æœƒè‡ªå‹•å°Žå‘ /home ä¸¦é¡¯ç¤ºå« Sidebar çš„ä¸»ç•«é¢ã€‚

## æ ¸å¿ƒåŠŸèƒ½æ‘˜è¦

- **ç™»å…¥æµç¨‹**ï¼šç™»å‡º/æœªç™»å…¥æ™‚é€²å…¥ Landing Pageï¼Œä½¿ç”¨ Google/GitHub/Facebook OAuthã€‚ç™»å…¥å¾Œè‹¥å°šæœªè¨­å®š @userIDï¼Œæœƒè¢«å°Žå‘ setup-usernameã€‚
- **ä½¿ç”¨è€…ä»£è™Ÿé©—è­‰**ï¼š@userID åƒ…å…è¨± 3â€“15 å€‹å°å¯«å­—æ¯æˆ–åº•ç·šï¼Œè¼¸å…¥æ™‚å³æ™‚æª¢æŸ¥æ ¼å¼èˆ‡æ˜¯å¦è¢«å ç”¨ï¼Œä¸¦æä¾›æŽ¨è–¦é¸é …ã€‚
- **é¦–é  (Home)**ï¼šå…· All / Following ç¯©é¸ã€è²¼æ–‡æ™‚é–“æŽ’åºã€ç•™è¨€/æŒ‰è®š/è½‰ç™¼/åˆªé™¤ã€è‡ªå‹•å±•é–‹ç•™è¨€ã€æ”¯æ´éžè¿´è·¯ç”±é€²å…¥å–®ç¯‡è²¼æ–‡æˆ–ç•™è¨€ä¸²ã€‚
- **ç™¼æ–‡ (Post)**ï¼šModal èˆ‡ inline composerï¼Œéµå®ˆ 280 å­—ä¸Šé™ï¼›ç¶²å€è¨ˆç®— 23 å­—å…ƒï¼›Hashtag/Mention ä¸è¨ˆå­—æ•¸ï¼›å¯å„²å­˜ Draftã€‚
- **å€‹äººé  (Profile)**ï¼šå€åˆ†è‡ªå·±èˆ‡ä»–äººè¦–åœ–ï¼ŒåŒ…å« Follow / Followingã€è²¼æ–‡/å–œæ­¡æ¸…å–®ã€ç·¨è¼¯å€‹äººè³‡æ–™ Modalã€‚
- **è‡ªå‹•ç™»å‡º**ï¼šä½¿ç”¨è€… 30 åˆ†é˜å…§ç„¡æ“ä½œï¼ˆå¯æ–¼ LayoutWrapper.tsx èª¿æ•´ IDLE_TIMEOUTï¼‰å¾Œï¼Œä¸‹æ¬¡äº’å‹•æœƒè‡ªå‹•ç™»å‡ºä¸¦å›žåˆ°ç™»å…¥é ã€‚

## å¸¸ç”¨æŒ‡ä»¤ (æ–¼ web/ ç›®éŒ„)

- 
pm run devï¼šé–‹ç™¼æ¨¡å¼
- 
pm run buildï¼šå»ºç½®æ­£å¼ç‰ˆ
- 
pm run startï¼šå•Ÿå‹•æ­£å¼ä¼ºæœå™¨
- 
pm run lintï¼šåŸ·è¡Œ ESLint
- 
px prisma migrate devï¼šå¥—ç”¨è³‡æ–™åº«é·ç§»
- 
px prisma studioï¼šå•Ÿå‹• Prisma Studio ç®¡ç†è³‡æ–™ï¼ˆå¯é¸ï¼‰

## ç–‘é›£æŽ’è§£

- **OAuth callback éŒ¯èª¤**ï¼šç¢ºèª Provider è¨­å®šçš„ Redirect URI èˆ‡ .env å®Œå…¨ä¸€è‡´ã€‚
- **Prisma P1000 èªè­‰å¤±æ•—**ï¼šç¢ºèª DATABASE_URL å¸³å¯†èˆ‡è³‡æ–™åº«æœå‹™å•Ÿå‹•ç‹€æ…‹ã€‚
- **ç™»å…¥ç‹€æ…‹æ··äº‚**ï¼šå¯ä»¥åœ¨ç¶²é ä¸­é»žé¸ Sign outï¼Œæˆ–æ¸…é™¤ç€è¦½å™¨ Cookieï¼›NextAuth é è¨­ Session æœ‰æ•ˆæœŸ 30 å¤©ã€‚

## å¾…å®Œæˆé …ç›®

- æ’°å¯«ç«¯å°ç«¯/å…ƒä»¶æ¸¬è©¦ (Playwright / Testing Library)
- ä¸²æŽ¥ Pusher é€²è¡Œå³æ™‚æ›´æ–°
- ä¾ç…§ä½œæ¥­é™„ä»¶èª¿æ•´ UI ç´°ç¯€ã€RWD èˆ‡ç„¡éšœç¤™
- åŠ å…¥ç¨®å­è³‡æ–™èˆ‡æ¸¬è©¦å·¥å…·è…³æœ¬

---

è‹¥è¦åœ¨å…¶ä»–æ©Ÿå™¨æˆ–éƒ¨ç½²ç’°å¢ƒåŸ·è¡Œï¼Œè«‹è¤‡è£½ .env ä¸¦ç¢ºèªè³‡æ–™åº«å¯å°å¤–é€£ç·šï¼›åˆ‡å‹¿å°‡æ•æ„Ÿç’°å¢ƒè®Šæ•¸æäº¤è‡³ç‰ˆæœ¬æŽ§åˆ¶ã€‚ç¥é–‹ç™¼é †åˆ©ï¼
