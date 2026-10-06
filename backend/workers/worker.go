package workers

import (
	"sync"
	"time"

	"go.uber.org/zap"
)

// Job represents a background task to process an uploaded file.
type Job struct {
	FileID   uint
	Filename string
	Size     int64
}

// WorkerPool manages a pool of concurrent goroutines reading jobs from a shared channel.
type WorkerPool struct {
	jobs       chan Job
	numWorkers int
	wg         sync.WaitGroup
	logger     *zap.Logger
	stopOnce   sync.Once
}

// NewWorkerPool initializes a WorkerPool with the specified number of workers and channel buffer size.
func NewWorkerPool(numWorkers int, bufferSize int, logger *zap.Logger) *WorkerPool {
	return &WorkerPool{
		jobs:       make(chan Job, bufferSize),
		numWorkers: numWorkers,
		logger:     logger,
	}
}

// Start launches the worker goroutines.
func (wp *WorkerPool) Start() {
	wp.logger.Info("Starting background worker pool", zap.Int("worker_count", wp.numWorkers))

	for i := 1; i <= wp.numWorkers; i++ {
		wp.wg.Add(1)
		go wp.worker(i)
	}
}

// worker is the worker goroutine loop. It reads jobs from the channel until the channel is closed.
func (wp *WorkerPool) worker(workerID int) {
	defer wp.wg.Done()
	wp.logger.Debug("Worker started", zap.Int("worker_id", workerID))

	for job := range wp.jobs {
		wp.processJob(workerID, job)
	}

	wp.logger.Debug("Worker stopped", zap.Int("worker_id", workerID))
}

// processJob performs the background work for a job.
func (wp *WorkerPool) processJob(workerID int, job Job) {
	wp.logger.Info("Worker processing file",
		zap.Int("worker_id", workerID),
		zap.Uint("file_id", job.FileID),
		zap.String("filename", job.Filename),
		zap.Int64("size", job.Size),
	)

	// Simulate background processing (e.g. virus scanning, image thumbnailing, metadata indexing)
	time.Sleep(50 * time.Millisecond)

	wp.logger.Info("Worker finished processing file",
		zap.Int("worker_id", workerID),
		zap.Uint("file_id", job.FileID),
		zap.String("filename", job.Filename),
	)
}

// Enqueue adds a job to the jobs channel without blocking HTTP handlers if buffer allows.
func (wp *WorkerPool) Enqueue(job Job) {
	select {
	case wp.jobs <- job:
		wp.logger.Debug("Job enqueued successfully", zap.Uint("file_id", job.FileID))
	default:
		wp.logger.Warn("Worker queue is full, could not enqueue job immediately",
			zap.Uint("file_id", job.FileID),
			zap.String("filename", job.Filename),
		)
	}
}

// Stop closes the jobs channel and waits for all active worker goroutines to finish.
func (wp *WorkerPool) Stop() {
	wp.stopOnce.Do(func() {
		wp.logger.Info("Stopping background worker pool gracefully...")
		close(wp.jobs)
		wp.wg.Wait()
		wp.logger.Info("All background workers have stopped")
	})
}
