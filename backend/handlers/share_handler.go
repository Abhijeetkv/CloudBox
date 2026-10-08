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

type CreateShareRequest struct {
	FileID         uint `json:"file_id" binding:"required"`
	ExpiresInHours int  `json:"expires_in_hours"` // 0 means no expiration
}

type ShareHandler struct {
	shareService services.ShareService
	logger       *zap.Logger
}

func NewShareHandler(shareService services.ShareService, logger *zap.Logger) *ShareHandler {
	return &ShareHandler{
		shareService: shareService,
		logger:       logger,
	}
}

// Create handles POST /api/shares (requires JWT)
func (h *ShareHandler) Create(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	var req CreateShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "file_id is required")
		return
	}

	share, err := h.shareService.CreateShare(c.Request.Context(), userID, req.FileID, req.ExpiresInHours)
	if err != nil {
		if errors.Is(err, repository.ErrFileNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "file not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
			return
		}

		h.logger.Error("Failed to create share link", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to create share link")
		return
	}

	utils.RespondSuccess(c, http.StatusCreated, share)
}

// Get handles GET /api/shares/:token (PUBLIC, no JWT required)
func (h *ShareHandler) Get(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "token is required")
		return
	}

	result, err := h.shareService.GetShare(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, repository.ErrShareNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "share link not found or expired")
			return
		}
		if errors.Is(err, services.ErrShareExpired) {
			utils.RespondError(c, http.StatusGone, "SHARE_LINK_EXPIRED", "this share link has expired")
			return
		}

		h.logger.Error("Failed to resolve share token", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to resolve share link")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, result)
}

// List handles GET /api/shares (requires JWT)
func (h *ShareHandler) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	shares, err := h.shareService.ListShares(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to list shares", zap.Error(err), zap.Uint("user_id", userID))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to list shares")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, shares)
}

// Delete handles DELETE /api/shares/:id (requires JWT)
func (h *ShareHandler) Delete(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.RespondError(c, http.StatusUnauthorized, utils.ErrCodeUnauthorized, "unauthorized")
		return
	}

	idParam := c.Param("id")
	shareID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, utils.ErrCodeBadRequest, "invalid share id")
		return
	}

	if err := h.shareService.RevokeShare(c.Request.Context(), uint(shareID), userID); err != nil {
		if errors.Is(err, repository.ErrShareNotFound) {
			utils.RespondError(c, http.StatusNotFound, utils.ErrCodeNotFound, "share link not found")
			return
		}
		if errors.Is(err, services.ErrAccessDenied) {
			utils.RespondError(c, http.StatusForbidden, utils.ErrCodeForbidden, "access denied")
			return
		}

		h.logger.Error("Failed to delete share link", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError, utils.ErrCodeInternalServer, "failed to delete share link")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, "share link revoked successfully")
}
