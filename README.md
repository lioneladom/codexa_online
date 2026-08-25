# 🚀 Codexa Online - Secure Programming Examination Platform

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Cloud-orange.svg)](README.md)
[![License](https://img.shields.io/badge/License-UNLICENSED-red.svg)](README.md)

## Overview

**Codexa Online** is the cloud-hosted online web version of the Codexa Programming Examination Platform. It allows lecturers to manage exams, monitor live student sessions remotely, and view automated grading reports via any modern browser.

---

## 💻 Cross-Platform Step-by-Step Setup Guide

Codexa Online can be developed and run on **Windows**, **Linux**, and **macOS**.

---

### 🪟 Windows Setup Guide

#### 1. Prerequisites (Windows)
- **Node.js**: Download and install [Node.js 18 LTS or 20 LTS](https://nodejs.org/).
- **Git**: Download and install [Git for Windows](https://git-scm.com/download/win).

#### 2. Installation & Running
1. Open **Command Prompt** or **PowerShell**:
   ```cmd
   git clone https://github.com/lioneladom/codexa_online.git
   cd codexa_new
   ```
2. Setup Backend:
   ```cmd
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ```
3. Setup Frontend (in a new terminal window):
   ```cmd
   cd frontend
   npm install
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.

---

### 2. 🐧 Linux Setup Guide (Ubuntu / Debian / Fedora / Arch)

#### 1. Prerequisites (Linux)
```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y nodejs npm git python3 build-essential

# Fedora
sudo dnf install -y nodejs npm git python3 gcc-c++
```

#### 2. Installation & Running
1. Clone the repository:
   ```bash
   git clone https://github.com/lioneladom/codexa_online.git
   cd codexa_new
   ```
2. Start Backend:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ```
3. Start Frontend (in a new terminal window):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Access the web app at `http://localhost:3000`.

---

### 3. 🍎 macOS Setup Guide (Intel & Apple Silicon M1/M2/M3)

#### 1. Prerequisites (macOS)
```bash
brew install node git python3
```

#### 2. Installation & Running
1. Open Terminal:
   ```bash
   git clone https://github.com/lioneladom/codexa_online.git
   cd codexa_new
   ```
2. Start Backend:
   ```bash
   cd backend && npm install && npx prisma generate && npm run start:dev
   ```
3. Start Frontend (in another terminal tab):
   ```bash
   cd frontend && npm install && npm run dev
   ```
4. Open `http://localhost:3000` in Safari or Chrome.

---

## 📄 Release Guide

For step-by-step instructions on attaching release files and deployment assets on GitHub, check out:
📄 **[Read the Full Release Guide (RELEASE_GUIDE.md)](RELEASE_GUIDE.md)**

---

## 🏗️ Project Structure

```
codexa_new/
├── backend/            # NestJS REST & WebSocket API Server
│   ├── src/            # Auth, Exams, Monitoring, Reports
│   └── prisma/         # PostgreSQL schema & database migrations
└── frontend/           # Next.js 14 Web Application
    └── src/app/        # Entrance page, login, lecturer dashboard
```

---

## 📄 License

UNLICENSED - All rights reserved.
