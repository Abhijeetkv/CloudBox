package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"cloudbox/cache"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/storage"
)

var (
	ErrShareExpired = errors.New("share link has expired")
)

// SharedFileResult contains file metadata and a short-lived presigned URL.
type SharedFileResult struct {
	ShareID     uint       `json:"share_id"`
	FileID      uint       `json:"file_id"`
	Filename    string     `json:"filename"`
	Size        int64      `json:"size"`
	MimeType    string     `json:"mime_type"`
	DownloadURL string     `json:"download_url"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

// ShareService defines operations for managing public/temporary file shares.
type ShareService interface {
	CreateShare(ctx context.Context, userID uint, fileID uint, expiresInHours int) (*models.Share, error)
	GetShare(ctx context.Context, token string) (*SharedFileResult, error)
	ListShares(ctx context.Context, userID uint) ([]models.Share, error)
	RevokeShare(ctx context.Context, id uint, userID uint) error
}

type shareService struct {
	shareRepo repository.ShareRepository
	fileRepo  repository.FileRepository
	storage   storage.Storage
	cache     cache.CacheService
}

// NewShareService creates a new ShareService.
func NewShareService(
	shareRepo repository.ShareRepository,
	fileRepo repository.FileRepository,
	store storage.Storage,
	cacheService cache.CacheService,
) ShareService {
	return &shareService{
		shareRepo: shareRepo,
		fileRepo:  fileRepo,
		storage:   store,
		cache:     cacheService,
	}
}

func generateSecureToken(byteLength int) (string, error) {
	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateShare generates a secure random token and creates a share record for an owned file.
func (s *shareService) CreateShare(ctx context.Context, userID uint, fileID uint, expiresInHours int) (*models.Share, error) {
	// Verify file ownership
	file, err := s.fileRepo.FindByIDAndUserID(fileID, userID)
	if err != nil {
		return nil, err
	}
	if file.UserID != userID {
		return nil, ErrAccessDenied
	}

	token, err := generateSecureToken(24) // 48-char random hex string
	if err != nil {
		return nil, fmt.Errorf("failed to generate secure token: %w", err)
	}

	var expiresAt *time.Time
	if expiresInHours > 0 {
		exp := time.Now().Add(time.Duration(expiresInHours) * time.Hour)
		expiresAt = &exp
	}

	share := &models.Share{
		FileID:    fileID,
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.shareRepo.Create(share); err != nil {
		return nil, err
	}

	share.File = file
	return share, nil
}

// GetShare resolves a public share token, verifies expiration, and returns a short-lived download URL.
func (s *shareService) GetShare(ctx context.Context, token string) (*SharedFileResult, error) {
	share, err := s.shareRepo.FindByToken(token)
	if err != nil {
		return nil, err
	}

	if share.IsExpired() {
		return nil, ErrShareExpired
	}

	if share.File == nil {
		file, err := s.fileRepo.FindByID(share.FileID)
		if err != nil {
			return nil, err
		}
		share.File = file
	}

	// Generate short-lived presigned URL (15 minutes) for the shared file
	downloadURL, err := s.storage.GetPresignedDownloadURL(ctx, share.File.StorageKey, share.File.Filename, 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("failed to generate download URL: %w", err)
	}

	return &SharedFileResult{
		ShareID:     share.ID,
		FileID:      share.File.ID,
		Filename:    share.File.Filename,
		Size:        share.File.Size,
		MimeType:    share.File.MimeType,
		DownloadURL: downloadURL,
		ExpiresAt:   share.ExpiresAt,
	}, nil
}

// ListShares returns all shares created by a user.
func (s *shareService) ListShares(ctx context.Context, userID uint) ([]models.Share, error) {
	return s.shareRepo.FindByUserID(userID)
}

// RevokeShare removes a share record, verifying owner.
func (s *shareService) RevokeShare(ctx context.Context, id uint, userID uint) error {
	share, err := s.shareRepo.FindByIDAndUserID(id, userID)
	if err != nil {
		return err
	}
	if share.UserID != userID {
		return ErrAccessDenied
	}

	return s.shareRepo.Delete(share.ID)
}
