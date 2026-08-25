# Codexa Online Release Guide: Deployments & GitHub Releases

This guide provides step-by-step instructions for deploying the online version of **Codexa** and managing GitHub releases.

---

## 🌐 Online Deployment Architecture

The online version of Codexa is structured for cloud deployment:
- **Frontend**: Next.js 14 hosted on **Vercel** / **Netlify** / **Render**.
- **Backend**: NestJS 10 API hosted on **Render** / **Railway** / **AWS**.
- **Database**: PostgreSQL hosted on **Render PostgreSQL** / **Neon** / **Supabase**.

---

## 🛠️ Step 1: Local Environment Setup

Follow these steps to run the online codebase locally:

```bash
# 1. Clone the repository
git clone https://github.com/lioneladom/codexa_online.git
cd codexa_new

# 2. Install backend dependencies
cd backend
npm install
npx prisma generate

# 3. Install frontend dependencies
cd ../frontend
npm install
```

---

## 🚀 Step 2: GitHub Releases Instructions

Since Git repositories strictly limit file sizes (100 MB max), any compiled binary installers (`.exe`, `.AppImage`, `.deb`) or exported deployment archives should be published under **GitHub Releases**.

### How to Create a Release on GitHub:

1. Go to your GitHub repository: `https://github.com/lioneladom/codexa_online`
2. Click **Releases** on the right sidebar.
3. Click **Draft a new release**.
4. Enter the release version tag (e.g. `v1.0.0`) and title (e.g. `Codexa Online v1.0.0`).
5. Drag and drop any downloadable release packages into the **Attach binaries** drop area.
6. Click **Publish release**.
