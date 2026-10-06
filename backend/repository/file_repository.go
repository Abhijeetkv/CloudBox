package repository

import (
	"errors"

	"cloudbox/models"

	"gorm.io/gorm"
)

var (
	ErrFileNotFound = errors.New("file not found")
)

// FileRepository defines database operations for File metadata.
type FileRepository interface {
	Create(file *models.File) error
	FindByID(id uint) (*models.File, error)
	FindByUserID(userID uint) ([]models.File, error)
	FindByIDAndUserID(id uint, userID uint) (*models.File, error)
	Delete(id uint) error
}

type fileRepository struct {
	db *gorm.DB
}

// NewFileRepository creates a new FileRepository.
func NewFileRepository(db *gorm.DB) FileRepository {
	return &fileRepository{db: db}
}

// Create persists a new File metadata record.
func (r *fileRepository) Create(file *models.File) error {
	return r.db.Create(file).Error
}

// FindByID retrieves a file by ID regardless of owner.
func (r *fileRepository) FindByID(id uint) (*models.File, error) {
	var file models.File
	err := r.db.First(&file, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFileNotFound
		}
		return nil, err
	}
	return &file, nil
}

// FindByUserID retrieves all files owned by a user.
func (r *fileRepository) FindByUserID(userID uint) ([]models.File, error) {
	var files []models.File
	err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&files).Error
	if err != nil {
		return nil, err
	}
	return files, nil
}

// FindByIDAndUserID retrieves a file ensuring ownership.
func (r *fileRepository) FindByIDAndUserID(id uint, userID uint) (*models.File, error) {
	var file models.File
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&file).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFileNotFound
		}
		return nil, err
	}
	return &file, nil
}

// Delete removes a file record by ID.
func (r *fileRepository) Delete(id uint) error {
	result := r.db.Delete(&models.File{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrFileNotFound
	}
	return nil
}
