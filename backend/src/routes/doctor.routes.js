/**
 * Doctor Routes
 * =============
 * Routes for doctor management.
 */

const express = require('express');
const router = express.Router();

const {
    createDoctor,
    getDoctors,
    getDoctor,
    updateDoctor,
    deleteDoctor,
    getAvailableDoctors,
    toggleAvailability
} = require('../controllers/doctor.controller');

const { protect } = require('../middleware/auth');
const { doctorValidation, idParamValidation } = require('../middleware/validation');

// All routes are protected
router.use(protect);

// Get available doctors (must be before /:id routes)
router.get('/available', getAvailableDoctors);

// CRUD operations
router.route('/')
    .post(doctorValidation, createDoctor)
    .get(getDoctors);

router.route('/:id')
    .get(idParamValidation, getDoctor)
    .put(idParamValidation, updateDoctor)
    .delete(idParamValidation, deleteDoctor);

// Toggle availability
router.post('/:id/toggle-availability', idParamValidation, toggleAvailability);

module.exports = router;
