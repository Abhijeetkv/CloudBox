package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"cloudbox/cache"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/storage"
	"cloudbox/workers"

	"github.com/google/uuid"
)

var (
	ErrAccessDenied         = errors.New("access denied: you do not own this file")
	ErrEmptyFile            = errors.New("cannot upload an empty file")
	ErrInvalidFileName      = errors.New("invalid file name")
	ErrStorageQuotaExceeded = errors.New("storage quota exceeded (50 GB limit)")
)

const (
	fileCacheTTL         = 15 * time.Minute
	DefaultUserQuotaBytes = 50 * 1024 * 1024 * 1024 // 50 GB
	PresignedExpiry      = 15 * time.Minute
)

// JobQueue defines the contract for dispatching background worker jobs.
type JobQueue interface {
	Enqueue(job workers.Job)
}

// PresignedUploadResult holds the generated presigned PUT URL and storage key.
type PresignedUploadResult struct {
	UploadURL  string `json:"upload_url"`
	StorageKey string `json:"storage_key"`
	Filename   string `json:"filename"`
}

// StorageUsageResult represents the storage space used by a user.
type StorageUsageResult struct {
	Used       int64   `json:"used"`
	Limit      int64   `json:"limit"`
	Percentage float64 `json:"percentage"`
}

// FileService defines business operations for file management.
type FileService interface {
	Upload(ctx context.Context, userID uint, filename string, reader io.Reader, size int64, mimeType string, folderID *uint) (*models.File, error)
	ListFiles(userID uint, folderID *uint) ([]models.File, error)
	SearchFiles(userID uint, query string, folderID *uint, mimeType string) ([]models.File, error)
	GetFile(ctx context.Context, id uint, userID uint) (*models.File, error)
	RenameFile(ctx context.Context, id uint, userID uint, newFilename string) (*models.File, error)
	MoveFile(ctx context.Context, id uint, userID uint, newFolderID *uint) (*models.File, error)
	Download(ctx context.Context, id uint, userID uint) (io.ReadCloser, *models.File, error)
	GetPresignedUploadURL(ctx context.Context, userID uint, filename string, size int64, mimeType string, folderID *uint) (*PresignedUploadResult, error)
	ConfirmUpload(ctx context.Context, userID uint, filename string, storageKey string, size int64, mimeType string, folderID *uint) (*models.File, error)
	GetPresignedDownloadURL(ctx context.Context, id uint, userID uint) (string, *models.File, error)
	Delete(ctx context.Context, id uint, userID uint) error
	GetStorageUsage(ctx context.Context, userID uint) (*StorageUsageResult, error)
}

type fileService struct {
	fileRepo   repository.FileRepository
	folderRepo repository.FolderRepository
	storage    storage.Storage
	cache      cache.CacheService
	jobQueue   JobQueue
	quotaLimit int64
}

// NewFileService creates a new FileService.
func NewFileService(
	fileRepo repository.FileRepository,
	folderRepo repository.FolderRepository,
	store storage.Storage,
	cacheService cache.CacheService,
	jobQueue JobQueue,
) FileService {
	return &fileService{
		fileRepo:   fileRepo,
		folderRepo: folderRepo,
		storage:    store,
		cache:      cacheService,
		jobQueue:   jobQueue,
		quotaLimit: DefaultUserQuotaBytes,
	}
}

func sanitizeFilename(name string) string {
	clean := filepath.Base(strings.TrimSpace(name))
	if clean == "" || clean == "." || clean == "/" {
		clean = "unnamed_file"
	}
	return clean
}

// checkQuota verifies if the user has enough storage available.
func (s *fileService) checkQuota(userID uint, additionalBytes int64) error {
	used, err := s.fileRepo.GetTotalStorageUsage(userID)
	if err != nil {
		return err
	}
	if used+additionalBytes > s.quotaLimit {
		return ErrStorageQuotaExceeded
	}
	return nil
}

// Upload stores the file in object storage, persists its metadata, caches it, and dispatches a background job.
func (s *fileService) Upload(ctx context.Context, userID uint, filename string, reader io.Reader, size int64, mimeType string, folderID *uint) (*models.File, error) {
	if size <= 0 {
		return nil, ErrEmptyFile
	}

	if err := s.checkQuota(userID, size); err != nil {
		return nil, err
	}

	cleanFilename := sanitizeFilename(filename)

	// Validate folder ownership if provided
	if folderID != nil && s.folderRepo != nil {
		folder, err := s.folderRepo.FindByIDAndUserID(*folderID, userID)
		if err != nil || folder.UserID != userID {
			return nil, ErrAccessDenied
		}
	}

	// Generate a unique storage key: users/{userID}/files/{uuid}/{cleanFilename}
	storageKey := fmt.Sprintf("users/%d/files/%s/%s", userID, uuid.New().String(), cleanFilename)

	// 1. Upload file bytes to MinIO
	if err := s.storage.Upload(ctx, storageKey, reader, size, mimeType); err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// 2. Persist metadata in PostgreSQL
	fileRecord := &models.File{
		UserID:     userID,
		FolderID:   folderID,
		Filename:   cleanFilename,
		StorageKey: storageKey,
		Size:       size,
		MimeType:   mimeType,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.fileRepo.Create(fileRecord); err != nil {
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

// GetPresignedUploadURL creates a presigned upload URL directly to MinIO, checking quota first.
func (s *fileService) GetPresignedUploadURL(ctx context.Context, userID uint, filename string, size int64, mimeType string, folderID *uint) (*PresignedUploadResult, error) {
	if size <= 0 {
		return nil, ErrEmptyFile
	}

	if err := s.checkQuota(userID, size); err != nil {
		return nil, err
	}

	cleanFilename := sanitizeFilename(filename)

	if folderID != nil && s.folderRepo != nil {
		folder, err := s.folderRepo.FindByIDAndUserID(*folderID, userID)
		if err != nil || folder.UserID != userID {
			return nil, ErrAccessDenied
		}
	}

	storageKey := fmt.Sprintf("users/%d/files/%s/%s", userID, uuid.New().String(), cleanFilename)

	uploadURL, err := s.storage.GetPresignedUploadURL(ctx, storageKey, PresignedExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned upload URL: %w", err)
	}

	return &PresignedUploadResult{
		UploadURL:  uploadURL,
		StorageKey: storageKey,
		Filename:   cleanFilename,
	}, nil
}

// ConfirmUpload saves metadata in PostgreSQL after direct client upload to MinIO.
func (s *fileService) ConfirmUpload(ctx context.Context, userID uint, filename string, storageKey string, size int64, mimeType string, folderID *uint) (*models.File, error) {
	cleanFilename := sanitizeFilename(filename)

	fileRecord := &models.File{
		UserID:     userID,
		FolderID:   folderID,
		Filename:   cleanFilename,
		StorageKey: storageKey,
		Size:       size,
		MimeType:   mimeType,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.fileRepo.Create(fileRecord); err != nil {
		return nil, fmt.Errorf("failed to save confirmed file metadata: %w", err)
	}

	if s.cache != nil {
		_ = s.cache.SetFile(ctx, fileRecord, fileCacheTTL)
	}

	if s.jobQueue != nil {
		s.jobQueue.Enqueue(workers.Job{
			FileID:   fileRecord.ID,
			Filename: fileRecord.Filename,
			Size:     fileRecord.Size,
		})
	}

	return fileRecord, nil
}

// ListFiles returns all files belonging to the given user inside folderID (or all files if folderID is nil).
func (s *fileService) ListFiles(userID uint, folderID *uint) ([]models.File, error) {
	return s.fileRepo.FindByUserIDAndFolderID(userID, folderID)
}

// SearchFiles finds files matching a search query.
func (s *fileService) SearchFiles(userID uint, query string, folderID *uint, mimeType string) ([]models.File, error) {
	return s.fileRepo.Search(userID, strings.TrimSpace(query), folderID, strings.TrimSpace(mimeType))
}

// GetFile retrieves metadata for a file with Redis cache-aside and ownership validation.
func (s *fileService) GetFile(ctx context.Context, id uint, userID uint) (*models.File, error) {
	if s.cache != nil {
		if cachedFile, err := s.cache.GetFile(ctx, id); err == nil && cachedFile != nil {
			if cachedFile.UserID != userID {
				return nil, ErrAccessDenied
			}
			return cachedFile, nil
		}
	}

	file, err := s.fileRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if file.UserID != userID {
		return nil, ErrAccessDenied
	}

	if s.cache != nil {
		_ = s.cache.SetFile(ctx, file, fileCacheTTL)
	}

	return file, nil
}

// RenameFile changes the file's filename and invalidates Redis cache.
func (s *fileService) RenameFile(ctx context.Context, id uint, userID uint, newFilename string) (*models.File, error) {
	cleanName := sanitizeFilename(newFilename)
	if cleanName == "" {
		return nil, ErrInvalidFileName
	}

	file, err := s.GetFile(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	file.Filename = cleanName
	file.UpdatedAt = time.Now()

	if err := s.fileRepo.Update(file); err != nil {
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.SetFile(ctx, file, fileCacheTTL)
	}

	return file, nil
}

// MoveFile relocates a file to a new folder (or root if newFolderID is nil).
func (s *fileService) MoveFile(ctx context.Context, id uint, userID uint, newFolderID *uint) (*models.File, error) {
	file, err := s.GetFile(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if newFolderID != nil && s.folderRepo != nil {
		folder, err := s.folderRepo.FindByIDAndUserID(*newFolderID, userID)
		if err != nil || folder.UserID != userID {
			return nil, ErrAccessDenied
		}
	}

	file.FolderID = newFolderID
	file.UpdatedAt = time.Now()

	if err := s.fileRepo.Update(file); err != nil {
		return nil, err
	}

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

// GetPresignedDownloadURL generates a short-lived presigned URL for direct download.
func (s *fileService) GetPresignedDownloadURL(ctx context.Context, id uint, userID uint) (string, *models.File, error) {
	file, err := s.GetFile(ctx, id, userID)
	if err != nil {
		return "", nil, err
	}

	presignedURL, err := s.storage.GetPresignedDownloadURL(ctx, file.StorageKey, file.Filename, PresignedExpiry)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate download URL: %w", err)
	}

	return presignedURL, file, nil
}

// Delete removes the storage object, database record, and invalidates Redis cache.
func (s *fileService) Delete(ctx context.Context, id uint, userID uint) error {
	file, err := s.GetFile(ctx, id, userID)
	if err != nil {
		return err
	}

	if err := s.storage.Delete(ctx, file.StorageKey); err != nil {
		return fmt.Errorf("failed to delete file from storage: %w", err)
	}

	if err := s.fileRepo.Delete(file.ID); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	if s.cache != nil {
		_ = s.cache.DeleteFile(ctx, file.ID)
	}

	return nil
}

// GetStorageUsage computes the user's current storage consumption vs limit.
func (s *fileService) GetStorageUsage(ctx context.Context, userID uint) (*StorageUsageResult, error) {
	used, err := s.fileRepo.GetTotalStorageUsage(userID)
	if err != nil {
		return nil, err
	}

	percentage := 0.0
	if s.quotaLimit > 0 {
		percentage = (float64(used) / float64(s.quotaLimit)) * 100
		if percentage > 100 {
			percentage = 100
		}
	}

	return &StorageUsageResult{
		Used:       used,
		Limit:      s.quotaLimit,
		Percentage: percentage,
	}, nil
}
