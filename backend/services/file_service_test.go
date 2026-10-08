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

func (m *MockStorage) GetPresignedUploadURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return "http://localhost:9000/cloudbox/" + key + "?mock-presigned-put=true", nil
}

func (m *MockStorage) GetPresignedDownloadURL(ctx context.Context, key string, filename string, expiry time.Duration) (string, error) {
	return "http://localhost:9000/cloudbox/" + key + "?mock-presigned-get=true", nil
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

func (m *MockFileRepository) FindByUserIDAndFolderID(userID uint, folderID *uint) ([]models.File, error) {
	var list []models.File
	for _, f := range m.files {
		if f.UserID == userID {
			if (folderID == nil && f.FolderID == nil) || (folderID != nil && f.FolderID != nil && *f.FolderID == *folderID) {
				list = append(list, *f)
			}
		}
	}
	return list, nil
}

func (m *MockFileRepository) Search(userID uint, query string, folderID *uint, mimeType string) ([]models.File, error) {
	var list []models.File
	for _, f := range m.files {
		if f.UserID == userID && strings.Contains(strings.ToLower(f.Filename), strings.ToLower(query)) {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *MockFileRepository) GetTotalStorageUsage(userID uint) (int64, error) {
	var total int64
	for _, f := range m.files {
		if f.UserID == userID {
			total += f.Size
		}
	}
	return total, nil
}

func (m *MockFileRepository) Update(file *models.File) error {
	m.files[file.ID] = file
	return nil
}

func (m *MockFileRepository) Delete(id uint) error {
	if _, ok := m.files[id]; !ok {
		return repository.ErrFileNotFound
	}
	delete(m.files, id)
	return nil
}

func (m *MockFileRepository) FindByFolderIDs(folderIDs []uint) ([]models.File, error) {
	var list []models.File
	idMap := make(map[uint]bool)
	for _, id := range folderIDs {
		idMap[id] = true
	}
	for _, f := range m.files {
		if f.FolderID != nil && idMap[*f.FolderID] {
			list = append(list, *f)
		}
	}
	return list, nil
}

// MockJobQueue implements services.JobQueue
type MockJobQueue struct {
	EnqueuedJobs []workers.Job
}

func (q *MockJobQueue) Enqueue(job workers.Job) {
	q.EnqueuedJobs = append(q.EnqueuedJobs, job)
}

// MockCacheService implements cache.CacheService in memory
type MockCacheService struct {
	cache map[uint]*models.File
}

func newMockCacheService() *MockCacheService {
	return &MockCacheService{cache: make(map[uint]*models.File)}
}

func (c *MockCacheService) GetFile(ctx context.Context, fileID uint) (*models.File, error) {
	f, ok := c.cache[fileID]
	if !ok {
		return nil, cache.ErrCacheMiss
	}
	return f, nil
}

func (c *MockCacheService) SetFile(ctx context.Context, file *models.File, ttl time.Duration) error {
	c.cache[file.ID] = file
	return nil
}

func (c *MockCacheService) DeleteFile(ctx context.Context, fileID uint) error {
	delete(c.cache, fileID)
	return nil
}

func TestFileService_Upload_Success(t *testing.T) {
	fileRepo := newMockFileRepository()
	store := newMockStorage()
	cacheSvc := newMockCacheService()
	queue := &MockJobQueue{}

	service := services.NewFileService(fileRepo, nil, store, cacheSvc, queue)

	content := "Hello, World CloudBox!"
	reader := strings.NewReader(content)
	ctx := context.Background()

	file, err := service.Upload(ctx, 1, "test.txt", reader, int64(len(content)), "text/plain", nil)

	assert.NoError(t, err)
	assert.NotNil(t, file)
	assert.Equal(t, uint(1), file.ID)
	assert.Equal(t, "test.txt", file.Filename)
	assert.Equal(t, int64(len(content)), file.Size)

	// Verify object stored
	assert.True(t, len(store.objects[file.StorageKey]) > 0)
	// Verify cached
	cached, _ := cacheSvc.GetFile(ctx, file.ID)
	assert.NotNil(t, cached)
	// Verify enqueued job
	assert.Len(t, queue.EnqueuedJobs, 1)
}

func TestFileService_RenameAndMove(t *testing.T) {
	fileRepo := newMockFileRepository()
	store := newMockStorage()
	cacheSvc := newMockCacheService()

	service := services.NewFileService(fileRepo, nil, store, cacheSvc, nil)

	content := "Sample"
	file, err := service.Upload(context.Background(), 1, "old.txt", strings.NewReader(content), int64(len(content)), "text/plain", nil)
	assert.NoError(t, err)

	// Rename
	renamed, err := service.RenameFile(context.Background(), file.ID, 1, "new.txt")
	assert.NoError(t, err)
	assert.Equal(t, "new.txt", renamed.Filename)

	// Move to folder 5
	folderID := uint(5)
	moved, err := service.MoveFile(context.Background(), file.ID, 1, &folderID)
	assert.NoError(t, err)
	assert.Equal(t, &folderID, moved.FolderID)

	// Check access denied for other user
	_, err = service.RenameFile(context.Background(), file.ID, 2, "hacked.txt")
	assert.ErrorIs(t, err, services.ErrAccessDenied)
}

func TestFileService_StorageUsage(t *testing.T) {
	fileRepo := newMockFileRepository()
	store := newMockStorage()
	service := services.NewFileService(fileRepo, nil, store, nil, nil)

	// Upload two files
	_, _ = service.Upload(context.Background(), 1, "a.txt", strings.NewReader("12345"), 5, "text/plain", nil)
	_, _ = service.Upload(context.Background(), 1, "b.txt", strings.NewReader("12345"), 5, "text/plain", nil)

	usage, err := service.GetStorageUsage(context.Background(), 1)
	assert.NoError(t, err)
	assert.Equal(t, int64(10), usage.Used)
	assert.Equal(t, int64(services.DefaultUserQuotaBytes), usage.Limit)
	assert.True(t, usage.Percentage >= 0)
}
