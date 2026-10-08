package services_test

import (
	"context"
	"testing"
	"time"

	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/services"

	"github.com/stretchr/testify/assert"
)

type MockShareRepository struct {
	shares map[uint]*models.Share
	nextID uint
}

func newMockShareRepository() *MockShareRepository {
	return &MockShareRepository{shares: make(map[uint]*models.Share)}
}

func (m *MockShareRepository) Create(s *models.Share) error {
	m.nextID++
	s.ID = m.nextID
	m.shares[s.ID] = s
	return nil
}

func (m *MockShareRepository) FindByToken(token string) (*models.Share, error) {
	for _, s := range m.shares {
		if s.Token == token {
			return s, nil
		}
	}
	return nil, repository.ErrShareNotFound
}

func (m *MockShareRepository) FindByIDAndUserID(id uint, userID uint) (*models.Share, error) {
	s, ok := m.shares[id]
	if !ok || s.UserID != userID {
		return nil, repository.ErrShareNotFound
	}
	return s, nil
}

func (m *MockShareRepository) FindByUserID(userID uint) ([]models.Share, error) {
	var list []models.Share
	for _, s := range m.shares {
		if s.UserID == userID {
			list = append(list, *s)
		}
	}
	return list, nil
}

func (m *MockShareRepository) FindByFileID(fileID uint) ([]models.Share, error) {
	var list []models.Share
	for _, s := range m.shares {
		if s.FileID == fileID {
			list = append(list, *s)
		}
	}
	return list, nil
}

func (m *MockShareRepository) Delete(id uint) error {
	delete(m.shares, id)
	return nil
}

func (m *MockShareRepository) DeleteByFileID(fileID uint) error {
	for id, s := range m.shares {
		if s.FileID == fileID {
			delete(m.shares, id)
		}
	}
	return nil
}

func TestShareService_CreateAndGet(t *testing.T) {
	shareRepo := newMockShareRepository()
	fileRepo := newMockFileRepository()
	store := newMockStorage()

	file := &models.File{
		UserID:     1,
		Filename:   "shared-report.pdf",
		StorageKey: "users/1/files/abc/shared-report.pdf",
		Size:       1024,
		MimeType:   "application/pdf",
	}
	_ = fileRepo.Create(file)

	svc := services.NewShareService(shareRepo, fileRepo, store, nil)

	// Create share with 24h expiration
	share, err := svc.CreateShare(context.Background(), 1, file.ID, 24)
	assert.NoError(t, err)
	assert.NotEmpty(t, share.Token)
	assert.NotNil(t, share.ExpiresAt)

	// Resolve public share by token
	result, err := svc.GetShare(context.Background(), share.Token)
	assert.NoError(t, err)
	assert.Equal(t, file.Filename, result.Filename)
	assert.NotEmpty(t, result.DownloadURL)

	// Verify expiration logic
	past := time.Now().Add(-1 * time.Hour)
	expiredShare := &models.Share{
		FileID:    file.ID,
		UserID:    1,
		Token:     "expired-token-123",
		ExpiresAt: &past,
	}
	_ = shareRepo.Create(expiredShare)

	_, err = svc.GetShare(context.Background(), "expired-token-123")
	assert.ErrorIs(t, err, services.ErrShareExpired)
}
