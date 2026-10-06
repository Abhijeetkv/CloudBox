# 📦 CloudBox — Production-Style Cloud File Storage Backend

CloudBox is a lightweight, production-grade cloud file-storage service inspired by AWS S3, engineered with **Go**, **Gin**, **PostgreSQL**, **Redis**, and **MinIO**.

---

## 📑 Table of Contents
1. [Overview](#-overview)
2. [Technology Choices & Rationale](#-technology-choices--rationale)
3. [Architecture](#-architecture)
4. [Concurrency & Worker Pool](#-concurrency--worker-pool)
5. [Project Structure](#-project-structure)
6. [Environment Variables](#-environment-variables)
7. [Getting Started](#-getting-started)
   - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
   - [Option B: Local Development](#option-b-local-development)
8. [Running Tests](#-running-tests)
9. [API Documentation & curl Examples](#-api-documentation--curl-examples)
10. [Future Production Improvements](#-future-production-improvements)

---

## 🌟 Overview

CloudBox delivers scalable file storage with clear separation of responsibilities:
- **Binary Data:** Stored in MinIO object storage (S3-compatible).
- **Metadata:** Persisted in PostgreSQL via GORM (filename, MIME type, byte size, ownership).
- **Caching & Rate Limiting:** High-speed cache-aside lookups and IP-based rate limiting via Redis.
- **Background Jobs:** Asynchronous file processing powered by Go native goroutines and buffered channels.
- **Security:** Bcrypt password hashing, signed JWT tokens, and strict file ownership enforcement.

---

## 💡 Technology Choices & Rationale

| Technology | Purpose | Why We Chose It |
|---|---|---|
| **Go (Golang)** | Primary Language | Blazing-fast execution, low memory footprint, compiled static binaries, and first-class native concurrency primitives (goroutines and channels). |
| **Gin Framework** | HTTP Router & API Engine | Minimalist, high performance (powered by `httprouter`), rich middleware ecosystem, and clean JSON/multipart binding. |
| **GORM** | PostgreSQL ORM | Type-safe database operations, connection pooling, and automatic schema migrations. |
| **PostgreSQL** | Relational Metadata DB | ACID compliance, robust indexing on user ownership and storage keys, and relational integrity. |
| **Redis** | In-Memory Cache & Limiter | Sub-millisecond latency for metadata caching and atomic pipeline increments for rate limiting. |
| **MinIO** | Object Storage | 100% S3 API compatibility for local development and private clouds, allowing easy migration to AWS S3. |
| **Zap** | Structured Logging | Zero-allocation structured JSON and console logging for high-throughput production environments. |
| **Viper** | Configuration Management | 12-factor configuration support reading `.env` files, OS environments, and fallback defaults. |
| **Testify & Miniredis** | Testing Suite | Clean assertion libraries and in-memory Redis emulation for deterministic tests. |

---

## 🏛️ Architecture

```
                                  Client
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Gin Router     │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │     Middlewares     │
                         │ ├─ Structured Log   │
                         │ ├─ Panic Recovery   │
                         │ ├─ Rate Limiting    │
                         │ └─ JWT Auth         │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Handlers       │
                         │  (Auth & File HTTP) │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Services       │
                         │ (Auth & File Logic) │
                         └─────┬───────┬───────┘
                               │       │
             ┌─────────────────┘       └──────────────────┐
             ▼                                            ▼
┌─────────────────────────┐                  ┌─────────────────────────┐
│     File Repository     │                  │     Storage Service     │
│       (PostgreSQL)      │                  │       (MinIO / S3)      │
└────────────┬────────────┘                  └─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│       Redis Cache       │
│  (Cache-aside & Limits) │
└─────────────────────────┘
```

---

## ⚡ Concurrency & Worker Pool

CloudBox uses native Go concurrency rather than heavy message brokers (RabbitMQ/Kafka) to demonstrate idiomatic Go patterns:

```
File Uploaded
     │
     ▼
FileService.Upload
     │
     ▼
WorkerPool.Enqueue(Job)
     │
     ▼
[ buffered chan Job (Capacity: 100) ]
     │
     ├── Worker 1 (Goroutine) ──> Process & Log
     ├── Worker 2 (Goroutine) ──> Process & Log
     └── Worker 3 (Goroutine) ──> Process & Log
```

1. **`chan Job`**: A buffered Go channel holding pending processing tasks.
2. **Workers**: 3 concurrent goroutines spawned during startup listening to the same channel.
3. **Non-blocking Enqueue**: Uses Go's `select` with a `default` case to avoid stalling HTTP responses if the queue reaches capacity.
4. **Graceful Shutdown**: On server termination, `Stop()` closes the channel and uses `sync.WaitGroup` to let in-flight jobs finish processing.

---

## 📁 Project Structure

```
cloudbox/
├── docker-compose.yml          # Multi-container orchestration (API, Postgres, Redis, MinIO)
├── README.md                   # Complete documentation
├── .gitignore                  # Root git ignore
│
└── backend/                    # All backend Go source code & configuration
    ├── main.go                 # Entry point (initializes DB, Redis, MinIO, workers, router)
    ├── go.mod                  # Module definition and dependencies
    ├── go.sum                  # Cryptographic dependency checksums
    ├── Dockerfile              # Multi-stage minimal production Dockerfile
    ├── .env                    # Local environment variables
    ├── .env.example            # Example environment variables template
    ├── .gitignore              # Backend git ignore
    │
    ├── config/
    │   └── config.go           # Viper environment loader
    ├── database/
    │   └── database.go         # GORM PostgreSQL connection, pooling, & AutoMigrate
    ├── models/
    │   ├── user.go             # User model & relationships
    │   └── file.go             # File metadata model
    ├── repository/
    │   ├── user_repository.go  # PostgreSQL User queries
    │   └── file_repository.go  # PostgreSQL File queries
    ├── services/
    │   ├── auth_service.go     # Registration & login business logic
    │   └── file_service.go     # File upload, streaming, caching, & deletion logic
    ├── handlers/
    │   ├── auth_handler.go     # Auth HTTP endpoints
    │   └── file_handler.go     # File management HTTP endpoints
    ├── middleware/
    │   ├── auth.go             # JWT validation & context injection
    │   ├── logger.go           # Zap structured request logging & recovery
    │   └── rate_limit.go       # Redis IP-based rate limiting (429)
    ├── storage/
    │   └── minio.go            # Storage interface abstraction & MinIO client
    ├── cache/
    │   └── redis.go            # Redis client & CacheService implementation
    ├── workers/
    │   └── worker.go           # Worker pool, channel dispatch, & graceful stop
    ├── routes/
    │   └── routes.go           # Gin routing table setup
    └── utils/
        ├── jwt.go              # JWT generation & validation
        └── password.go         # Bcrypt hashing & verification
```

---

## ⚙️ Environment Variables

The backend configuration is managed in `backend/.env`:

| Variable | Description | Default Local Value | Docker Compose Value |
|---|---|---|---|
| `APP_PORT` | HTTP server port | `8080` | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/cloudbox` | `postgres://postgres:postgres@postgres:5432/cloudbox?sslmode=disable` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | `redis://redis:6379` |
| `JWT_SECRET` | HMAC secret key for JWT signing | `change-me-secret-key-12345` | `cloudbox-super-secret-jwt-key` |
| `MINIO_ENDPOINT` | MinIO host and port | `localhost:9000` | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO root/access key | `minioadmin` | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` | `minioadmin` |
| `MINIO_BUCKET` | S3 bucket name for files | `cloudbox` | `cloudbox` |

---

## 🚀 Getting Started

### Option A: Docker Compose (Recommended)

From the project root:

```powershell
docker compose up --build
```

- **API:** http://localhost:8080
- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`
- **MinIO S3 API:** http://localhost:9000
- **MinIO Web Console:** http://localhost:9001 (User: `minioadmin`, Password: `minioadmin`)

---

### Option B: Local Development

1. Ensure PostgreSQL, Redis, and MinIO are running (e.g. `docker compose up -d postgres redis minio`).
2. Navigate into the backend directory:
   ```powershell
   cd backend
   go run main.go
   ```

---

## 🧪 Running Tests

To run the complete test suite:

```powershell
cd backend
go test -v ./...
```

To run a specific package test:
```powershell
go test -v ./handlers
go test -v ./services
go test -v ./middleware
go test -v ./workers
```

---

## 📡 API Documentation & curl Examples

### 1. Health Check
Checks if the server is healthy.
- **Method:** `GET`
- **URL:** `/health`
- **Auth:** None

```powershell
curl http://localhost:8080/health
```
**Response (`200 OK`):**
```json
{
  "status": "ok"
}
```

---

### 2. User Registration
Registers a new user account.
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "alice@example.com",
    "password": "password123"
  }
  ```

```powershell
curl -X POST http://localhost:8080/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"alice@example.com","password":"password123"}'
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "alice@example.com",
    "created_at": "2026-10-06T22:50:00Z"
  }
}
```
**Possible Errors:**
- `400 Bad Request` (Email invalid or password < 6 chars)
- `409 Conflict` (User with this email already exists)

---

### 3. User Login
Authenticates an existing user and returns a signed JWT.
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "alice@example.com",
    "password": "password123"
  }
  ```

```powershell
curl -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"alice@example.com","password":"password123"}'
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "alice@example.com"
    }
  }
}
```
**Possible Errors:**
- `401 Unauthorized` (Invalid email or password)

---

### 4. Get Current User (`Me`)
Verifies active JWT token and retrieves user identity.
- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Auth:** Bearer Token

```powershell
curl http://localhost:8080/api/auth/me `
  -H "Authorization: Bearer <TOKEN>"
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "alice@example.com"
  }
}
```

---

### 5. Upload File
Uploads a file via `multipart/form-data`. Stores object in MinIO, metadata in PostgreSQL, and enqueues a background processing job.
- **Method:** `POST`
- **URL:** `/api/files`
- **Auth:** Bearer Token
- **Content-Type:** `multipart/form-data`
- **Field:** `file`

```powershell
curl -X POST http://localhost:8080/api/files `
  -H "Authorization: Bearer <TOKEN>" `
  -F "file=@document.pdf"
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "file": {
    "id": 1,
    "filename": "document.pdf",
    "size": 120034,
    "mime_type": "application/pdf",
    "created_at": "2026-10-06T22:52:00Z"
  }
}
```

---

### 6. List Files
Lists all files owned by the authenticated user.
- **Method:** `GET`
- **URL:** `/api/files`
- **Auth:** Bearer Token

```powershell
curl http://localhost:8080/api/files `
  -H "Authorization: Bearer <TOKEN>"
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "filename": "document.pdf",
      "storage_key": "users/1/892e4a64-document.pdf",
      "size": 120034,
      "mime_type": "application/pdf",
      "created_at": "2026-10-06T22:52:00Z",
      "updated_at": "2026-10-06T22:52:00Z"
    }
  ]
}
```

---

### 7. Get File Metadata
Retrieves metadata for a specific file. Utilizes Redis cache-aside.
- **Method:** `GET`
- **URL:** `/api/files/:id`
- **Auth:** Bearer Token

```powershell
curl http://localhost:8080/api/files/1 `
  -H "Authorization: Bearer <TOKEN>"
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "filename": "document.pdf",
    "storage_key": "users/1/892e4a64-document.pdf",
    "size": 120034,
    "mime_type": "application/pdf",
    "created_at": "2026-10-06T22:52:00Z",
    "updated_at": "2026-10-06T22:52:00Z"
  }
}
```
**Possible Errors:**
- `404 Not Found` (File does not exist)
- `403 Forbidden` (User does not own this file)

---

### 8. Download File
Streams file contents directly from MinIO to the HTTP response with proper download headers.
- **Method:** `GET`
- **URL:** `/api/files/:id/download`
- **Auth:** Bearer Token

```powershell
curl http://localhost:8080/api/files/1/download `
  -H "Authorization: Bearer <TOKEN>" `
  -o downloaded_document.pdf
```
**Response Headers:**
- `Content-Disposition: attachment; filename="document.pdf"`
- `Content-Type: application/pdf`
- `Content-Length: 120034`

**Possible Errors:**
- `404 Not Found` (File does not exist)
- `403 Forbidden` (Access denied: file owned by another user)

---

### 9. Delete File
Deletes the object from MinIO, removes metadata from PostgreSQL, and invalidates Redis cache.
- **Method:** `DELETE`
- **URL:** `/api/files/:id`
- **Auth:** Bearer Token

```powershell
curl -X DELETE http://localhost:8080/api/files/1 `
  -H "Authorization: Bearer <TOKEN>"
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "data": "file deleted successfully"
}
```
**Possible Errors:**
- `404 Not Found` (File does not exist)
- `403 Forbidden` (Access denied: file owned by another user)

---

## 🔮 Future Production Improvements

1. **Pre-signed URLs:** For large multi-gigabyte uploads, generate pre-signed S3 upload URLs so clients upload directly to MinIO/S3, eliminating API proxy memory and bandwidth consumption.
2. **Chunked Resumable Uploads:** Implement TUS (tus.io protocol) or multipart upload chunks for unstable client connections.
3. **Distributed Job Workers:** Transition worker goroutines to an external queue (e.g. Asynq backed by Redis, or RabbitMQ) for multi-instance scaling.
4. **File Encryption at Rest:** Use MinIO SSE-S3 / SSE-KMS server-side encryption for sensitive files.
5. **Soft Deletes:** Implement GORM soft deletes (`gorm.DeletedAt`) with a 30-day trash retention policy before permanent deletion.
6. **Virus Scanning Worker:** Integrate ClamAV in the background worker pool to scan uploaded files before making them downloadable.
# CloudBox
