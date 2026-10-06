package middleware

import (
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// InitLogger initializes and returns a Zap structured logger.
func InitLogger() (*zap.Logger, error) {
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "timestamp"
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder

	core := zapcore.NewCore(
		zapcore.NewConsoleEncoder(encoderConfig),
		zapcore.AddSync(os.Stdout),
		zap.DebugLevel,
	)

	logger := zap.New(core, zap.AddCaller())
	return logger, nil
}

// ZapLogger is a Gin middleware that logs HTTP requests using Zap.
func ZapLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Do not log internal noise if needed, but here we log all requests
		latency := time.Since(start)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

		fields := []zap.Field{
			zap.Int("status", statusCode),
			zap.String("method", method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", clientIP),
			zap.Duration("latency", latency),
			zap.String("user-agent", c.Request.UserAgent()),
		}

		if len(errorMessage) > 0 {
			fields = append(fields, zap.String("error", errorMessage))
		}

		switch {
		case statusCode >= http.StatusInternalServerError:
			logger.Error("Server error", fields...)
		case statusCode >= http.StatusBadRequest:
			logger.Warn("Client error", fields...)
		default:
			logger.Info("Request handled", fields...)
		}
	}
}

// ZapRecovery is a Gin middleware that recovers from panics and logs with Zap.
func ZapRecovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				// Check for broken connection
				var brokenPipe bool
				if ne, ok := r.(*net.OpError); ok {
					var se *os.SyscallError
					if ok := strings.Contains(ne.Error(), "syscall"); ok {
						if se, ok = ne.Err.(*os.SyscallError); ok {
							if strings.Contains(strings.ToLower(se.Error()), "broken pipe") ||
								strings.Contains(strings.ToLower(se.Error()), "connection reset by peer") {
								brokenPipe = true
							}
						}
					}
				}

				if brokenPipe {
					logger.Error("Broken pipe",
						zap.Any("error", r),
						zap.String("path", c.Request.URL.Path),
					)
					c.Error(r.(error))
					c.Abort()
					return
				}

				logger.Error("Panic recovered",
					zap.Any("error", r),
					zap.String("path", c.Request.URL.Path),
					zap.Stack("stack"),
				)

				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "internal server error",
				})
			}
		}()
		c.Next()
	}
}
