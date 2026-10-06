# CloudBox Frontend

A modern, production-grade cloud file storage web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**, interfacing seamlessly with the **CloudBox Go/Gin REST API**.

---

## 🚀 Features

- **Authentication & Security**
  - JWT Bearer authentication with automatic axios interceptor injection
  - Session validation via `/api/auth/me` on boot
  - Form validation with **React Hook Form** + **Zod**
  - Protected routes with graceful redirects via `AppShell`

- **Dashboard & Analytics**
  - Storage breakdown visualizer (Documents, Images, Media, Archives, Others)
  - Real-time file count, storage quota calculation, and activity metrics
  - Quick action upload modal

- **Files Explorer**
  - Live client-side search across filenames
  - Category filters: All, Documents, Images, Media, Archives, Others
  - Sorting: Name (A-Z, Z-A), File Size (Asc, Desc), Date Created (Newest, Oldest)
  - Multi-view: Responsive **Table View** and **Card Grid View**
  - File details drawer / preview modal with object storage key inspection
  - Direct file download and deletion with confirmation dialogs

- **Upload Center**
  - Interactive drag-and-drop zone with animated feedback
  - Multi-file queue with sequential streaming
  - Individual upload progress, file category detection, and error diagnostics

- **System & Settings**
  - Real-time health check ping to `/health`
  - Microservices infrastructure inspection (Go REST API, MinIO S3 Object Store, PostgreSQL 16, Redis Cache)
  - Profile summary and session management

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components**: Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, etc.)
- **Server State**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the `frontend` root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```
