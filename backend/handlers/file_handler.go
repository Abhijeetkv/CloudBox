package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"cloudbox/middleware"
	"cloudbox/repository"
	"cloudbox/services"
	"cloudbox/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PresignedUploadRequest defines the payload to request a direct upload URL.
type PresignedUploadRequest struct {
	Filename string `json:"filename" binding:"required"`
	Size     int64  `json:"size" binding:"required"`
	MimeType string `json:"mime_type"`
	FolderID *uint  `json:"folder_id"`
}

// ConfirmUploadRequest defines the payload to record file metadata after client upload.
type ConfirmUploadRequest struct {
	Filename   string `json:"filename" binding:"required"`
	StorageKey string `json:"storage_key" binding:"required"`
	Size       int64  `json:"size" binding:"required"`
	MimeType   string `json:"mime_type"`
	FolderID   *uint  `json:"folder_id"`
}

// UpdateFileRequest defines the payload to rename or move a file.
type UpdateFileRequest struct {
	Filename *string `json:"filename"`
	FolderID *uint   `json:"folder_id"`
}

// FileHandler handles HTTP requests for file operations.
type FileHandler struct {
	fileService services.FileService
	logger      *zap.Logger
}

// NewFileHandler creates a new FileHandler.
func NewFileHandler(fileService services.FileService, logger *zap.Logger) *FileHandler {
	return &FileHandler{
		fileService: fileService,
		logger:      logger,
	}
}

// Upload handles POST /api/files (multipart/form-data with "file" key and optional "folder_id")
func (h *FileHandler) Upload(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	header, err := c.FormFile("file")
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "missing 'file' form field")
		return
	}

	fileContent, err := header.Open()
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "failed to open uploaded file")
		return
	}
	defer fileContent.Close()

	// Parse optional folder_id
	var folderID *uint
	if folderStr := c.PostForm("folder_id"); folderStr != "" {
		if id, err := strconv.ParseUint(folderStr, 10, 64); err == nil {
			uid := uint(id)
			folderID = &uid
		}
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	file, err := h.fileService.Upload(c.Request.Context(), userID, header.Filename, fileContent, header.Size, mimeType, folderID)
	if err != nil {
		if errors.Is(err, services.ErrStorageQuotaExceeded) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeQuotaExceeded, err.Error())
			return
		}
		if errors.Is(err, services.ErrEmptyFile) {
			utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, err.Error())
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied to target folder")
			return
		}

		h.logger.Error("Failed to upload file", zap.Uint("user_id", userID), zap.String("filename", header.Filename), zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to upload file")
		return
	}

	h.logger.Info("File uploaded successfully", zap.Uint("file_id", file.ID), zap.Uint("user_id", userID), zap.String("filename", file.Filename))
	utils.RespondSuccess(c, http.StatusCreated, file)
}

// GetUploadURL handles POST /api/files/upload-url (generates direct-to-storage presigned upload URL)
func (h *FileHandler) GetUploadURL(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	var req PresignedUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "filename and size are required")
		return
	}

	if req.MimeType == "" {
		req.MimeType = "application/octet-stream"
	}

	res, err := h.fileService.GetPresignedUploadURL(c.Request.Context(), userID, req.Filename, req.Size, req.MimeType, req.FolderID)
	if err != nil {
		if errors.Is(err, services.ErrStorageQuotaExceeded) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeQuotaExceeded, err.Error())
			return
		}
		h.logger.Error("Failed to generate presigned upload URL", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to generate upload URL")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, res)
}

// ConfirmUpload handles POST /api/files/confirm-upload (saves metadata after direct client upload)
func (h *FileHandler) ConfirmUpload(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	var req ConfirmUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid confirmation payload")
		return
	}

	if req.MimeType == "" {
		req.MimeType = "application/octet-stream"
	}

	file, err := h.fileService.ConfirmUpload(c.Request.Context(), userID, req.Filename, req.StorageKey, req.Size, req.MimeType, req.FolderID)
	if err != nil {
		h.logger.Error("Failed to confirm uploaded file", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to record file metadata")
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, file)
}

// List handles GET /api/files?folder_id=
func (h *FileHandler) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	var folderID *uint
	if folderStr := c.Query("folder_id"); folderStr != "" {
		if id, err := strconv.ParseUint(folderStr, 10, 64); err == nil {
			uid := uint(id)
			folderID = &uid
		}
	}

	files, err := h.fileService.ListFiles(userID, folderID)
	if err != nil {
		h.logger.Error("Failed to list files", zap.Uint("user_id", userID), zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to list files")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, files)
}

// Search handles GET /api/files/search?q=&folder_id=&mime_type=
func (h *FileHandler) Search(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	query := c.Query("q")
	mimeType := c.Query("mime_type")

	var folderID *uint
	if folderStr := c.Query("folder_id"); folderStr != "" {
		if id, err := strconv.ParseUint(folderStr, 10, 64); err == nil {
			uid := uint(id)
			folderID = &uid
		}
	}

	files, err := h.fileService.SearchFiles(userID, query, folderID, mimeType)
	if err != nil {
		h.logger.Error("Failed to search files", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to search files")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, files)
}

// Get handles GET /api/files/:id
func (h *FileHandler) Get(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid file id")
		return
	}

	file, err := h.fileService.GetFile(c.Request.Context(), uint(fileID), userID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "file not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
			return
		}

		h.logger.Error("Failed to get file metadata", zap.Uint("file_id", uint(fileID)), zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to retrieve file")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, file)
}

// Update handles PATCH /api/files/:id (rename or move)
func (h *FileHandler) Update(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid file id")
		return
	}

	var req UpdateFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid update payload")
		return
	}

	// Rename file if filename provided
	if req.Filename != nil {
		file, err := h.fileService.RenameFile(c.Request.Context(), uint(fileID), userID, *req.Filename)
		if err != nil {
			if errors.Is(err, repository.ErrFileNotFound) {
				utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "file not found")
				return
			}
			if errors.Is(err, services.ErrAccessDenied) {
				utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
				return
			}
			utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to rename file")
			return
		}

		if req.FolderID == nil {
			utils.RespondSuccess(c, http.StatusOK, file)
			return
		}
	}

	// Move file if folder_id provided
	if req.FolderID != nil {
		file, err := h.fileService.MoveFile(c.Request.Context(), uint(fileID), userID, req.FolderID)
		if err != nil {
			if errors.Is(err, services.ErrAccessDenied) {
				utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied to destination folder")
				return
			}
			utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to move file")
			return
		}
		utils.RespondSuccess(c, http.StatusOK, file)
		return
	}

	utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "no updates provided")
}

// GetDownloadURL handles GET /api/files/:id/download-url (returns short-lived presigned download URL)
func (h *FileHandler) GetDownloadURL(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid file id")
		return
	}

	downloadURL, file, err := h.fileService.GetPresignedDownloadURL(c.Request.Context(), uint(fileID), userID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "file not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
			return
		}
		h.logger.Error("Failed to generate download URL", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to generate download URL")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, gin.H{
		"download_url": downloadURL,
		"filename":     file.Filename,
		"size":         file.Size,
		"mime_type":    file.MimeType,
	})
}

// Download handles GET /api/files/:id/download (streams file directly from storage)
func (h *FileHandler) Download(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid file id")
		return
	}

	stream, file, err := h.fileService.Download(c.Request.Context(), uint(fileID), userID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "file not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
			return
		}

		h.logger.Error("Failed to download file", zap.Uint("file_id", uint(fileID)), zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to download file")
		return
	}
	defer stream.Close()

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.Filename))
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.Size, 10))

	_, _ = io.Copy(c.Writer, stream)
}

// Delete handles DELETE /api/files/:id
func (h *FileHandler) Delete(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid file id")
		return
	}

	if err := h.fileService.Delete(c.Request.Context(), uint(fileID), userID); err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "file not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
			return
		}

		h.logger.Error("Failed to delete file", zap.Uint("file_id", uint(fileID)), zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to delete file")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, "file deleted successfully")
}
