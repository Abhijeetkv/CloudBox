# Step 1: Build stage
FROM golang:1.27-alpine AS builder

WORKDIR /app

# Install git and ca-certificates (required for downloading dependencies)
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically-linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o cloudbox .

# Step 2: Minimal runtime stage
FROM alpine:3.20

WORKDIR /app

# Add ca-certificates for outbound TLS connections
RUN apk add --no-cache ca-certificates tzdata

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy binary from builder
COPY --from=builder /app/cloudbox /app/cloudbox
COPY --from=builder /app/.env.example /app/.env.example

# Expose HTTP port
EXPOSE 8080

ENTRYPOINT ["/app/cloudbox"]
