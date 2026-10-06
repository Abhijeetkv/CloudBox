package models

import (
	"time"
)

// File represents metadata for a stored file.
type File struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	Filename   string    `gorm:"not null" json:"filename"`
	StorageKey string    `gorm:"not null;uniqueIndex" json:"storage_key"`
	Size       int64     `gorm:"not null" json:"size"`
	MimeType   string    `gorm:"not null" json:"mime_type"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	// Relationship
	User *User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
}
