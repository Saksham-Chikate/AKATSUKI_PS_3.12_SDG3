/**
 * Patient Routes
 * ==============
 * Routes for patient management and queue operations.
 */

const express = require('express');
const router = express.Router();

const {
    createPatient,
    getPatients,
    getPatient,
    updatePatient,
    deletePatient,
    recalculatePriority,
    startConsultation,
    completeConsultation
} = require('../controllers/patient.controller');

const { protect } = require('../middleware/auth');
const { 
    patientValidation, 
    patientUpdateValidation,
    idParamValidation 
} = require('../middleware/validation');

// All routes are protected
router.use(protect);

// CRUD operations
router.route('/')
    .post(patientValidation, createPatient)
    .get(getPatients);

router.route('/:id')
    .get(idParamValidation, getPatient)
    .patch(idParamValidation, patientUpdateValidation, updatePatient)
    .delete(idParamValidation, deletePatient);

// Priority recalculation
router.post('/:id/recalculate', idParamValidation, recalculatePriority);

// Consultation management
router.post('/:id/start-consultation', idParamValidation, startConsultation);
router.post('/:id/complete', idParamValidation, completeConsultation);

module.exports = router;
