package services

import (
	"errors"
	"strings"
	"time"

	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/utils"
)

var (
	ErrUserAlreadyExists  = errors.New("user with this email already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidEmail       = errors.New("email cannot be empty or invalid")
	ErrPasswordTooShort   = errors.New("password must be at least 6 characters")
)

const (
	jwtExpiration = 24 * time.Hour
)

// AuthService handles business logic for authentication.
type AuthService interface {
	Register(email, password string) (*models.User, error)
	Login(email, password string) (string, *models.User, error)
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

// NewAuthService creates a new AuthService.
func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// Register validates inputs, checks uniqueness, hashes password, and persists user.
func (s *authService) Register(email, password string) (*models.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, ErrInvalidEmail
	}

	if len(password) < 6 {
		return nil, ErrPasswordTooShort
	}

	// Check if user already exists
	existingUser, err := s.userRepo.FindByEmail(email)
	if err == nil && existingUser != nil {
		return nil, ErrUserAlreadyExists
	}
	if err != nil && !errors.Is(err, repository.ErrUserNotFound) {
		return nil, err
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        email,
		PasswordHash: hashedPassword,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

// Login verifies credentials and returns a signed JWT token and user info.
func (s *authService) Login(email, password string) (string, *models.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" || password == "" {
		return "", nil, ErrInvalidCredentials
	}

	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, err
	}

	// Verify password hash
	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return "", nil, ErrInvalidCredentials
	}

	// Generate JWT
	token, err := utils.GenerateToken(user.ID, user.Email, s.jwtSecret, jwtExpiration)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}
