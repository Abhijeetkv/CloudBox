package middleware

import (
	"net/http"
	"strings"

	"cloudbox/utils"

	"github.com/gin-gonic/gin"
)

const (
	ContextUserIDKey    = "userID"
	ContextUserEmailKey = "userEmail"
)

// JWTAuth validates the Bearer token in the Authorization header.
func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check Authorization header first
		token := ""
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				token = parts[1]
			}
		}

		// Fallback to query param "token" (useful for direct browser access / links)
		if token == "" {
			token = c.Query("token")
		}

		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "authorization token is required",
			})
			return
		}

		claims, err := utils.ValidateToken(token, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "invalid or expired token",
			})
			return
		}

		// Store user details in context for downstream handlers
		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextUserEmailKey, claims.Email)

		c.Next()
	}
}

// GetUserID retrieves the authenticated user's ID from the Gin context.
func GetUserID(c *gin.Context) (uint, bool) {
	val, exists := c.Get(ContextUserIDKey)
	if !exists {
		return 0, false
	}
	id, ok := val.(uint)
	return id, ok
}

// GetUserEmail retrieves the authenticated user's email from the Gin context.
func GetUserEmail(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextUserEmailKey)
	if !exists {
		return "", false
	}
	email, ok := val.(string)
	return email, ok
}
