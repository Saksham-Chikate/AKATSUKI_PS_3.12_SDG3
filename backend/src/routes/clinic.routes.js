/**
 * Clinic Routes
 * =============
 * Routes for clinic dashboard and settings.
 */

const express = require('express');
const router = express.Router();

const {
    getDashboard,
    getSettings,
    updateSettings
} = require('../controllers/clinic.controller');

const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
