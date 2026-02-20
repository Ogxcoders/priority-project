# 🚀 Priority Commander

A gamified task management app that turns your to-do list into an RPG quest system. Built with Next.js, Appwrite, and Redis.

## Features

- 🎮 **Gamified Tasks** — Quests, XP, levels, and rewards
- 📋 **Project Management** — Organize quests into campaigns
- 🗺️ **Strategic Map** — Calendar view with daily time slots
- 👤 **Commander Profile** — Track stats, streaks, and achievements
- 🔐 **Google OAuth** — Secure one-click authentication
- 🎨 **Dual Themes** — Dark military & Eduplex light mode
- 📱 **Responsive** — Mobile-first with desktop sidebar

## Quick Start (Development)

```bash
npm install
cp .env.example .env.local   # Edit with your Appwrite config
npm run dev
```

## Production Deployment (Docker)

Everything is configured in `docker-compose.yml` — just edit the top section:

```yaml
APP_DOMAIN:        "your-domain.com"       # ✏️ Your domain
SSL_EMAIL:         "you@email.com"         # ✏️ For SSL cert
APPWRITE_ENDPOINT: "https://..."           # ✏️ Appwrite API
APPWRITE_PROJECT:  "your-project-id"       # ✏️ Project ID
REDIS_PASSWORD:    "strong-password"       # ✏️ Cache password
ALLOWED_ORIGINS:   "https://your-domain"   # ✏️ CORS whitelist
```

Then deploy:

```bash
docker compose up -d --build
```

**Includes:**
- ⚡ Auto SSL via Caddy (Let's Encrypt)
- 🗄️ Redis caching with LRU eviction
- 🔒 Security headers, rate limiting, CORS
- 🩺 Health checks & auto-restart
- 📦 Optimized multi-stage Docker build (~150MB)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, CSS |
| Backend | Appwrite (BaaS) |
| Auth | Google OAuth via Appwrite |
| Cache | Redis 7 + LRU |
| Proxy | Caddy 2 (auto-SSL) |
| Deployment | Docker Compose |

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | Appwrite database ID |
| `REDIS_URL` | Redis connection string |
| `REDIS_PASSWORD` | Redis auth password |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |

## License

MIT
