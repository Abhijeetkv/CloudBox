package models

import (
	"time"
)

// Folder represents a directory created by a user to organize files.
type Folder struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index:idx_user_parent" json:"user_id"`
	Name      string    `gorm:"not null" json:"name"`
	ParentID  *uint     `gorm:"index:idx_user_parent" json:"parent_id"` // Nullable for root-level folders
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	User        *User    `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	Parent      *Folder  `gorm:"foreignKey:ParentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"parent,omitempty"`
	Subfolders  []Folder `gorm:"foreignKey:ParentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"subfolders,omitempty"`
	Files       []File   `gorm:"foreignKey:FolderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"files,omitempty"`
}
