package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"cloudbox/middleware"
	"cloudbox/repository"
	"cloudbox/services"
	"cloudbox/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CreateFolderRequest struct {
	Name     string `json:"name" binding:"required"`
	ParentID *uint  `json:"parent_id"`
}

type UpdateFolderRequest struct {
	Name     *string `json:"name"`
	ParentID *uint   `json:"parent_id"`
}

type FolderHandler struct {
	folderService services.FolderService
	logger        *zap.Logger
}

func NewFolderHandler(folderService services.FolderService, logger *zap.Logger) *FolderHandler {
	return &FolderHandler{
		folderService: folderService,
		logger:        logger,
	}
}

// Create handles POST /api/folders
func (h *FolderHandler) Create(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	var req CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "folder name is required")
		return
	}

	folder, err := h.folderService.CreateFolder(c.Request.Context(), userID, req.Name, req.ParentID)
	if err != nil {
		if errors.Is(err, services.ErrInvalidFolderName) {
			utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrParentNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "parent folder not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied to parent folder")
			return
		}

		h.logger.Error("Failed to create folder", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to create folder")
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, folder)
}

// List handles GET /api/folders?parent_id=
func (h *FolderHandler) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	var parentID *uint
	if parentStr := c.Query("parent_id"); parentStr != "" {
		if id, err := strconv.ParseUint(parentStr, 10, 64); err == nil {
			uid := uint(id)
			parentID = &uid
		}
	}

	// If "all=true" query param provided, return all user folders (for move tree selection)
	if c.Query("all") == "true" {
		folders, err := h.folderService.ListAllFolders(c.Request.Context(), userID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to list folders")
			return
		}
		utils.RespondSuccess(c, http.StatusOK, folders)
		return
	}

	folders, err := h.folderService.ListFolders(c.Request.Context(), userID, parentID)
	if err != nil {
		h.logger.Error("Failed to list folders", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to list folders")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, folders)
}

// Get handles GET /api/folders/:id
func (h *FolderHandler) Get(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	folderID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid folder id")
		return
	}

	folder, err := h.folderService.GetFolder(c.Request.Context(), uint(folderID), userID)
	if err != nil {
		if errors.Is(err, repository.ErrFolderNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "folder not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to retrieve folder")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, folder)
}

// Update handles PATCH /api/folders/:id (rename or move)
func (h *FolderHandler) Update(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	folderID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid folder id")
		return
	}

	var req UpdateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid update payload")
		return
	}

	// Rename if Name is provided
	if req.Name != nil {
		folder, err := h.folderService.RenameFolder(c.Request.Context(), uint(folderID), userID, *req.Name)
		if err != nil {
			if errors.Is(err, services.ErrInvalidFolderName) {
				utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, err.Error())
				return
			}
			if errors.Is(err, repository.ErrFolderNotFound) {
				utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "folder not found")
				return
			}
			utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to rename folder")
			return
		}

		// If ParentID not being updated as well, return renamed folder
		if req.ParentID == nil {
			utils.RespondSuccess(c, http.StatusOK, folder)
			return
		}
	}

	// Move folder if ParentID provided
	if req.ParentID != nil {
		folder, err := h.folderService.MoveFolder(c.Request.Context(), uint(folderID), userID, req.ParentID)
		if err != nil {
			if errors.Is(err, services.ErrCircularFolder) {
				utils.RespondError(c, http.StatusConflict, utils.ErrCodeConflict, err.Error())
				return
			}
			if errors.Is(err, services.ErrParentNotFound) {
				utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "target parent folder not found")
				return
			}
			utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to move folder")
			return
		}
		utils.RespondSuccess(c, http.StatusOK, folder)
		return
	}

	utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "no updates provided")
}

// Delete handles DELETE /api/folders/:id
func (h *FolderHandler) Delete(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	folderID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid folder id")
		return
	}

	if err := h.folderService.DeleteFolder(c.Request.Context(), uint(folderID), userID); err != nil {
		if errors.Is(err, repository.ErrFolderNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "folder not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to delete folder")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, "folder deleted successfully")
}
