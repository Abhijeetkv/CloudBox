package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"cloudbox/config"
	"cloudbox/handlers"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/routes"
	"cloudbox/services"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

// In-memory user repository for testing
type mockUserRepo struct {
	users map[string]*models.User
	seq   uint
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*models.User)}
}

func (m *mockUserRepo) Create(user *models.User) error {
	m.seq++
	user.ID = m.seq
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepo) FindByEmail(email string) (*models.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, repository.ErrUserNotFound
	}
	return u, nil
}

func (m *mockUserRepo) FindByID(id uint) (*models.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, repository.ErrUserNotFound
}

func setupTestApp() (*config.Config, *handlers.AuthHandler, *handlers.FileHandler) {
	cfg := &config.Config{
		AppPort:   "8080",
		JWTSecret: "test-secret-12345",
	}
	logger := zap.NewNop()
	repo := newMockUserRepo()
	authService := services.NewAuthService(repo, cfg.JWTSecret)
	authHandler := handlers.NewAuthHandler(authService, logger)
	return cfg, authHandler, nil
}

func TestAuthEndpoints(t *testing.T) {
	cfg, authHandler, fileHandler := setupTestApp()
	router := routes.SetupRouter(cfg, zap.NewNop(), nil, authHandler, fileHandler, nil, nil, nil)

	// 1. Register Success
	regBody, _ := json.Marshal(map[string]string{
		"email":    "user@example.com",
		"password": "securepassword",
	})
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(regBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Contains(t, w.Body.String(), `"success":true`)

	// 2. Register Duplicate -> 409 Conflict
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(regBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusConflict, w.Code)

	// 3. Login Success
	loginBody, _ := json.Marshal(map[string]string{
		"email":    "user@example.com",
		"password": "securepassword",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"token":`)

	// Extract Token
	var loginResp struct {
		Success bool `json:"success"`
		Data    struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &loginResp)
	token := loginResp.Data.Token
	assert.NotEmpty(t, token)

	// 4. Invalid Login (wrong password) -> 401 Unauthorized
	badLoginBody, _ := json.Marshal(map[string]string{
		"email":    "user@example.com",
		"password": "wrongpassword",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(badLoginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// 5. Protected Route /api/auth/me with Valid Token -> 200 OK
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"email":"user@example.com"`)

	// 6. Protected Route /api/auth/me without Token -> 401 Unauthorized
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/auth/me", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
