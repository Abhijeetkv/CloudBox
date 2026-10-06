package utils_test

import (
	"testing"

	"cloudbox/utils"

	"github.com/stretchr/testify/assert"
)

func TestPasswordHashing(t *testing.T) {
	password := "supersecret123"

	hash, err := utils.HashPassword(password)
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)

	// Valid password check
	assert.True(t, utils.CheckPasswordHash(password, hash))

	// Invalid password check
	assert.False(t, utils.CheckPasswordHash("wrongpassword", hash))
}
