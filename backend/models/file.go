package models

import (
	"time"
)

// File represents metadata for a stored file.
type File struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index:idx_user_folder" json:"user_id"`
	FolderID   *uint     `gorm:"index:idx_user_folder" json:"folder_id"` // Nullable for root-level files
	Filename   string    `gorm:"not null;index:idx_user_filename" json:"filename"`
	StorageKey string    `gorm:"not null;uniqueIndex" json:"storage_key"`
	Size       int64     `gorm:"not null" json:"size"`
	MimeType   string    `gorm:"not null" json:"mime_type"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	// Relationships
	User   *User   `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	Folder *Folder `gorm:"foreignKey:FolderID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"folder,omitempty"`
	Shares []Share `gorm:"foreignKey:FileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"shares,omitempty"`
}
