package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cloudbox/middleware"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func setupRateLimiterRouter(rdb *redis.Client, limit int64, window time.Duration) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.IPRateLimiter(rdb, limit, window, zap.NewNop()))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	return r
}

func TestIPRateLimiter(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	// Limit to 3 requests per minute for the test
	limit := int64(3)
	window := 1 * time.Minute
	router := setupRateLimiterRouter(rdb, limit, window)

	// Send requests 1, 2, 3 -> Should all succeed (200 OK)
	for i := 1; i <= 3; i++ {
		req, _ := http.NewRequest(http.MethodGet, "/ping", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code, "request %d should succeed", i)
	}

	// Send request 4 -> Exceeds limit -> 429 Too Many Requests
	req, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "too many requests")
	assert.NotEmpty(t, w.Header().Get("Retry-After"))
}
