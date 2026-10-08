package repository

import (
	"errors"

	"cloudbox/models"

	"gorm.io/gorm"
)

var (
	ErrFolderNotFound = errors.New("folder not found")
)

// FolderRepository defines database operations for Folders.
type FolderRepository interface {
	Create(folder *models.Folder) error
	FindByID(id uint) (*models.Folder, error)
	FindByIDAndUserID(id uint, userID uint) (*models.Folder, error)
	FindByUserIDAndParentID(userID uint, parentID *uint) ([]models.Folder, error)
	FindAllByUserID(userID uint) ([]models.Folder, error)
	Update(folder *models.Folder) error
	Delete(id uint) error
	GetDescendantFolderIDs(userID uint, folderID uint) ([]uint, error)
}

type folderRepository struct {
	db *gorm.DB
}

// NewFolderRepository creates a new FolderRepository.
func NewFolderRepository(db *gorm.DB) FolderRepository {
	return &folderRepository{db: db}
}

func (r *folderRepository) Create(folder *models.Folder) error {
	return r.db.Create(folder).Error
}

func (r *folderRepository) FindByID(id uint) (*models.Folder, error) {
	var folder models.Folder
	err := r.db.First(&folder, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFolderNotFound
		}
		return nil, err
	}
	return &folder, nil
}

func (r *folderRepository) FindByIDAndUserID(id uint, userID uint) (*models.Folder, error) {
	var folder models.Folder
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&folder).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFolderNotFound
		}
		return nil, err
	}
	return &folder, nil
}

func (r *folderRepository) FindByUserIDAndParentID(userID uint, parentID *uint) ([]models.Folder, error) {
	var folders []models.Folder
	query := r.db.Where("user_id = ?", userID)
	if parentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}

	err := query.Order("name asc").Find(&folders).Error
	if err != nil {
		return nil, err
	}
	return folders, nil
}

func (r *folderRepository) FindAllByUserID(userID uint) ([]models.Folder, error) {
	var folders []models.Folder
	err := r.db.Where("user_id = ?", userID).Order("name asc").Find(&folders).Error
	if err != nil {
		return nil, err
	}
	return folders, nil
}

func (r *folderRepository) Update(folder *models.Folder) error {
	return r.db.Save(folder).Error
}

func (r *folderRepository) Delete(id uint) error {
	result := r.db.Delete(&models.Folder{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrFolderNotFound
	}
	return nil
}

// GetDescendantFolderIDs returns all nested folder IDs below folderID for a user using recursive traversal.
func (r *folderRepository) GetDescendantFolderIDs(userID uint, folderID uint) ([]uint, error) {
	var allFolders []models.Folder
	if err := r.db.Where("user_id = ?", userID).Find(&allFolders).Error; err != nil {
		return nil, err
	}

	// Build adjacency list parentID -> childIDs
	childrenMap := make(map[uint][]uint)
	for _, f := range allFolders {
		if f.ParentID != nil {
			childrenMap[*f.ParentID] = append(childrenMap[*f.ParentID], f.ID)
		}
	}

	// BFS / DFS to collect all descendants
	var descendants []uint
	queue := []uint{folderID}
	visited := make(map[uint]bool)
	visited[folderID] = true

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		for _, childID := range childrenMap[curr] {
			if !visited[childID] {
				visited[childID] = true
				descendants = append(descendants, childID)
				queue = append(queue, childID)
			}
		}
	}

	return descendants, nil
}
