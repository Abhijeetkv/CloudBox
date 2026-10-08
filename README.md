# CloudBox - Production-Grade Cloud File Storage Platform

CloudBox is a high-performance, Google Drive-style cloud file storage platform engineered for backend reliability and developer clarity. It features an idiomatic Go (Gin) REST API, PostgreSQL relational metadata storage, Redis cache-aside caching and sliding-window rate limiting, MinIO S3-compatible object storage, and a modern Next.js 16 (TypeScript) client interface.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Tech Stack and Engineering Rationale](#tech-stack-and-engineering-rationale)
3. [Database Schema](#database-schema)
4. [Core Architectural Flows](#core-architectural-flows)
   - [Direct-to-S3 Presigned Uploads](#1-direct-to-s3-presigned-uploads)
   - [Secure File Streaming and Presigned Downloads](#2-secure-file-streaming-and-presigned-downloads)
   - [Circular Folder Hierarchy Guard](#3-circular-folder-hierarchy-guard)
   - [Temporary Public Shares](#4-temporary-public-shares)
   - [Redis Cache-Aside and Rate Limiting](#5-redis-cache-aside-and-rate-limiting)
   - [Goroutine Asynchronous Worker Pool](#6-goroutine-asynchronous-worker-pool)
   - [Client-Side Viewport and Component Scrolling Architecture](#7-client-side-viewport-and-component-scrolling-architecture)
5. [Project Structure](#project-structure)
6. [REST API Reference](#rest-api-reference)
7. [Getting Started and Local Setup](#getting-started-and-local-setup)
8. [Testing and Verification](#testing-and-verification)
9. [Key Backend Interview and Architecture Highlights](#key-backend-interview-and-architecture-highlights)

---

## System Architecture

```mermaid
graph TD
    User["Web Browser / Client (Next.js)"]
    
    subgraph Gateway ["Go + Gin Application Engine (:8080)"]
        Router["Gin HTTP Router"]
        AuthMW["JWT Auth Middleware"]
        RateMW["Redis Rate Limiter (HTTP 429)"]
        LoggerMW["Zap Structured Logger"]
        
        Handlers["HTTP Handlers (Auth, Files, Folders, Shares, Storage)"]
        Services["Domain Services (FileService, FolderService, ShareService)"]
        WorkerPool["Goroutine Worker Pool (Async Tasks)"]
    end
    
    subgraph DataPlane ["Persistence & Object Store"]
        Postgres[("PostgreSQL\nMetadata, Quotas, Folders")]
        Redis[("Redis\nCache & Rate Limits")]
        MinIO["MinIO / S3 Object Store\nFile Binaries"]
    end

    User -->|"1. API Requests"| Router
    Router --> LoggerMW --> RateMW --> AuthMW --> Handlers
    Handlers --> Services
    
    Services -->|"Metadata / Queries"| Postgres
    Services -->|"Cache Read/Write"| Redis
    Services -->|"Presigned PUT/GET URLs"| MinIO
    Services -->|"Enqueue Processing"| WorkerPool
    
    User -.->|"2. Direct Binary PUT (Presigned URL)"| MinIO
    User -.->|"3. Direct Binary GET (Presigned URL)"| MinIO
```

---

## Tech Stack and Engineering Rationale

| Layer | Component | Choice | Engineering Rationale |
|---|---|---|---|
| API Framework | Backend Core | Go (Golang) + Gin | Fast execution speed, low memory footprint, compiled static binary, and native concurrency primitives (goroutines and channels). |
| Relational DB | Metadata and Structure | PostgreSQL (GORM) | ACID compliance, transactional integrity for cascading operations, foreign keys, and compound indexes on `(user_id, folder_id)`. |
| Object Storage | Binary Storage | MinIO (AWS S3 Compatible) | Keeps binary payloads out of relational tables and web application memory. Supports standard AWS S3 SDK integration. |
| In-Memory Cache | Cache and Rate Limiting | Redis | Sub-millisecond latency for metadata cache-aside lookups and atomic sliding-window rate limiting. |
| Background Processing | Async Tasks | Go Worker Pool | Buffered channels and worker goroutines handle non-blocking asynchronous jobs (metadata enrichment, audits, cache operations). |
| Frontend | User Interface | Next.js 16 + React 19 + Tailwind CSS | App Router architecture, responsive Google Drive-style drive interface, fixed viewport shell, and independently scrollable component sections. |
| Logging | Observability | Uber Zap | Zero-allocation structured JSON logging for high-throughput production request tracing. |

---

## Database Schema

PostgreSQL stores file and folder metadata, user credentials, and sharing permissions. Binary payloads are stored in MinIO/S3.

```mermaid
erDiagram
    USERS ||--o{ FOLDERS : owns
    USERS ||--o{ FILES : owns
    USERS ||--o{ SHARES : creates
    FOLDERS ||--o{ FOLDERS : "parent_id (nested)"
    FOLDERS ||--o{ FILES : contains
    FILES ||--o{ SHARES : "shared_via"

    USERS {
        bigint id PK
        string email UK "Indexed"
        string password_hash
        timestamp created_at
        timestamp updated_at
    }

    FOLDERS {
        bigint id PK
        bigint user_id FK "Indexed"
        bigint parent_id FK "Indexed (Nullable for root)"
        string name
        timestamp created_at
        timestamp updated_at
    }

    FILES {
        bigint id PK
        bigint user_id FK "Indexed"
        bigint folder_id FK "Indexed (Nullable for root)"
        string filename
        string storage_key UK "users/{uid}/files/{id}/{name}"
        bigint size "Bytes"
        string mime_type
        timestamp created_at
        timestamp updated_at
    }

    SHARES {
        bigint id PK
        bigint file_id FK "Indexed"
        bigint user_id FK "Indexed"
        string token UK "48-char hex (Indexed)"
        timestamp expires_at "Nullable (Never expires)"
        timestamp created_at
    }
```

---

## Core Architectural Flows

### 1. Direct-to-S3 Presigned Uploads
To prevent multi-gigabyte uploads from saturating Go API memory and network bandwidth:
1. **Request Upload URL:** Client calls `POST /api/files/upload-url` with `{ filename, mime_type, size, folder_id }`.
2. **Quota Check:** The server verifies that `current_storage + size <= 50 GB`. If exceeded, it rejects the request with `400 STORAGE_LIMIT_EXCEEDED`.
3. **Generate Presigned URL:** The server generates an S3 `PUT` presigned URL with a 15-minute expiration and returns `{ upload_url, storage_key }`.
4. **Direct Client Upload:** The client uploads the binary directly to MinIO/S3 via `PUT <upload_url>`.
5. **Confirm Upload:** The client confirms the upload via `POST /api/files/confirm-upload`. Metadata is written to PostgreSQL, Redis cache is invalidated, and background asynchronous tasks are queued.

### 2. Secure File Streaming and Presigned Downloads
Files are never exposed through public S3 buckets:
- **Authenticated Direct Stream:** `GET /api/files/:id/download` verifies user ownership and streams file bytes with `Content-Disposition: attachment`.
- **Presigned Download URL:** `GET /api/files/:id/download-url` generates a short-lived S3 `GET` presigned URL (15-minute TTL) for direct client retrieval from object storage.

### 3. Circular Folder Hierarchy Guard
To prevent circular references (such as moving `/A` into `/A/B/C`, which causes infinite loops or orphaned hierarchy branches):
- `FolderService.Update` traverses the folder tree using BFS/DFS.
- If the new parent ID is equal to the target folder ID or is a descendant of the target folder, the API rejects the request with `409 Conflict: cannot move a folder into its own subfolder`.

### 4. Temporary Public Shares
- Users can create a shareable link with an optional expiration window (`1h`, `24h`, `7d`, or indefinite).
- A cryptographically secure 48-character token is generated using Go's `crypto/rand`.
- Unauthenticated recipients access `/shared/:token`. The server validates the expiration timestamp, retrieves metadata, and generates a short-lived presigned download link.

### 5. Redis Cache-Aside and Rate Limiting
- **Cache-Aside Pattern:** Single file lookups (`GET /api/files/:id`) query Redis first. On cache miss, GORM fetches from PostgreSQL and populates Redis with a 10-minute TTL.
- **Cache Invalidation:** Any update or delete operation (`PATCH`, `DELETE`, folder move) purges `cache:file:{id}`.
- **Sliding-Window Rate Limiting:** Global rate limiting middleware uses Redis atomic pipelines (100 requests per minute per IP). Excessive requests receive `429 Too Many Requests`.

### 6. Goroutine Asynchronous Worker Pool
- Background tasks (audit logging, post-upload processing) are submitted to a buffered channel queue.
- A fixed pool of 3 worker goroutines processes items concurrently without blocking main HTTP request threads.

### 7. Client-Side Viewport and Component Scrolling Architecture
- **Root Screen Constraint:** The application shell enforces an `h-screen` (`100vh`/`100dvh`) viewport height with `overflow-hidden` on the outer body and window container.
- **Independent Component Scrolling:**
  - Sidebar: Pinned header and quota card with a scrollable navigation section (`overflow-y-auto`).
  - Dashboard: Fixed metrics grid with an independently scrollable Recent Files table (`max-h-[460px] overflow-auto` and sticky header).
  - File Explorer: Dedicated scrollable container for table and grid views (`max-h-[calc(100vh-270px)]` and sticky header).
  - Folder Grid: Scrollable folder row (`max-h-48 overflow-y-auto`).
  - Upload Center: Scrollable upload queue list (`max-h-[360px] overflow-y-auto`).
  - Modals and Dialogs: Bound to `max-h-[90vh] overflow-y-auto` so modal dialogs never spill past viewport boundaries.

---

## Project Structure

```
cloudbox/
├── docker-compose.yml          # Multi-container orchestration (API, Postgres, Redis, MinIO)
├── README.md                   # System documentation
│
├── backend/                    # Go REST API backend
│   ├── main.go                 # Application bootstrap and dependency injection
│   ├── Dockerfile              # Multi-stage production container build
│   ├── go.mod / go.sum         # Go module dependencies
│   ├── .env.example            # Environment variables template
│   ├── config/                 # Viper environment and config loader
│   ├── database/               # GORM connection and auto-migration
│   ├── models/                 # User, File, Folder, Share domain models
│   ├── repository/             # Database access layer (UserRepository, FileRepository, etc.)
│   ├── services/               # Business logic (FileService, FolderService, ShareService, AuthService)
│   ├── handlers/               # Gin HTTP route handlers
│   ├── routes/                 # Router configuration and middleware pipeline
│   ├── middleware/             # JWT auth, Zap logger, CORS, Redis rate limiter
│   ├── storage/                # MinIO S3 client and presigned URL generator
│   ├── cache/                  # Redis cache-aside client
│   ├── workers/                # Goroutine worker pool and asynchronous job queue
│   └── utils/                  # JSON response envelopes and password hashing
│
└── frontend/                   # Next.js client application
    ├── package.json            # Node.js dependencies and scripts
    ├── next.config.ts          # Next.js configuration
    ├── tsconfig.json           # TypeScript configuration
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # Root layout with h-full and font providers
    │   │   ├── globals.css     # Tailwind CSS styles and custom slim scrollbars
    │   │   ├── page.tsx        # Auth state router and redirect
    │   │   ├── dashboard/      # Metrics, storage status, scrollable recent files table
    │   │   ├── files/          # Drive explorer with breadcrumbs, table and grid views
    │   │   ├── upload/         # Drag-and-drop upload zone and scrollable upload queue
    │   │   ├── settings/       # Account profile and storage usage
    │   │   ├── shared/[token]/ # Public temporary share download page
    │   │   ├── login/          # User login page
    │   │   └── register/       # User registration page
    │   ├── components/
    │   │   ├── layout/         # AppShell, Sidebar, Header
    │   │   ├── files/          # FileTable, FileGrid, FolderGrid, FileUploadModal, FilePreviewModal, ShareModal, MoveModal, RenameModal
    │   │   ├── dashboard/      # ApiDocsModal
    │   │   └── ui/             # Reusable UI primitives (dialog, button, dropdown, card, input)
    │   ├── hooks/              # useFiles, useFolders, useStorageUsage, mutations
    │   ├── providers/          # AuthProvider, React Query Providers
    │   ├── lib/                # Axios API client, auth helpers, utility functions
    │   └── types/              # TypeScript interfaces (FileItem, Folder, Share, User)
```

---

## REST API Reference

All responses use a standardized JSON envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### 1. Health and System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check endpoint returning `{ "status": "ok" }` |

### 2. Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create new account (`{ email, password }`) |
| `POST` | `/api/auth/login` | Public | Authenticate user and obtain 24-hour JWT token |
| `GET` | `/api/auth/me` | JWT | Get current authenticated user profile |

### 3. File Operations
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/files` | JWT | List files (`?folder_id=<id>` for specific folder, omitted for root) |
| `GET` | `/api/files/search` | JWT | Search files by name query (`?q=term`) |
| `POST` | `/api/files` | JWT | Direct multipart file upload to backend |
| `POST` | `/api/files/upload-url` | JWT | Request presigned S3 PUT URL for direct upload |
| `POST` | `/api/files/confirm-upload` | JWT | Confirm presigned upload and persist metadata |
| `GET` | `/api/files/:id` | JWT | Retrieve file metadata (Redis cache-aside) |
| `PATCH` | `/api/files/:id` | JWT | Rename file or move to another folder (`{ filename, folder_id }`) |
| `DELETE` | `/api/files/:id` | JWT | Delete file from PostgreSQL, Redis, and MinIO |
| `GET` | `/api/files/:id/download-url` | JWT | Generate presigned S3 GET download URL |
| `GET` | `/api/files/:id/download` | JWT | Stream file binary directly from storage |

### 4. Folder Operations
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/folders` | JWT | List folders (`?parent_id=<id>` for subfolders, omitted for root) |
| `GET` | `/api/folders/:id` | JWT | Get folder metadata by ID |
| `POST` | `/api/folders` | JWT | Create a new folder (`{ name, parent_id }`) |
| `PATCH` | `/api/folders/:id` | JWT | Rename or move folder (with circular reference check) |
| `DELETE` | `/api/folders/:id` | JWT | Cascading deletion of folder, subfolders, and files |

### 5. Sharing and Storage Quotas
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shares` | JWT | Create share link (`{ file_id, duration_minutes }`) |
| `GET` | `/api/shares` | JWT | List all active shares created by the user |
| `DELETE` | `/api/shares/:id` | JWT | Revoke an existing share link |
| `GET` | `/api/shares/:token` | Public | Resolve public share token to file metadata and presigned URL |
| `GET` | `/api/storage/usage` | JWT | Retrieve current storage usage against 50 GB quota |

---

## Getting Started and Local Setup

### Option A: Complete Docker Compose (Recommended)
From the project root:

```bash
docker compose up -d
```

Service endpoints:
- CloudBox API: `http://localhost:8080`
- MinIO Web Console: `http://localhost:9001` (Username: `minioadmin`, Password: `minioadmin`)
- MinIO S3 API: `http://localhost:9000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Option B: Local Backend Development

1. Start required infrastructure services:
```bash
docker compose up -d postgres redis minio
```

2. Configure environment variables in `backend/.env`:
```env
APP_PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cloudbox?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=cloudbox-super-secret-jwt-key-change-in-prod
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cloudbox
MINIO_PUBLIC_URL=localhost:9000
```

3. Run the Go application:
```bash
cd backend
go run main.go
```

### Option C: Local Frontend Development

1. Set `.env.local` in the `frontend` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

2. Install dependencies and start the development server:
```bash
cd frontend
npm install
npm run dev
```

The frontend client will be accessible at `http://localhost:3000`.

---

## Testing and Verification

### Backend Go Tests
Run the entire backend test suite:
```bash
cd backend
go test -count=1 -v ./...
```

Run tests for specific packages:
```bash
cd backend
go test -v ./handlers
go test -v ./services
go test -v ./middleware
go test -v ./workers
```

### Frontend Typecheck and Lint
Validate TypeScript types and JSX across all routes:
```bash
cd frontend
npx tsc --noEmit
```

---

## Key Backend Interview and Architecture Highlights

When discussing the CloudBox system design and technical trade-offs:

1. **Direct-to-S3 Presigned URLs vs API Proxying**
   - Proxying multi-gigabyte files through the application layer consumes socket connections, memory buffers, and CPU cycles.
   - Offloading binary reads and writes directly to MinIO/S3 using short-lived presigned URLs keeps the Go API stateless, low-latency, and focused strictly on authorization and metadata management.

2. **Circular Folder Dependency Prevention**
   - Moving a folder into one of its own descendants creates orphaned reference loops in relational tree structures.
   - The hierarchy is validated using depth/breadth tree traversal before committing changes, rejecting any cyclic moves with `409 Conflict`.

3. **Separation of Relational Metadata and Binary Storage**
   - Relational tables store indexed pointers (`storage_key`, `size`, `folder_id`, `user_id`).
   - Keeps relational row footprints small, query execution fast, and index pages cache-friendly while object storage handles horizontal scale.

4. **Cache Invalidation and Read-Through Strategy**
   - File metadata reads utilize the cache-aside pattern with a 10-minute TTL.
   - Any write or delete operation purges the associated cache key immediately, preventing stale reads across replicas.

5. **Rate Limiting with Redis Atomic Pipelines**
   - Request counts are tracked per client IP using Redis sliding-window counters.
   - Protects against brute-force authentication attacks and resource exhaustion on file endpoints.

6. **Goroutine Worker Pool for Asynchronous Offloading**
   - Non-critical post-upload tasks are offloaded to an internal worker pool via buffered Go channels.
   - Avoids adding latency to synchronous HTTP responses while managing concurrency limits to prevent resource contention.
