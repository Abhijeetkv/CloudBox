package cache_test

import (
	"context"
	"testing"
	"time"

	"cloudbox/cache"
	"cloudbox/models"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestRedisCache_Lifecycle(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	redisCache := cache.NewRedisCache(rdb, zap.NewNop())
	ctx := context.Background()

	file := &models.File{
		ID:         42,
		UserID:     1,
		Filename:   "quarterly_report.pdf",
		StorageKey: "users/1/report.pdf",
		Size:       1024,
		MimeType:   "application/pdf",
	}

	// 1. Initial Cache Miss
	_, err := redisCache.GetFile(ctx, file.ID)
	assert.ErrorIs(t, err, cache.ErrCacheMiss)

	// 2. Set File in Cache
	err = redisCache.SetFile(ctx, file, 5*time.Minute)
	assert.NoError(t, err)

	// 3. Cache Hit
	cached, err := redisCache.GetFile(ctx, file.ID)
	assert.NoError(t, err)
	assert.NotNil(t, cached)
	assert.Equal(t, file.ID, cached.ID)
	assert.Equal(t, file.Filename, cached.Filename)
	assert.Equal(t, file.Size, cached.Size)

	// 4. Invalidate Cache
	err = redisCache.DeleteFile(ctx, file.ID)
	assert.NoError(t, err)

	// 5. Subsequent Cache Miss
	_, err = redisCache.GetFile(ctx, file.ID)
	assert.ErrorIs(t, err, cache.ErrCacheMiss)
}
