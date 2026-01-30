/**
 * Queue Routes
 * ============
 * Routes for queue management and optimization.
 */

const express = require('express');
const router = express.Router();

const {
    getOptimizedQueue,
    getQueueStats,
    bulkRecalculatePriorities,
    getInConsultation,
    getCompleted
} = require('../controllers/queue.controller');

const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Queue operations
router.get('/', getOptimizedQueue);
router.get('/stats', getQueueStats);
router.get('/in-consultation', getInConsultation);
router.get('/completed', getCompleted);
router.post('/recalculate', bulkRecalculatePriorities);

module.exports = router;
