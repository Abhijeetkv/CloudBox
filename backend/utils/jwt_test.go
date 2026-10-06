package utils_test

import (
	"testing"
	"time"

	"cloudbox/utils"

	"github.com/stretchr/testify/assert"
)

func TestJWTGenerationAndValidation(t *testing.T) {
	secret := "my-secret-key-12345"
	userID := uint(42)
	email := "test@example.com"

	// 1. Successful generation and validation
	token, err := utils.GenerateToken(userID, email, secret, time.Hour)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := utils.ValidateToken(token, secret)
	assert.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)

	// 2. Invalid secret
	_, err = utils.ValidateToken(token, "wrong-secret-key")
	assert.Error(t, err)

	// 3. Expired token
	expiredToken, err := utils.GenerateToken(userID, email, secret, -time.Minute)
	assert.NoError(t, err)

	_, err = utils.ValidateToken(expiredToken, secret)
	assert.Error(t, err)
}
