package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"cloudbox/config"
	"cloudbox/handlers"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/routes"
	"cloudbox/services"
	"cloudbox/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

// Mock storage for handler tests
type mockStorageHandler struct {
	data map[string][]byte
}

func (m *mockStorageHandler) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	b, err := io.ReadAll(reader)
	if err != nil {
		return err
	}
	m.data[key] = b
	return nil
}

func (m *mockStorageHandler) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	b, ok := m.data[key]
	if !ok {
		return nil, repository.ErrFileNotFound
	}
	return io.NopCloser(bytes.NewReader(b)), nil
}

func (m *mockStorageHandler) Delete(ctx context.Context, key string) error {
	delete(m.data, key)
	return nil
}

func (m *mockStorageHandler) GetPresignedUploadURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return "http://localhost:9000/cloudbox/" + key + "?mock-put", nil
}

func (m *mockStorageHandler) GetPresignedDownloadURL(ctx context.Context, key string, filename string, expiry time.Duration) (string, error) {
	return "http://localhost:9000/cloudbox/" + key + "?mock-get", nil
}

// Mock file repo for handler tests
type mockFileRepoHandler struct {
	files  map[uint]*models.File
	nextID uint
}

func (m *mockFileRepoHandler) Create(file *models.File) error {
	m.nextID++
	file.ID = m.nextID
	m.files[file.ID] = file
	return nil
}

func (m *mockFileRepoHandler) FindByID(id uint) (*models.File, error) {
	f, ok := m.files[id]
	if !ok {
		return nil, repository.ErrFileNotFound
	}
	return f, nil
}

func (m *mockFileRepoHandler) FindByUserID(userID uint) ([]models.File, error) {
	var list []models.File
	for _, f := range m.files {
		if f.UserID == userID {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *mockFileRepoHandler) FindByIDAndUserID(id uint, userID uint) (*models.File, error) {
	f, ok := m.files[id]
	if !ok || f.UserID != userID {
		return nil, repository.ErrFileNotFound
	}
	return f, nil
}

func (m *mockFileRepoHandler) FindByUserIDAndFolderID(userID uint, folderID *uint) ([]models.File, error) {
	var list []models.File
	for _, f := range m.files {
		if f.UserID == userID {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *mockFileRepoHandler) Search(userID uint, query string, folderID *uint, mimeType string) ([]models.File, error) {
	var list []models.File
	for _, f := range m.files {
		if f.UserID == userID && strings.Contains(strings.ToLower(f.Filename), strings.ToLower(query)) {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *mockFileRepoHandler) GetTotalStorageUsage(userID uint) (int64, error) {
	var total int64
	for _, f := range m.files {
		if f.UserID == userID {
			total += f.Size
		}
	}
	return total, nil
}

func (m *mockFileRepoHandler) Update(file *models.File) error {
	m.files[file.ID] = file
	return nil
}

func (m *mockFileRepoHandler) Delete(id uint) error {
	if _, ok := m.files[id]; !ok {
		return repository.ErrFileNotFound
	}
	delete(m.files, id)
	return nil
}

func (m *mockFileRepoHandler) FindByFolderIDs(folderIDs []uint) ([]models.File, error) {
	return nil, nil
}

// Mock folder repo for handler tests
type mockFolderRepoHandler struct {
	folders map[uint]*models.Folder
	nextID  uint
}

func (m *mockFolderRepoHandler) Create(f *models.Folder) error {
	m.nextID++
	f.ID = m.nextID
	m.folders[f.ID] = f
	return nil
}

func (m *mockFolderRepoHandler) FindByID(id uint) (*models.Folder, error) {
	f, ok := m.folders[id]
	if !ok {
		return nil, repository.ErrFolderNotFound
	}
	return f, nil
}

func (m *mockFolderRepoHandler) FindByIDAndUserID(id uint, userID uint) (*models.Folder, error) {
	f, ok := m.folders[id]
	if !ok || f.UserID != userID {
		return nil, repository.ErrFolderNotFound
	}
	return f, nil
}

func (m *mockFolderRepoHandler) FindByUserIDAndParentID(userID uint, parentID *uint) ([]models.Folder, error) {
	var list []models.Folder
	for _, f := range m.folders {
		if f.UserID == userID {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *mockFolderRepoHandler) FindAllByUserID(userID uint) ([]models.Folder, error) {
	var list []models.Folder
	for _, f := range m.folders {
		if f.UserID == userID {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *mockFolderRepoHandler) Update(f *models.Folder) error {
	m.folders[f.ID] = f
	return nil
}

func (m *mockFolderRepoHandler) Delete(id uint) error {
	delete(m.folders, id)
	return nil
}

func (m *mockFolderRepoHandler) GetDescendantFolderIDs(userID uint, folderID uint) ([]uint, error) {
	return nil, nil
}

// Mock share repo for handler tests
type mockShareRepoHandler struct {
	shares map[uint]*models.Share
	nextID uint
}

func (m *mockShareRepoHandler) Create(s *models.Share) error {
	m.nextID++
	s.ID = m.nextID
	m.shares[s.ID] = s
	return nil
}

func (m *mockShareRepoHandler) FindByToken(token string) (*models.Share, error) {
	for _, s := range m.shares {
		if s.Token == token {
			return s, nil
		}
	}
	return nil, repository.ErrShareNotFound
}

func (m *mockShareRepoHandler) FindByIDAndUserID(id uint, userID uint) (*models.Share, error) {
	s, ok := m.shares[id]
	if !ok || s.UserID != userID {
		return nil, repository.ErrShareNotFound
	}
	return s, nil
}

func (m *mockShareRepoHandler) FindByUserID(userID uint) ([]models.Share, error) {
	var list []models.Share
	for _, s := range m.shares {
		if s.UserID == userID {
			list = append(list, *s)
		}
	}
	return list, nil
}

func (m *mockShareRepoHandler) FindByFileID(fileID uint) ([]models.Share, error) {
	return nil, nil
}

func (m *mockShareRepoHandler) Delete(id uint) error {
	delete(m.shares, id)
	return nil
}

func (m *mockShareRepoHandler) DeleteByFileID(fileID uint) error {
	return nil
}

func setupFullTestRouter() (*gin.Engine, string, string) {
	jwtSecret := "test-secret-12345"
	cfg := &config.Config{
		AppPort:   "8080",
		JWTSecret: jwtSecret,
	}
	logger := zap.NewNop()

	userRepo := newMockUserRepo()
	authService := services.NewAuthService(userRepo, jwtSecret)
	authHandler := handlers.NewAuthHandler(authService, logger)

	fileRepo := &mockFileRepoHandler{files: make(map[uint]*models.File)}
	folderRepo := &mockFolderRepoHandler{folders: make(map[uint]*models.Folder)}
	shareRepo := &mockShareRepoHandler{shares: make(map[uint]*models.Share)}
	store := &mockStorageHandler{data: make(map[string][]byte)}

	fileService := services.NewFileService(fileRepo, folderRepo, store, nil, nil)
	folderService := services.NewFolderService(folderRepo, fileRepo, store, nil)
	shareService := services.NewShareService(shareRepo, fileRepo, store, nil)

	fileHandler := handlers.NewFileHandler(fileService, logger)
	folderHandler := handlers.NewFolderHandler(folderService, logger)
	shareHandler := handlers.NewShareHandler(shareService, logger)
	storageHandler := handlers.NewStorageHandler(fileService, logger)

	router := routes.SetupRouter(cfg, logger, nil, authHandler, fileHandler, folderHandler, shareHandler, storageHandler)

	user1Token, _ := utils.GenerateToken(1, "user1@example.com", jwtSecret, time.Hour)
	user2Token, _ := utils.GenerateToken(2, "user2@example.com", jwtSecret, time.Hour)

	return router, user1Token, user2Token
}

func TestFileEndpoints_FullFlow(t *testing.T) {
	router, user1Token, user2Token := setupFullTestRouter()

	// 1. Upload File as User 1
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "document.pdf")
	assert.NoError(t, err)
	_, _ = part.Write([]byte("%PDF-1.4 Mock PDF Content"))
	_ = writer.Close()

	req, _ := http.NewRequest(http.MethodPost, "/api/files", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var uploadResp struct {
		Success bool `json:"success"`
		Data    struct {
			ID       uint   `json:"id"`
			Filename string `json:"filename"`
		} `json:"data"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &uploadResp)
	assert.NoError(t, err)
	assert.True(t, uploadResp.Success)
	fileID := uploadResp.Data.ID
	assert.Equal(t, "document.pdf", uploadResp.Data.Filename)

	// 2. User 1 gets metadata -> 200 OK
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 3. User 2 attempts to get metadata for User 1's file -> 403 Forbidden
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1", nil)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)

	// 4. User 1 creates folder
	folderBody := bytes.NewBufferString(`{"name":"My Folder"}`)
	req, _ = http.NewRequest(http.MethodPost, "/api/folders", folderBody)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// 5. User 1 renames file
	renameBody := bytes.NewBufferString(`{"filename":"renamed_doc.pdf"}`)
	req, _ = http.NewRequest(http.MethodPatch, "/api/files/1", renameBody)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 6. User 1 downloads file -> 200 OK
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1/download", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Disposition"), "attachment")

	// 7. User 1 deletes file -> 200 OK
	req, _ = http.NewRequest(http.MethodDelete, "/api/files/1", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 8. Confirm file is gone -> 404 Not Found
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)

	_ = fileID
}
