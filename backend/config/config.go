package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config holds all the environment configuration for CloudBox.
type Config struct {
	AppPort        string `mapstructure:"APP_PORT"`
	DatabaseURL    string `mapstructure:"DATABASE_URL"`
	RedisURL       string `mapstructure:"REDIS_URL"`
	JWTSecret      string `mapstructure:"JWT_SECRET"`
	MinIOEndpoint  string `mapstructure:"MINIO_ENDPOINT"`
	MinIOAccessKey string `mapstructure:"MINIO_ACCESS_KEY"`
	MinIOSecretKey string `mapstructure:"MINIO_SECRET_KEY"`
	MinIOBucket    string `mapstructure:"MINIO_BUCKET"`
	MinIOPublicURL string `mapstructure:"MINIO_PUBLIC_URL"`
}

// LoadConfig reads configuration from .env file or environment variables.
func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")

	// Set sensible default values
	viper.SetDefault("APP_PORT", "8080")
	viper.SetDefault("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/cloudbox")
	viper.SetDefault("REDIS_URL", "redis://localhost:6379")
	viper.SetDefault("JWT_SECRET", "change-me")
	viper.SetDefault("MINIO_ENDPOINT", "localhost:9000")
	viper.SetDefault("MINIO_ACCESS_KEY", "minioadmin")
	viper.SetDefault("MINIO_SECRET_KEY", "minioadmin")
	viper.SetDefault("MINIO_BUCKET", "cloudbox")
	viper.SetDefault("MINIO_PUBLIC_URL", "localhost:9000")

	// Read environment variables from OS if present
	viper.AutomaticEnv()

	// Try reading .env file; if it doesn't exist, we fallback to OS environment or defaults
	if err := viper.ReadInConfig(); err != nil {
		// Only ignore error if the config file was not found
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// If file exists but has syntax errors or other issues, return error
			// Note: viper.ReadInConfig might return an os.PathError on missing file
			fmt.Printf("Notice: .env file not found or could not be read (%v), using environment variables/defaults\n", err)
		}
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unable to decode config into struct: %w", err)
	}

	return &cfg, nil
}
