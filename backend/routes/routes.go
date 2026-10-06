package routes

import (
	"net/http"
	"time"

	"cloudbox/config"
	"cloudbox/handlers"
	"cloudbox/middleware"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const (
	rateLimitRequests = 100
	rateLimitWindow   = 1 * time.Minute
)

// SetupRouter sets up Gin router with middlewares, rate limiting, and registered routes.
func SetupRouter(
	cfg *config.Config,
	log *zap.Logger,
	redisClient *redis.Client,
	authHandler *handlers.AuthHandler,
	fileHandler *handlers.FileHandler,
) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()

	// Global Middlewares
	router.Use(middleware.CORS())
	router.Use(middleware.ZapLogger(log))
	router.Use(middleware.ZapRecovery(log))
	router.Use(middleware.IPRateLimiter(redisClient, rateLimitRequests, rateLimitWindow, log))

	// Handle CORS preflight across unmapped methods & routes
	router.NoRoute(middleware.CORS(), func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "route not found"})
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	api := router.Group("/api")
	{
		// Authentication routes (Public & Protected)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", middleware.JWTAuth(cfg.JWTSecret), authHandler.Me)
		}

		// File routes (Protected by JWT)
		files := api.Group("/files", middleware.JWTAuth(cfg.JWTSecret))
		{
			files.POST("", fileHandler.Upload)
			files.GET("", fileHandler.List)
			files.GET("/:id", fileHandler.Get)
			files.GET("/:id/download", fileHandler.Download)
			files.DELETE("/:id", fileHandler.Delete)
		}
	}

	return router
}
