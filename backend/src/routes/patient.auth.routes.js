/**
 * Patient Authentication Routes
 * ==============================
 * Handles patient registration, login, and profile management
 */

const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Clinic = require('../models/Clinic');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Middleware to protect patient routes
const protectPatient = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'patient') {
            return res.status(401).json({ success: false, message: 'Not authorized as patient' });
        }
        req.patient = await Patient.findById(decoded.id);
        if (!req.patient) {
            return res.status(401).json({ success: false, message: 'Patient not found' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }
};

/**
 * @route   POST /api/patient-auth/register
 * @desc    Register a new patient
 * @access  Public
 */
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('age').isInt({ min: 0, max: 150 }).withMessage('Valid age is required'),
    body('clinicId').notEmpty().withMessage('Clinic selection is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, password, phone, age, clinicId, location, symptoms, severityScore, chronicIllness, chronicConditions } = req.body;

        // Check if patient already exists
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) {
            return res.status(400).json({ success: false, message: 'Patient with this email already exists' });
        }

        // Check if clinic exists
        const clinic = await Clinic.findById(clinicId);
        if (!clinic) {
            return res.status(400).json({ success: false, message: 'Selected clinic not found' });
        }

        // Create patient
        const patient = await Patient.create({
            name,
            email,
            password,
            phone,
            age,
            clinic: clinicId,
            location: location || 'urban',
            symptoms: symptoms || 'General consultation',
            severityScore: severityScore || 1,
            chronicIllness: chronicIllness || false,
            chronicConditions: chronicConditions || [],
            status: 'waiting',
            queueJoinTime: new Date()
        });

        const token = patient.getSignedJwtToken();

        res.status(201).json({
            success: true,
            token,
            patient: {
                id: patient._id,
                name: patient.name,
                email: patient.email,
                clinic: clinic.name
            }
        });
    } catch (error) {
        console.error('Patient registration error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /api/patient-auth/login
 * @desc    Patient login
 * @access  Public
 */
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find patient with password
        const patient = await Patient.findOne({ email }).select('+password').populate('clinic', 'name');
        if (!patient) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!patient.password) {
            return res.status(401).json({ success: false, message: 'Please register first or contact the clinic' });
        }

        // Check password
        const isMatch = await patient.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = patient.getSignedJwtToken();

        res.json({
            success: true,
            token,
            patient: {
                id: patient._id,
                name: patient.name,
                email: patient.email,
                clinic: patient.clinic?.name || 'Unknown'
            }
        });
    } catch (error) {
        console.error('Patient login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/patient-auth/me
 * @desc    Get current patient profile
 * @access  Private (Patient)
 */
router.get('/me', protectPatient, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patient._id)
            .populate('clinic', 'name address phone')
            .populate('assignedDoctor', 'name specialization');

        res.json({ success: true, patient });
    } catch (error) {
        console.error('Get patient profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   PUT /api/patient-auth/profile
 * @desc    Update patient profile
 * @access  Private (Patient)
 */
router.put('/profile', protectPatient, async (req, res) => {
    try {
        const allowedUpdates = ['name', 'phone', 'age', 'location', 'symptoms', 'severityScore', 'chronicIllness', 'chronicConditions', 'address', 'internetReliability', 'preferredCommunication'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const patient = await Patient.findByIdAndUpdate(
            req.patient._id,
            updates,
            { new: true, runValidators: true }
        ).populate('clinic', 'name').populate('assignedDoctor', 'name specialization');

        res.json({ success: true, patient });
    } catch (error) {
        console.error('Update patient profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/patient-auth/queue-status
 * @desc    Get patient's queue status and position
 * @access  Private (Patient)
 */
router.get('/queue-status', protectPatient, async (req, res) => {
    try {
        const patient = await Patient.findById(req.patient._id).populate('clinic', 'name');
        
        // Get all waiting patients in the same clinic, sorted by priority
        const queuePatients = await Patient.find({
            clinic: patient.clinic._id,
            status: 'waiting'
        }).sort({ isEmergency: -1, priorityScore: -1, queueJoinTime: 1 });

        const position = queuePatients.findIndex(p => p._id.toString() === patient._id.toString()) + 1;

        res.json({
            success: true,
            queueStatus: {
                position: position > 0 ? position : null,
                totalInQueue: queuePatients.length,
                status: patient.status,
                priorityScore: patient.priorityScore,
                priorityReason: patient.priorityReason,
                estimatedWait: position > 0 ? position * 15 : 0 // Rough estimate: 15 min per patient
            }
        });
    } catch (error) {
        console.error('Get queue status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/patient-auth/clinics
 * @desc    Get list of available clinics for registration
 * @access  Public
 */
router.get('/clinics', async (req, res) => {
    try {
        const clinics = await Clinic.find({ isActive: true }).select('name address phone specialty');
        res.json({ success: true, clinics });
    } catch (error) {
        console.error('Get clinics error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
