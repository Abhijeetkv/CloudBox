package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// IPRateLimiter creates a Gin middleware that enforces an IP-based request rate limit using Redis.
// Example: limit = 100 requests, window = 1 * time.Minute.
func IPRateLimiter(client *redis.Client, limit int64, window time.Duration, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if client == nil {
			c.Next()
			return
		}

		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", clientIP)
		ctx := c.Request.Context()

		// Use a Redis pipeline for atomic increment and expiry setup
		pipe := client.TxPipeline()
		incr := pipe.Incr(ctx, key)
		pipe.Expire(ctx, key, window)
		_, err := pipe.Exec(ctx)

		if err != nil && err != redis.Nil {
			// If Redis is temporarily unreachable, log warning and fail open so legitimate traffic is not blocked
			logger.Warn("Rate limiter Redis failure, bypassing check", zap.Error(err), zap.String("ip", clientIP))
			c.Next()
			return
		}

		count := incr.Val()
		if count > limit {
			logger.Warn("Rate limit exceeded",
				zap.String("ip", clientIP),
				zap.Int64("current_count", count),
				zap.Int64("limit", limit),
			)

			c.Header("Retry-After", fmt.Sprintf("%.0f", window.Seconds()))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   "too many requests, please try again later",
			})
			return
		}

		c.Next()
	}
}
