package repository

import (
	"errors"

	"cloudbox/models"

	"gorm.io/gorm"
)

var (
	ErrShareNotFound = errors.New("share link not found or expired")
)

// ShareRepository defines database operations for Share records.
type ShareRepository interface {
	Create(share *models.Share) error
	FindByToken(token string) (*models.Share, error)
	FindByIDAndUserID(id uint, userID uint) (*models.Share, error)
	FindByUserID(userID uint) ([]models.Share, error)
	FindByFileID(fileID uint) ([]models.Share, error)
	Delete(id uint) error
	DeleteByFileID(fileID uint) error
}

type shareRepository struct {
	db *gorm.DB
}

// NewShareRepository creates a new ShareRepository.
func NewShareRepository(db *gorm.DB) ShareRepository {
	return &shareRepository{db: db}
}

func (r *shareRepository) Create(share *models.Share) error {
	return r.db.Create(share).Error
}

func (r *shareRepository) FindByToken(token string) (*models.Share, error) {
	var share models.Share
	err := r.db.Preload("File").Where("token = ?", token).First(&share).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShareNotFound
		}
		return nil, err
	}
	return &share, nil
}

func (r *shareRepository) FindByIDAndUserID(id uint, userID uint) (*models.Share, error) {
	var share models.Share
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&share).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShareNotFound
		}
		return nil, err
	}
	return &share, nil
}

func (r *shareRepository) FindByUserID(userID uint) ([]models.Share, error) {
	var shares []models.Share
	err := r.db.Preload("File").Where("user_id = ?", userID).Order("created_at desc").Find(&shares).Error
	if err != nil {
		return nil, err
	}
	return shares, nil
}

func (r *shareRepository) FindByFileID(fileID uint) ([]models.Share, error) {
	var shares []models.Share
	err := r.db.Where("file_id = ?", fileID).Find(&shares).Error
	if err != nil {
		return nil, err
	}
	return shares, nil
}

func (r *shareRepository) Delete(id uint) error {
	result := r.db.Delete(&models.Share{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrShareNotFound
	}
	return nil
}

func (r *shareRepository) DeleteByFileID(fileID uint) error {
	return r.db.Where("file_id = ?", fileID).Delete(&models.Share{}).Error
}
