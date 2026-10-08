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
	FindByUserIDAndFolderID(userID uint, folderID *uint) ([]models.File, error)
	Search(userID uint, query string, folderID *uint, mimeType string) ([]models.File, error)
	GetTotalStorageUsage(userID uint) (int64, error)
	Update(file *models.File) error
	Delete(id uint) error
	FindByFolderIDs(folderIDs []uint) ([]models.File, error)
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

// FindByUserIDAndFolderID retrieves files inside a specific folder (or root folder if folderID is nil).
func (r *fileRepository) FindByUserIDAndFolderID(userID uint, folderID *uint) ([]models.File, error) {
	var files []models.File
	query := r.db.Where("user_id = ?", userID)
	if folderID == nil {
		query = query.Where("folder_id IS NULL")
	} else {
		query = query.Where("folder_id = ?", *folderID)
	}

	err := query.Order("created_at desc").Find(&files).Error
	if err != nil {
		return nil, err
	}
	return files, nil
}

// Search searches for files matching a query string across filename, optionally filtered by folder and mime type.
func (r *fileRepository) Search(userID uint, query string, folderID *uint, mimeType string) ([]models.File, error) {
	var files []models.File
	dbQuery := r.db.Where("user_id = ?", userID)

	if query != "" {
		dbQuery = dbQuery.Where("filename ILIKE ?", "%"+query+"%")
	}
	if folderID != nil {
		dbQuery = dbQuery.Where("folder_id = ?", *folderID)
	}
	if mimeType != "" {
		dbQuery = dbQuery.Where("mime_type ILIKE ?", "%"+mimeType+"%")
	}

	err := dbQuery.Order("created_at desc").Find(&files).Error
	if err != nil {
		return nil, err
	}
	return files, nil
}

// GetTotalStorageUsage calculates the sum of all file sizes belonging to a user.
func (r *fileRepository) GetTotalStorageUsage(userID uint) (int64, error) {
	var total int64
	row := r.db.Model(&models.File{}).Where("user_id = ?", userID).Select("COALESCE(SUM(size), 0)").Row()
	if err := row.Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

// Update persists changes to an existing file record (rename, move).
func (r *fileRepository) Update(file *models.File) error {
	return r.db.Save(file).Error
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

// FindByFolderIDs returns all files located inside any of the specified folder IDs.
func (r *fileRepository) FindByFolderIDs(folderIDs []uint) ([]models.File, error) {
	if len(folderIDs) == 0 {
		return nil, nil
	}
	var files []models.File
	err := r.db.Where("folder_id IN ?", folderIDs).Find(&files).Error
	if err != nil {
		return nil, err
	}
	return files, nil
}
