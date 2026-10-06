package database

import (
	"fmt"
	"time"

	"cloudbox/models"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// InitDB initializes PostgreSQL connection using GORM and runs AutoMigrate.
func InitDB(databaseURL string, log *zap.Logger) (*gorm.DB, error) {
	gormConfig := &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	}

	db, err := gorm.Open(postgres.Open(databaseURL), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get generic database object: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Run AutoMigrate for User and File models
	log.Info("Running database AutoMigrate...")
	if err := db.AutoMigrate(&models.User{}, &models.File{}); err != nil {
		return nil, fmt.Errorf("failed to auto-migrate database: %w", err)
	}

	log.Info("Database initialized and migrated successfully")
	return db, nil
}
