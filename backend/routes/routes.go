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
	folderHandler *handlers.FolderHandler,
	shareHandler *handlers.ShareHandler,
	storageHandler *handlers.StorageHandler,
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

		// Public share resolution endpoint (No JWT required)
		api.GET("/shares/:token", shareHandler.Get)

		// Protected routes requiring valid JWT
		protected := api.Group("", middleware.JWTAuth(cfg.JWTSecret))
		{
			// File routes
			files := protected.Group("/files")
			{
				files.POST("", fileHandler.Upload)
				files.POST("/upload-url", fileHandler.GetUploadURL)
				files.POST("/confirm-upload", fileHandler.ConfirmUpload)
				files.GET("", fileHandler.List)
				files.GET("/search", fileHandler.Search)
				files.GET("/:id", fileHandler.Get)
				files.PATCH("/:id", fileHandler.Update)
				files.DELETE("/:id", fileHandler.Delete)
				files.GET("/:id/download-url", fileHandler.GetDownloadURL)
				files.GET("/:id/download", fileHandler.Download)
			}

			// Folder routes
			folders := protected.Group("/folders")
			{
				folders.POST("", folderHandler.Create)
				folders.GET("", folderHandler.List)
				folders.GET("/:id", folderHandler.Get)
				folders.PATCH("/:id", folderHandler.Update)
				folders.DELETE("/:id", folderHandler.Delete)
			}

			// Share management routes (authenticated user managing their shares)
			shares := protected.Group("/shares")
			{
				shares.POST("", shareHandler.Create)
				shares.GET("", shareHandler.List)
				shares.DELETE("/:id", shareHandler.Delete)
			}

			// Storage quota endpoint
			protected.GET("/storage/usage", storageHandler.GetUsage)
		}
	}

	return router
}
