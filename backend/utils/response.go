package utils

import (
	"github.com/gin-gonic/gin"
)

// APIError represents structured error details for API responses.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// APIResponse standardizes all CloudBox API responses.
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

// RespondSuccess sends an HTTP response with success: true and data payload.
func RespondSuccess(c *gin.Context, status int, data interface{}) {
	c.JSON(status, gin.H{
		"success": true,
		"data":    data,
	})
}

// RespondError sends a standardized error response with the provided status, code, and message.
func RespondError(c *gin.Context, status int, code string, message string) {
	c.JSON(status, gin.H{
		"success": false,
		"error": gin.H{
			"code":    code,
			"message": message,
		},
	})
}

// Error codes
const (
	ErrCodeBadRequest       = "BAD_REQUEST"
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeForbidden        = "FORBIDDEN"
	ErrCodeNotFound         = "NOT_FOUND"
	ErrCodeConflict         = "CONFLICT"
	ErrCodeQuotaExceeded    = "STORAGE_LIMIT_EXCEEDED"
	ErrCodeTooManyRequests  = "RATE_LIMIT_EXCEEDED"
	ErrCodeInternalServer   = "INTERNAL_SERVER_ERROR"
)
