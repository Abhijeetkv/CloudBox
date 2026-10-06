package services_test

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"
	"time"

	"cloudbox/cache"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/services"
	"cloudbox/workers"

	"github.com/stretchr/testify/assert"
)

// MockStorage implements storage.Storage in memory
type MockStorage struct {
	objects map[string][]byte
}

func newMockStorage() *MockStorage {
	return &MockStorage{objects: make(map[string][]byte)}
}

func (m *MockStorage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	data, err := io.ReadAll(reader)
	if err != nil {
		return err
	}
	m.objects[key] = data
	return nil
}

func (m *MockStorage) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	data, ok := m.objects[key]
	if !ok {
		return nil, repository.ErrFileNotFound
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}

func (m *MockStorage) Delete(ctx context.Context, key string) error {
	delete(m.objects, key)
	return nil
}

// MockFileRepository implements repository.FileRepository in memory
type MockFileRepository struct {
	files  map[uint]*models.File
	nextID uint
}

func newMockFileRepository() *MockFileRepository {
	return &MockFileRepository{files: make(map[uint]*models.File)}
}

func (m *MockFileRepository) Create(file *models.File) error {
	m.nextID++
	file.ID = m.nextID
	m.files[file.ID] = file
	return nil
}

func (m *MockFileRepository) FindByID(id uint) (*models.File, error) {
	f, ok := m.files[id]
	if !ok {
		return nil, repository.ErrFileNotFound
	}
	return f, nil
}

func (m *MockFileRepository) FindByUserID(userID uint) ([]models.File, error) {
	var userFiles []models.File
	for _, f := range m.files {
		if f.UserID == userID {
			userFiles = append(userFiles, *f)
		}
	}
	return userFiles, nil
}

func (m *MockFileRepository) FindByIDAndUserID(id uint, userID uint) (*models.File, error) {
	f, ok := m.files[id]
	if !ok || f.UserID != userID {
		return nil, repository.ErrFileNotFound
	}
	return f, nil
}

func (m *MockFileRepository) Delete(id uint) error {
	if _, ok := m.files[id]; !ok {
		return repository.ErrFileNotFound
	}
	delete(m.files, id)
	return nil
}

// MockCacheService implements cache.CacheService in memory
type MockCacheService struct {
	store map[uint]*models.File
}

func newMockCacheService() *MockCacheService {
	return &MockCacheService{store: make(map[uint]*models.File)}
}

func (m *MockCacheService) GetFile(ctx context.Context, fileID uint) (*models.File, error) {
	f, ok := m.store[fileID]
	if !ok {
		return nil, cache.ErrCacheMiss
	}
	return f, nil
}

func (m *MockCacheService) SetFile(ctx context.Context, file *models.File, ttl time.Duration) error {
	if file != nil {
		m.store[file.ID] = file
	}
	return nil
}

func (m *MockCacheService) DeleteFile(ctx context.Context, fileID uint) error {
	delete(m.store, fileID)
	return nil
}

// MockJobQueue tracks enqueued background jobs
type MockJobQueue struct {
	jobs []workers.Job
}

func (q *MockJobQueue) Enqueue(job workers.Job) {
	q.jobs = append(q.jobs, job)
}

func TestFileService_Operations(t *testing.T) {
	ctx := context.Background()
	mockStore := newMockStorage()
	mockRepo := newMockFileRepository()
	mockCache := newMockCacheService()
	mockQueue := &MockJobQueue{}
	fileService := services.NewFileService(mockRepo, mockStore, mockCache, mockQueue)

	userID := uint(1)
	otherUserID := uint(2)
	content := "Hello CloudBox Storage!"

	// 1. Upload File
	reader := strings.NewReader(content)
	file, err := fileService.Upload(ctx, userID, "hello.txt", reader, int64(len(content)), "text/plain")
	assert.NoError(t, err)
	assert.NotNil(t, file)
	assert.Equal(t, "hello.txt", file.Filename)
	assert.Equal(t, userID, file.UserID)
	assert.NotEmpty(t, file.StorageKey)

	// Verify background job was enqueued
	assert.Len(t, mockQueue.jobs, 1)
	assert.Equal(t, file.ID, mockQueue.jobs[0].FileID)
	assert.Equal(t, "hello.txt", mockQueue.jobs[0].Filename)

	// Verify cached on upload
	cachedOnUpload, err := mockCache.GetFile(ctx, file.ID)
	assert.NoError(t, err)
	assert.Equal(t, file.ID, cachedOnUpload.ID)

	// 2. Reject Empty File
	_, err = fileService.Upload(ctx, userID, "empty.txt", strings.NewReader(""), 0, "text/plain")
	assert.ErrorIs(t, err, services.ErrEmptyFile)

	// 3. List Files
	files, err := fileService.ListFiles(userID)
	assert.NoError(t, err)
	assert.Len(t, files, 1)

	// 4. Get File (Owner) -> Cache Hit
	fetched, err := fileService.GetFile(ctx, file.ID, userID)
	assert.NoError(t, err)
	assert.Equal(t, file.ID, fetched.ID)

	// 5. Get File (Other User -> Access Denied even with cached file)
	_, err = fileService.GetFile(ctx, file.ID, otherUserID)
	assert.ErrorIs(t, err, services.ErrAccessDenied)

	// 6. Download File (Owner)
	stream, dlFile, err := fileService.Download(ctx, file.ID, userID)
	assert.NoError(t, err)
	assert.Equal(t, file.Filename, dlFile.Filename)
	downloadedBytes, err := io.ReadAll(stream)
	assert.NoError(t, err)
	assert.Equal(t, content, string(downloadedBytes))
	_ = stream.Close()

	// 7. Download File (Other User -> Access Denied)
	_, _, err = fileService.Download(ctx, file.ID, otherUserID)
	assert.ErrorIs(t, err, services.ErrAccessDenied)

	// 8. Delete File (Other User -> Access Denied)
	err = fileService.Delete(ctx, file.ID, otherUserID)
	assert.ErrorIs(t, err, services.ErrAccessDenied)

	// 9. Delete File (Owner) -> Invalidates Cache
	err = fileService.Delete(ctx, file.ID, userID)
	assert.NoError(t, err)

	// Verify cache is invalidated
	_, err = mockCache.GetFile(ctx, file.ID)
	assert.ErrorIs(t, err, cache.ErrCacheMiss)

	// 10. Verify File is gone from DB
	_, err = fileService.GetFile(ctx, file.ID, userID)
	assert.ErrorIs(t, err, repository.ErrFileNotFound)
}
