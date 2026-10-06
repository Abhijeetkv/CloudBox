package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

// Storage defines the pluggable object storage contract.
// This interface allows seamless swapping between MinIO, AWS S3, or in-memory mocks.
type Storage interface {
	Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error
	Download(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
}

type minioStorage struct {
	client *minio.Client
	bucket string
	logger *zap.Logger
}

// NewMinIOStorage creates a new MinIO-backed storage and ensures the bucket exists.
func NewMinIOStorage(endpoint, accessKey, secretKey, bucket string, useSSL bool, logger *zap.Logger) (Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("failed to check if MinIO bucket exists: %w", err)
	}

	if !exists {
		logger.Info("MinIO bucket does not exist, creating bucket...", zap.String("bucket", bucket))
		err = client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create MinIO bucket '%s': %w", bucket, err)
		}
		logger.Info("MinIO bucket created successfully", zap.String("bucket", bucket))
	} else {
		logger.Info("Connected to MinIO bucket", zap.String("bucket", bucket))
	}

	return &minioStorage{
		client: client,
		bucket: bucket,
		logger: logger,
	}, nil
}

// Upload uploads an object to MinIO.
func (s *minioStorage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload object to MinIO: %w", err)
	}
	return nil
}

// Download retrieves an object from MinIO as an io.ReadCloser.
func (s *minioStorage) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	object, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object from MinIO: %w", err)
	}

	// Verify object exists by checking its stat
	_, err = object.Stat()
	if err != nil {
		_ = object.Close()
		return nil, fmt.Errorf("object not found or inaccessible in MinIO: %w", err)
	}

	return object, nil
}

// Delete removes an object from MinIO.
func (s *minioStorage) Delete(ctx context.Context, key string) error {
	err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object from MinIO: %w", err)
	}
	return nil
}
