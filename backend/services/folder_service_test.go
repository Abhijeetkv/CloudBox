package services_test

import (
	"context"
	"testing"

	"cloudbox/models"
	"cloudbox/repository"
	"cloudbox/services"

	"github.com/stretchr/testify/assert"
)

type MockFolderRepository struct {
	folders map[uint]*models.Folder
	nextID  uint
}

func newMockFolderRepository() *MockFolderRepository {
	return &MockFolderRepository{folders: make(map[uint]*models.Folder)}
}

func (m *MockFolderRepository) Create(f *models.Folder) error {
	m.nextID++
	f.ID = m.nextID
	m.folders[f.ID] = f
	return nil
}

func (m *MockFolderRepository) FindByID(id uint) (*models.Folder, error) {
	f, ok := m.folders[id]
	if !ok {
		return nil, repository.ErrFolderNotFound
	}
	return f, nil
}

func (m *MockFolderRepository) FindByIDAndUserID(id uint, userID uint) (*models.Folder, error) {
	f, ok := m.folders[id]
	if !ok || f.UserID != userID {
		return nil, repository.ErrFolderNotFound
	}
	return f, nil
}

func (m *MockFolderRepository) FindByUserIDAndParentID(userID uint, parentID *uint) ([]models.Folder, error) {
	var list []models.Folder
	for _, f := range m.folders {
		if f.UserID == userID {
			if (parentID == nil && f.ParentID == nil) || (parentID != nil && f.ParentID != nil && *f.ParentID == *parentID) {
				list = append(list, *f)
			}
		}
	}
	return list, nil
}

func (m *MockFolderRepository) FindAllByUserID(userID uint) ([]models.Folder, error) {
	var list []models.Folder
	for _, f := range m.folders {
		if f.UserID == userID {
			list = append(list, *f)
		}
	}
	return list, nil
}

func (m *MockFolderRepository) Update(f *models.Folder) error {
	m.folders[f.ID] = f
	return nil
}

func (m *MockFolderRepository) Delete(id uint) error {
	delete(m.folders, id)
	return nil
}

func (m *MockFolderRepository) GetDescendantFolderIDs(userID uint, folderID uint) ([]uint, error) {
	var descendants []uint
	for _, f := range m.folders {
		if f.UserID == userID && f.ParentID != nil && *f.ParentID == folderID {
			descendants = append(descendants, f.ID)
			sub, _ := m.GetDescendantFolderIDs(userID, f.ID)
			descendants = append(descendants, sub...)
		}
	}
	return descendants, nil
}

func TestFolderService_CreateAndNest(t *testing.T) {
	folderRepo := newMockFolderRepository()
	fileRepo := newMockFileRepository()
	store := newMockStorage()

	svc := services.NewFolderService(folderRepo, fileRepo, store, nil)

	// Create root folder
	f1, err := svc.CreateFolder(context.Background(), 1, "Documents", nil)
	assert.NoError(t, err)
	assert.Equal(t, "Documents", f1.Name)
	assert.Nil(t, f1.ParentID)

	// Create child folder
	f2, err := svc.CreateFolder(context.Background(), 1, "Work", &f1.ID)
	assert.NoError(t, err)
	assert.Equal(t, "Work", f2.Name)
	assert.Equal(t, &f1.ID, f2.ParentID)

	// Rename folder
	renamed, err := svc.RenameFolder(context.Background(), f2.ID, 1, "Work Projects")
	assert.NoError(t, err)
	assert.Equal(t, "Work Projects", renamed.Name)
}

func TestFolderService_PreventCircularNesting(t *testing.T) {
	folderRepo := newMockFolderRepository()
	fileRepo := newMockFileRepository()
	store := newMockStorage()

	svc := services.NewFolderService(folderRepo, fileRepo, store, nil)

	// Folder structure: A -> B -> C
	fA, _ := svc.CreateFolder(context.Background(), 1, "A", nil)
	fB, _ := svc.CreateFolder(context.Background(), 1, "B", &fA.ID)
	fC, _ := svc.CreateFolder(context.Background(), 1, "C", &fB.ID)

	// Attempting to move A into C must be rejected!
	_, err := svc.MoveFolder(context.Background(), fA.ID, 1, &fC.ID)
	assert.ErrorIs(t, err, services.ErrCircularFolder)

	// Attempting to move A into itself must be rejected!
	_, err = svc.MoveFolder(context.Background(), fA.ID, 1, &fA.ID)
	assert.ErrorIs(t, err, services.ErrCircularFolder)
}
