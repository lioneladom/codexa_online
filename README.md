# Codexa - Secure Programming Examination Platform

## Overview

Codexa is an enterprise-grade secure programming examination platform designed for universities and colleges. It provides a modern, secure, automated, and offline-capable system to replace paper-based programming exams.

## Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Monaco Editor
- Framer Motion

### Backend
- NestJS 10
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis
- Socket.IO
- JWT Authentication
- RBAC (Role-Based Access Control)

### Execution Sandbox
- Subprocess-based execution (Version 1)
- Docker Containers (planned for later versions)

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd codexa
```

2. Start the development environment (PostgreSQL & Redis):
```bash
docker-compose up -d
```

3. Install dependencies:
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Frontend
cd ../frontend
npm install
```

4. Start the services:
```bash
# Backend (in backend directory)
npm run start:dev

# Frontend (in frontend directory)
npm run dev
```

## Project Structure

```
codexa/
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── test/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── docker-compose.yml
```

## Users & Roles

- **Lecturer**: Create, edit, review, publish exams, monitor students, view reports, export results
- **Student**: Join exam sessions, take exams, write code, run code, submit answers, view results
- **Invigilator**: Access monitoring dashboard, view live student activity, track warnings
- **Admin**: Manage institutions, manage lecturers, manage users, configure deployment settings

## Features

- Exam Creation & Management
- Secure Exam Delivery
- Real-time Monitoring & Invigilation
- Automated Grading
- AST-based Code Analysis
- Activity Logging
- Anti-cheating System
- Offline/LAN Deployment
- Exportable Reports (Excel, HTML)
- Dark/Light Mode

## License

UNLICENSED
