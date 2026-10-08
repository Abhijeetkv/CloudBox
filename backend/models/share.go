package models

import (
	"time"
)

// Share represents a temporary public sharing link for a file.
type Share struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	FileID    uint       `gorm:"not null;index" json:"file_id"`
	UserID    uint       `gorm:"not null;index" json:"user_id"`
	Token     string     `gorm:"not null;uniqueIndex" json:"token"`
	ExpiresAt *time.Time `json:"expires_at"` // Nullable: nil means permanent until revoked
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// Relationships
	File *File `gorm:"foreignKey:FileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"file,omitempty"`
	User *User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
}

// IsExpired checks if the share link has expired.
func (s *Share) IsExpired() bool {
	if s.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*s.ExpiresAt)
}
