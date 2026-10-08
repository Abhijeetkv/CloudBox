package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"cloudbox/cache"
	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/storage"
)

var (
	ErrInvalidFolderName = errors.New("folder name cannot be empty or contain invalid characters")
	ErrCircularFolder    = errors.New("cannot move a folder into itself or one of its subfolders")
	ErrParentNotFound    = errors.New("parent folder not found")
)

// FolderService defines business operations for managing folders.
type FolderService interface {
	CreateFolder(ctx context.Context, userID uint, name string, parentID *uint) (*models.Folder, error)
	ListFolders(ctx context.Context, userID uint, parentID *uint) ([]models.Folder, error)
	ListAllFolders(ctx context.Context, userID uint) ([]models.Folder, error)
	GetFolder(ctx context.Context, id uint, userID uint) (*models.Folder, error)
	RenameFolder(ctx context.Context, id uint, userID uint, newName string) (*models.Folder, error)
	MoveFolder(ctx context.Context, id uint, userID uint, newParentID *uint) (*models.Folder, error)
	DeleteFolder(ctx context.Context, id uint, userID uint) error
}

type folderService struct {
	folderRepo repository.FolderRepository
	fileRepo   repository.FileRepository
	storage    storage.Storage
	cache      cache.CacheService
}

// NewFolderService creates a new FolderService.
func NewFolderService(
	folderRepo repository.FolderRepository,
	fileRepo repository.FileRepository,
	store storage.Storage,
	cacheService cache.CacheService,
) FolderService {
	return &folderService{
		folderRepo: folderRepo,
		fileRepo:   fileRepo,
		storage:    store,
		cache:      cacheService,
	}
}

// CreateFolder creates a new folder verifying parent folder ownership if provided.
func (s *folderService) CreateFolder(ctx context.Context, userID uint, name string, parentID *uint) (*models.Folder, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" || strings.ContainsAny(cleanName, `/\:*?"<>|`) {
		return nil, ErrInvalidFolderName
	}

	// If parentID provided, ensure parent exists and belongs to user
	if parentID != nil {
		parent, err := s.folderRepo.FindByIDAndUserID(*parentID, userID)
		if err != nil {
			return nil, ErrParentNotFound
		}
		if parent.UserID != userID {
			return nil, ErrAccessDenied
		}
	}

	folder := &models.Folder{
		UserID:    userID,
		Name:      cleanName,
		ParentID:  parentID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.folderRepo.Create(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// ListFolders lists folders inside parentID for a user.
func (s *folderService) ListFolders(ctx context.Context, userID uint, parentID *uint) ([]models.Folder, error) {
	return s.folderRepo.FindByUserIDAndParentID(userID, parentID)
}

// ListAllFolders lists all folders for a user (useful for move dialogs).
func (s *folderService) ListAllFolders(ctx context.Context, userID uint) ([]models.Folder, error) {
	return s.folderRepo.FindAllByUserID(userID)
}

// GetFolder retrieves a single folder ensuring ownership.
func (s *folderService) GetFolder(ctx context.Context, id uint, userID uint) (*models.Folder, error) {
	return s.folderRepo.FindByIDAndUserID(id, userID)
}

// RenameFolder changes the folder name.
func (s *folderService) RenameFolder(ctx context.Context, id uint, userID uint, newName string) (*models.Folder, error) {
	cleanName := strings.TrimSpace(newName)
	if cleanName == "" || strings.ContainsAny(cleanName, `/\:*?"<>|`) {
		return nil, ErrInvalidFolderName
	}

	folder, err := s.folderRepo.FindByIDAndUserID(id, userID)
	if err != nil {
		return nil, err
	}

	folder.Name = cleanName
	folder.UpdatedAt = time.Now()

	if err := s.folderRepo.Update(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// MoveFolder moves a folder to a new parent folder, strictly preventing circular nesting.
func (s *folderService) MoveFolder(ctx context.Context, id uint, userID uint, newParentID *uint) (*models.Folder, error) {
	folder, err := s.folderRepo.FindByIDAndUserID(id, userID)
	if err != nil {
		return nil, err
	}

	// Cannot move folder into itself
	if newParentID != nil && *newParentID == id {
		return nil, ErrCircularFolder
	}

	if newParentID != nil {
		// Ensure new parent exists and belongs to user
		newParent, err := s.folderRepo.FindByIDAndUserID(*newParentID, userID)
		if err != nil {
			return nil, ErrParentNotFound
		}
		if newParent.UserID != userID {
			return nil, ErrAccessDenied
		}

		// Ensure new parent is NOT a descendant of folder being moved!
		descendantIDs, err := s.folderRepo.GetDescendantFolderIDs(userID, id)
		if err != nil {
			return nil, err
		}
		for _, descID := range descendantIDs {
			if descID == *newParentID {
				return nil, ErrCircularFolder
			}
		}
	}

	folder.ParentID = newParentID
	folder.UpdatedAt = time.Now()

	if err := s.folderRepo.Update(folder); err != nil {
		return nil, err
	}

	return folder, nil
}

// DeleteFolder recursively deletes the folder, all child subfolders, and associated files from DB and MinIO.
func (s *folderService) DeleteFolder(ctx context.Context, id uint, userID uint) error {
	folder, err := s.folderRepo.FindByIDAndUserID(id, userID)
	if err != nil {
		return err
	}

	// 1. Collect folder and all descendant folder IDs
	descendantIDs, err := s.folderRepo.GetDescendantFolderIDs(userID, folder.ID)
	if err != nil {
		return err
	}
	allFolderIDs := append([]uint{folder.ID}, descendantIDs...)

	// 2. Find all files contained in these folders
	files, err := s.fileRepo.FindByFolderIDs(allFolderIDs)
	if err != nil {
		return err
	}

	// 3. Delete files from storage and invalidate Redis cache
	for _, f := range files {
		_ = s.storage.Delete(ctx, f.StorageKey)
		if s.cache != nil {
			_ = s.cache.DeleteFile(ctx, f.ID)
		}
		_ = s.fileRepo.Delete(f.ID)
	}

	// 4. Delete all child folders and the folder itself
	for i := len(allFolderIDs) - 1; i >= 0; i-- {
		_ = s.folderRepo.Delete(allFolderIDs[i])
	}

	return nil
}
