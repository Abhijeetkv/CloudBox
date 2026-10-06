package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"cloudbox/models"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var (
	ErrCacheMiss = errors.New("cache miss: key not found")
)

// CacheService defines the contract for caching file metadata.
type CacheService interface {
	GetFile(ctx context.Context, fileID uint) (*models.File, error)
	SetFile(ctx context.Context, file *models.File, ttl time.Duration) error
	DeleteFile(ctx context.Context, fileID uint) error
}

// InitRedisClient connects to Redis and performs a ping check.
func InitRedisClient(redisURL string, logger *zap.Logger) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback for simple address string if not in full URL format
		opt = &redis.Options{
			Addr: redisURL,
		}
	}

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	logger.Info("Connected to Redis successfully", zap.String("addr", opt.Addr))
	return client, nil
}

type redisCache struct {
	client *redis.Client
	logger *zap.Logger
}

// NewRedisCache creates an instance of CacheService using Redis.
func NewRedisCache(client *redis.Client, logger *zap.Logger) CacheService {
	return &redisCache{
		client: client,
		logger: logger,
	}
}

func fileKey(fileID uint) string {
	return fmt.Sprintf("file:%d", fileID)
}

// GetFile retrieves and unmarshals file metadata from Redis.
func (c *redisCache) GetFile(ctx context.Context, fileID uint) (*models.File, error) {
	key := fileKey(fileID)
	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrCacheMiss
		}
		return nil, err
	}

	var file models.File
	if err := json.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("failed to deserialize cached file: %w", err)
	}

	return &file, nil
}

// SetFile serializes and stores file metadata in Redis with a TTL.
func (c *redisCache) SetFile(ctx context.Context, file *models.File, ttl time.Duration) error {
	if file == nil {
		return nil
	}

	key := fileKey(file.ID)
	data, err := json.Marshal(file)
	if err != nil {
		return fmt.Errorf("failed to serialize file for cache: %w", err)
	}

	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to write file to Redis cache: %w", err)
	}

	return nil
}

// DeleteFile invalidates the cached file metadata.
func (c *redisCache) DeleteFile(ctx context.Context, fileID uint) error {
	key := fileKey(fileID)
	if err := c.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete file cache from Redis: %w", err)
	}
	return nil
}
