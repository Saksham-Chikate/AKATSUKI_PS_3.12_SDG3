/**
 * Authentication Routes
 * =====================
 * Routes for clinic registration, login, and profile management.
 */

const express = require('express');
const router = express.Router();

const {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    logout
} = require('../controllers/auth.controller');

const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
