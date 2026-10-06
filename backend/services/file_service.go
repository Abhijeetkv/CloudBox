package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"cloudbox/cache"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/storage"
	"cloudbox/workers"

	"github.com/google/uuid"
)

var (
	ErrAccessDenied = errors.New("access denied: you do not own this file")
	ErrEmptyFile    = errors.New("cannot upload an empty file")
)

const (
	fileCacheTTL = 15 * time.Minute
)

// JobQueue defines the contract for dispatching background worker jobs.
type JobQueue interface {
	Enqueue(job workers.Job)
}

// FileService defines business operations for file management.
type FileService interface {
	Upload(ctx context.Context, userID uint, filename string, reader io.Reader, size int64, mimeType string) (*models.File, error)
	ListFiles(userID uint) ([]models.File, error)
	GetFile(ctx context.Context, id uint, userID uint) (*models.File, error)
	Download(ctx context.Context, id uint, userID uint) (io.ReadCloser, *models.File, error)
	Delete(ctx context.Context, id uint, userID uint) error
}

type fileService struct {
	fileRepo repository.FileRepository
	storage  storage.Storage
	cache    cache.CacheService
	jobQueue JobQueue
}

// NewFileService creates a new FileService with database, storage, cache, and jobQueue dependencies.
func NewFileService(
	fileRepo repository.FileRepository,
	store storage.Storage,
	cacheService cache.CacheService,
	jobQueue JobQueue,
) FileService {
	return &fileService{
		fileRepo: fileRepo,
		storage:  store,
		cache:    cacheService,
		jobQueue: jobQueue,
	}
}

// Upload stores the file in object storage, persists its metadata, caches it, and dispatches a background job.
func (s *fileService) Upload(ctx context.Context, userID uint, filename string, reader io.Reader, size int64, mimeType string) (*models.File, error) {
	if size <= 0 {
		return nil, ErrEmptyFile
	}

	cleanFilename := filepath.Base(filename)
	if cleanFilename == "" || cleanFilename == "." {
		cleanFilename = "unnamed_file"
	}

	// Generate a unique storage key: users/{userID}/{uuid}-{cleanFilename}
	storageKey := fmt.Sprintf("users/%d/%s-%s", userID, uuid.New().String(), cleanFilename)

	// 1. Upload file bytes to MinIO
	if err := s.storage.Upload(ctx, storageKey, reader, size, mimeType); err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// 2. Persist metadata in PostgreSQL
	fileRecord := &models.File{
		UserID:     userID,
		Filename:   cleanFilename,
		StorageKey: storageKey,
		Size:       size,
		MimeType:   mimeType,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.fileRepo.Create(fileRecord); err != nil {
		// Cleanup uploaded object from storage if DB insert fails
		_ = s.storage.Delete(ctx, storageKey)
		return nil, fmt.Errorf("failed to save file metadata: %w", err)
	}

	// 3. Cache the newly created file metadata
	if s.cache != nil {
		_ = s.cache.SetFile(ctx, fileRecord, fileCacheTTL)
	}

	// 4. Dispatch job to background worker pool
	if s.jobQueue != nil {
		s.jobQueue.Enqueue(workers.Job{
			FileID:   fileRecord.ID,
			Filename: fileRecord.Filename,
			Size:     fileRecord.Size,
		})
	}

	return fileRecord, nil
}

// ListFiles returns all files belonging to the given user.
func (s *fileService) ListFiles(userID uint) ([]models.File, error) {
	return s.fileRepo.FindByUserID(userID)
}

// GetFile retrieves metadata for a file with Redis cache-aside and ownership validation.
func (s *fileService) GetFile(ctx context.Context, id uint, userID uint) (*models.File, error) {
	// 1. Check Redis Cache
	if s.cache != nil {
		if cachedFile, err := s.cache.GetFile(ctx, id); err == nil && cachedFile != nil {
			if cachedFile.UserID != userID {
				return nil, ErrAccessDenied
			}
			return cachedFile, nil
		}
	}

	// 2. Cache Miss -> Query PostgreSQL
	file, err := s.fileRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if file.UserID != userID {
		return nil, ErrAccessDenied
	}

	// 3. Populate Redis Cache for subsequent requests
	if s.cache != nil {
		_ = s.cache.SetFile(ctx, file, fileCacheTTL)
	}

	return file, nil
}

// Download returns a readable stream for the file, verifying ownership.
func (s *fileService) Download(ctx context.Context, id uint, userID uint) (io.ReadCloser, *models.File, error) {
	file, err := s.GetFile(ctx, id, userID)
	if err != nil {
		return nil, nil, err
	}

	stream, err := s.storage.Download(ctx, file.StorageKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read file from storage: %w", err)
	}

	return stream, file, nil
}

// Delete removes the storage object, database record, and invalidates Redis cache.
func (s *fileService) Delete(ctx context.Context, id uint, userID uint) error {
	file, err := s.GetFile(ctx, id, userID)
	if err != nil {
		return err
	}

	// 1. Delete object from storage
	if err := s.storage.Delete(ctx, file.StorageKey); err != nil {
		return fmt.Errorf("failed to delete file from storage: %w", err)
	}

	// 2. Delete metadata from database
	if err := s.fileRepo.Delete(file.ID); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	// 3. Invalidate Redis cache
	if s.cache != nil {
		_ = s.cache.DeleteFile(ctx, file.ID)
	}

	return nil
}
