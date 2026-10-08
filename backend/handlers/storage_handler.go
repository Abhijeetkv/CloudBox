package handlers

import (
	"net/http"

	"cloudbox/middleware"
	"cloudbox/services"
	"cloudbox/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type StorageHandler struct {
	fileService services.FileService
	logger      *zap.Logger
}

func NewStorageHandler(fileService services.FileService, logger *zap.Logger) *StorageHandler {
	return &StorageHandler{
		fileService: fileService,
		logger:      logger,
	}
}

// GetUsage handles GET /api/storage/usage
func (h *StorageHandler) GetUsage(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	usage, err := h.fileService.GetStorageUsage(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get storage usage", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to calculate storage usage")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, usage)
}
