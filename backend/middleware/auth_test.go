package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cloudbox/middleware"
	"cloudbox/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupAuthTestRouter(secret string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.GET("/protected", middleware.JWTAuth(secret), func(c *gin.Context) {
		userID, ok := middleware.GetUserID(c)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "user id missing"})
			return
		}
		userEmail, _ := middleware.GetUserEmail(c)
		c.JSON(http.StatusOK, gin.H{
			"user_id": userID,
			"email":   userEmail,
		})
	})

	return r
}

func TestJWTAuthMiddleware(t *testing.T) {
	secret := "test-jwt-secret-xyz"
	router := setupAuthTestRouter(secret)

	// Generate valid token
	validToken, err := utils.GenerateToken(99, "charlie@example.com", secret, time.Hour)
	assert.NoError(t, err)

	// 1. Valid Token -> 200 OK
	req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+validToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"user_id":99`)
	assert.Contains(t, w.Body.String(), `"email":"charlie@example.com"`)

	// 2. Missing Header -> 401 Unauthorized
	req, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "authorization header is required")

	// 3. Malformed Header -> 401 Unauthorized
	req, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Basic "+validToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Bearer {token}")

	// 4. Invalid Token Signature -> 401 Unauthorized
	invalidToken, _ := utils.GenerateToken(99, "charlie@example.com", "wrong-secret", time.Hour)
	req, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+invalidToken)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid or expired token")
}
