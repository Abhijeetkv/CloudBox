package handlers

import (
	"errors"
	"net/http"

	"cloudbox/middleware"
	"cloudbox/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RegisterRequest defines the input body for user registration.
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest defines the input body for user login.
type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthHandler handles HTTP requests for authentication.
type AuthHandler struct {
	authService services.AuthService
	logger      *zap.Logger
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService services.AuthService, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid email format or password too short (min 6 characters)",
		})
		return
	}

	user, err := h.authService.Register(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrUserAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}
		if errors.Is(err, services.ErrInvalidEmail) || errors.Is(err, services.ErrPasswordTooShort) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		h.logger.Error("Failed to register user", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to register user",
		})
		return
	}

	h.logger.Info("User registered successfully", zap.Uint("user_id", user.ID), zap.String("email", user.Email))

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"created_at": user.CreatedAt,
		},
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "email and password are required",
		})
		return
	}

	token, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "invalid email or password",
			})
			return
		}

		h.logger.Error("Login error", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "internal server error during login",
		})
		return
	}

	h.logger.Info("User logged in successfully", zap.Uint("user_id", user.ID), zap.String("email", user.Email))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token": token,
			"user": gin.H{
				"id":    user.ID,
				"email": user.Email,
			},
		},
	})
}

// Me handles GET /api/auth/me (Protected route example verifying JWT)
func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "unauthorized",
		})
		return
	}

	email, _ := middleware.GetUserEmail(c)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id": userID,
			"email":   email,
		},
	})
}
