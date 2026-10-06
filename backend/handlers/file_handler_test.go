package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
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

func (m *mockFileRepoHandler) Delete(id uint) error {
	if _, ok := m.files[id]; !ok {
		return repository.ErrFileNotFound
	}
	delete(m.files, id)
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
	store := &mockStorageHandler{data: make(map[string][]byte)}
	fileService := services.NewFileService(fileRepo, store, nil, nil)
	fileHandler := handlers.NewFileHandler(fileService, logger)

	router := routes.SetupRouter(cfg, logger, nil, authHandler, fileHandler)

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
		File    struct {
			ID       uint   `json:"id"`
			Filename string `json:"filename"`
		} `json:"file"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &uploadResp)
	assert.NoError(t, err)
	assert.True(t, uploadResp.Success)
	assert.Equal(t, "document.pdf", uploadResp.File.Filename)
	fileID := uploadResp.File.ID

	// 2. List Files as User 1
	req, _ = http.NewRequest(http.MethodGet, "/api/files", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "document.pdf")

	// 3. User 2 List Files -> empty
	req, _ = http.NewRequest(http.MethodGet, "/api/files", nil)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotContains(t, w.Body.String(), "document.pdf")

	// 4. Download as User 1 (Owner) -> 200 OK
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1/download", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "%PDF-1.4 Mock PDF Content", w.Body.String())

	// 5. Download as User 2 (Cross-User Access) -> 403 Forbidden!
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1/download", nil)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "access denied")

	// 6. Delete as User 2 -> 403 Forbidden
	req, _ = http.NewRequest(http.MethodDelete, "/api/files/1", nil)
	req.Header.Set("Authorization", "Bearer "+user2Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)

	// 7. Delete as User 1 (Owner) -> 200 OK
	req, _ = http.NewRequest(http.MethodDelete, "/api/files/1", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 8. Download after deletion -> 404 Not Found
	req, _ = http.NewRequest(http.MethodGet, "/api/files/1/download", nil)
	req.Header.Set("Authorization", "Bearer "+user1Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
	_ = fileID
}
