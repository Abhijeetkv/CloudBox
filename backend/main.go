package main

import (
	"fmt"
	"log"

	"cloudbox/cache"
	"cloudbox/config"
	"cloudbox/database"
	"cloudbox/handlers"
	"cloudbox/middleware"
	"cloudbox/repository"
	"cloudbox/routes"
	"cloudbox/services"
	"cloudbox/storage"
	"cloudbox/workers"

	"go.uber.org/zap"
)

const (
	workerCount     = 3
	workerQueueSize = 100
)

func main() {
	// 1. Initialize Zap Logger
	logger, err := middleware.InitLogger()
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}
	defer func() {
		_ = logger.Sync()
	}()

	// 2. Load Configuration via Viper
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Fatal("failed to load configuration", zap.Error(err))
	}

	logger.Info("Configuration loaded successfully",
		zap.String("port", cfg.AppPort),
		zap.String("db_endpoint", cfg.DatabaseURL),
		zap.String("redis_endpoint", cfg.RedisURL),
		zap.String("minio_endpoint", cfg.MinIOEndpoint),
	)

	// 3. Initialize PostgreSQL with GORM
	db, err := database.InitDB(cfg.DatabaseURL, logger)
	if err != nil {
		logger.Fatal("Database initialization failed",
			zap.Error(err),
			zap.String("hint", "Ensure PostgreSQL is running or check DATABASE_URL in .env"),
		)
	}

	// 4. Initialize Redis Client & Cache Service
	redisClient, err := cache.InitRedisClient(cfg.RedisURL, logger)
	if err != nil {
		logger.Fatal("Redis initialization failed",
			zap.Error(err),
			zap.String("hint", "Ensure Redis is running or check REDIS_URL in .env"),
		)
	}
	defer redisClient.Close()
	redisCache := cache.NewRedisCache(redisClient, logger)

	// 5. Initialize MinIO Object Storage
	minioStore, err := storage.NewMinIOStorage(
		cfg.MinIOEndpoint,
		cfg.MinIOAccessKey,
		cfg.MinIOSecretKey,
		cfg.MinIOBucket,
		cfg.MinIOPublicURL,
		false,
		logger,
	)
	if err != nil {
		logger.Fatal("MinIO initialization failed",
			zap.Error(err),
			zap.String("hint", "Ensure MinIO is running or check MINIO_* in .env"),
		)
	}

	// 6. Initialize Repositories
	userRepo := repository.NewUserRepository(db)
	fileRepo := repository.NewFileRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	shareRepo := repository.NewShareRepository(db)

	// 7. Initialize and Start Background Worker Pool
	workerPool := workers.NewWorkerPool(workerCount, workerQueueSize, logger)
	workerPool.Start()
	defer workerPool.Stop()

	// 8. Initialize Services
	authService := services.NewAuthService(userRepo, cfg.JWTSecret)
	folderService := services.NewFolderService(folderRepo, fileRepo, minioStore, redisCache)
	fileService := services.NewFileService(fileRepo, folderRepo, minioStore, redisCache, workerPool)
	shareService := services.NewShareService(shareRepo, fileRepo, minioStore, redisCache)

	// 9. Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService, logger)
	fileHandler := handlers.NewFileHandler(fileService, logger)
	folderHandler := handlers.NewFolderHandler(folderService, logger)
	shareHandler := handlers.NewShareHandler(shareService, logger)
	storageHandler := handlers.NewStorageHandler(fileService, logger)

	// 10. Setup Routes and Middleware
	router := routes.SetupRouter(
		cfg,
		logger,
		redisClient,
		authHandler,
		fileHandler,
		folderHandler,
		shareHandler,
		storageHandler,
	)

	// 11. Start HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.AppPort)
	logger.Info("Starting CloudBox server", zap.String("address", serverAddr))

	if err := router.Run(serverAddr); err != nil {
		logger.Fatal("Server failed to start", zap.Error(err))
	}
}
