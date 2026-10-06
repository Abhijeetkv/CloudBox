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

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

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

// Upload handles POST /api/files (multipart/form-data with "file" key)
func (h *FileHandler) Upload(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	header, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "missing 'file' form field"})
		return
	}

	fileContent, err := header.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "failed to open uploaded file"})
		return
	}
	defer fileContent.Close()

	// Detect MIME type
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	file, err := h.fileService.Upload(c.Request.Context(), userID, header.Filename, fileContent, header.Size, mimeType)
	if err != nil {
		h.logger.Error("Failed to upload file",
			zap.Uint("user_id", userID),
			zap.String("filename", header.Filename),
			zap.Error(err),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to upload file"})
		return
	}

	h.logger.Info("File uploaded successfully",
		zap.Uint("file_id", file.ID),
		zap.Uint("user_id", userID),
		zap.String("filename", file.Filename),
		zap.Int64("size", file.Size),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"file": gin.H{
			"id":         file.ID,
			"filename":   file.Filename,
			"size":       file.Size,
			"mime_type":  file.MimeType,
			"created_at": file.CreatedAt,
		},
	})
}

// List handles GET /api/files
func (h *FileHandler) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	files, err := h.fileService.ListFiles(userID)
	if err != nil {
		h.logger.Error("Failed to list files", zap.Uint("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to list files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    files,
	})
}

// Get handles GET /api/files/:id
func (h *FileHandler) Get(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid file id"})
		return
	}

	file, err := h.fileService.GetFile(c.Request.Context(), uint(fileID), userID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "file not found"})
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "access denied: you do not own this file"})
			return
		}

		h.logger.Error("Failed to get file metadata", zap.Uint("file_id", uint(fileID)), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to retrieve file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    file,
	})
}

// Download handles GET /api/files/:id/download
func (h *FileHandler) Download(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid file id"})
		return
	}

	stream, file, err := h.fileService.Download(c.Request.Context(), uint(fileID), userID)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "file not found"})
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "access denied: you do not own this file"})
			return
		}

		h.logger.Error("Failed to download file", zap.Uint("file_id", uint(fileID)), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to download file"})
		return
	}
	defer stream.Close()

	h.logger.Info("File download initiated",
		zap.Uint("file_id", file.ID),
		zap.Uint("user_id", userID),
		zap.String("filename", file.Filename),
	)

	// Set headers for download
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.Filename))
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.Size, 10))

	// Stream data directly to response
	_, _ = io.Copy(c.Writer, stream)
}

// Delete handles DELETE /api/files/:id
func (h *FileHandler) Delete(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	idParam := c.Param("id")
	fileID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid file id"})
		return
	}

	if err := h.fileService.Delete(c.Request.Context(), uint(fileID), userID); err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "file not found"})
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "access denied: you do not own this file"})
			return
		}

		h.logger.Error("Failed to delete file", zap.Uint("file_id", uint(fileID)), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to delete file"})
		return
	}

	h.logger.Info("File deleted successfully", zap.Uint("file_id", uint(fileID)), zap.Uint("user_id", userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    "file deleted successfully",
	})
}
