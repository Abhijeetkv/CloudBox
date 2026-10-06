package workers_test

import (
	"sync/atomic"
	"testing"
	"time"

	"cloudbox/workers"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestWorkerPool_Execution(t *testing.T) {
	numWorkers := 3
	bufferSize := 10
	logger := zap.NewNop()

	pool := workers.NewWorkerPool(numWorkers, bufferSize, logger)
	pool.Start()

	// Enqueue 5 jobs
	for i := 1; i <= 5; i++ {
		pool.Enqueue(workers.Job{
			FileID:   uint(i),
			Filename: "file.txt",
			Size:     1024,
		})
	}

	// Graceful shutdown should drain all jobs
	done := make(chan struct{})
	go func() {
		pool.Stop()
		close(done)
	}()

	select {
	case <-done:
		// Succeeded
	case <-time.After(3 * time.Second):
		t.Fatal("Worker pool did not stop within expected time")
	}
}

func TestWorkerPool_NonBlockingEnqueue(t *testing.T) {
	numWorkers := 1
	bufferSize := 2
	logger := zap.NewNop()

	pool := workers.NewWorkerPool(numWorkers, bufferSize, logger)
	// Notice: we don't start workers yet, so buffer will fill up

	// Fill buffer
	pool.Enqueue(workers.Job{FileID: 1})
	pool.Enqueue(workers.Job{FileID: 2})

	// Third enqueue would block an unbuffered or non-select send; our Enqueue uses select/default so it must NOT block!
	var enqueued atomic.Bool
	go func() {
		pool.Enqueue(workers.Job{FileID: 3}) // Dropped gracefully due to full buffer
		enqueued.Store(true)
	}()

	time.Sleep(50 * time.Millisecond)
	assert.True(t, enqueued.Load(), "Enqueue should not block HTTP caller when buffer is full")
}
