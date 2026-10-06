package services_test

import (
	"testing"

	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/services"

	"github.com/stretchr/testify/assert"
)

// MockUserRepository implements repository.UserRepository in-memory for testing
type MockUserRepository struct {
	users map[string]*models.User
	byId  map[uint]*models.User
	seq   uint
}

func newMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[string]*models.User),
		byId:  make(map[uint]*models.User),
	}
}

func (m *MockUserRepository) Create(user *models.User) error {
	m.seq++
	user.ID = m.seq
	m.users[user.Email] = user
	m.byId[user.ID] = user
	return nil
}

func (m *MockUserRepository) FindByEmail(email string) (*models.User, error) {
	user, exists := m.users[email]
	if !exists {
		return nil, repository.ErrUserNotFound
	}
	return user, nil
}

func (m *MockUserRepository) FindByID(id uint) (*models.User, error) {
	user, exists := m.byId[id]
	if !exists {
		return nil, repository.ErrUserNotFound
	}
	return user, nil
}

func TestAuthService_Register(t *testing.T) {
	mockRepo := newMockUserRepository()
	authService := services.NewAuthService(mockRepo, "jwt-secret")

	// 1. Successful registration
	user, err := authService.Register("alice@example.com", "password123")
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "alice@example.com", user.Email)
	assert.NotEqual(t, "password123", user.PasswordHash)

	// 2. Duplicate registration
	_, err = authService.Register("alice@example.com", "password123")
	assert.ErrorIs(t, err, services.ErrUserAlreadyExists)

	// 3. Invalid email
	_, err = authService.Register("invalid-email", "password123")
	assert.ErrorIs(t, err, services.ErrInvalidEmail)

	// 4. Password too short
	_, err = authService.Register("bob@example.com", "123")
	assert.ErrorIs(t, err, services.ErrPasswordTooShort)
}

func TestAuthService_Login(t *testing.T) {
	mockRepo := newMockUserRepository()
	authService := services.NewAuthService(mockRepo, "jwt-secret")

	// Register a test user
	_, err := authService.Register("bob@example.com", "strongpassword")
	assert.NoError(t, err)

	// 1. Successful login
	token, user, err := authService.Login("bob@example.com", "strongpassword")
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, "bob@example.com", user.Email)

	// 2. Invalid password
	_, _, err = authService.Login("bob@example.com", "wrongpassword")
	assert.ErrorIs(t, err, services.ErrInvalidCredentials)

	// 3. Non-existent user
	_, _, err = authService.Login("ghost@example.com", "strongpassword")
	assert.ErrorIs(t, err, services.ErrInvalidCredentials)
}
