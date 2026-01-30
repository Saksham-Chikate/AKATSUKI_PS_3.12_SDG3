/**
 * Patient Controller
 * ==================
 * Handles patient CRUD operations and priority scoring.
 * Integrates with the Python AI engine for ML-based priority calculation.
 */

const axios = require('axios');
const { Patient, Doctor } = require('../models');

// AI Engine URL from environment
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Get priority score from AI engine
 * @param {Object} patientData - Patient data for ML prediction
 * @returns {Object} Priority score and reason
 */
const getPriorityFromAI = async (patientData) => {
    try {
        const response = await axios.post(
            `${AI_ENGINE_URL}/predict`,
            {
                age: patientData.age,
                severity: patientData.severityScore,
                rural: patientData.location === 'rural' ? 1 : 0,
                chronic: patientData.chronicIllness ? 1 : 0,
                waiting_time: patientData.waitingTime || 0
            },
            {
                timeout: 5000 // 5 second timeout
            }
        );

        return {
            score: response.data.priority_score,
            reason: response.data.reason
        };
    } catch (error) {
        console.error('AI Engine Error:', error.message);
        
        // Fallback: Calculate basic priority if AI engine is unavailable
        return calculateFallbackPriority(patientData);
    }
};

/**
 * Fallback priority calculation when AI engine is unavailable
 * Uses simple heuristics based on the same factors
 */
const calculateFallbackPriority = (patientData) => {
    let score = 0;
    const reasons = [];

    // Severity (40% weight)
    score += (patientData.severityScore / 10) * 40;
    if (patientData.severityScore >= 8) reasons.push('High severity');
    else if (patientData.severityScore >= 5) reasons.push('Moderate severity');

    // Age factor (20% weight)
    if (patientData.age >= 65) {
        score += 20;
        reasons.push('elderly patient');
    } else if (patientData.age >= 50) {
        score += 10;
    }

    // Chronic illness (15% weight)
    if (patientData.chronicIllness) {
        score += 15;
        reasons.push('chronic illness');
    }

    // Rural location (15% weight + fairness uplift)
    if (patientData.location === 'rural') {
        score += 25; // 15 base + 10 fairness
        reasons.push('rural location');
    }

    // Waiting time (10% weight)
    const waitTime = patientData.waitingTime || 0;
    score += Math.min(waitTime / 60, 1) * 10;
    if (waitTime >= 30) reasons.push('extended wait');

    return {
        score: Math.min(Math.round(score), 100),
        reason: reasons.length > 0 
            ? `FALLBACK: ${reasons.join(', ')}` 
            : 'FALLBACK: Standard priority'
    };
};

/**
 * @desc    Create new patient and add to queue
 * @route   POST /api/patients
 * @access  Private
 */
const createPatient = async (req, res, next) => {
    try {
        const patientData = {
            ...req.body,
            clinic: req.clinicId,
            queueJoinTime: new Date(),
            waitingTime: 0
        };

        // Get priority score from AI
        const { score, reason } = await getPriorityFromAI(patientData);
        patientData.priorityScore = score;
        patientData.priorityReason = reason;

        // Create patient
        const patient = await Patient.create(patientData);

        res.status(201).json({
            success: true,
            message: 'Patient added to queue successfully',
            data: { patient }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all patients for a clinic
 * @route   GET /api/patients
 * @access  Private
 */
const getPatients = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        // Build query
        const query = { clinic: req.clinicId };
        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const patients = await Patient.find(query)
            .populate('assignedDoctor', 'name specialization')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Get total count
        const total = await Patient.countDocuments(query);

        res.json({
            success: true,
            data: {
                patients,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single patient
 * @route   GET /api/patients/:id
 * @access  Private
 */
const getPatient = async (req, res, next) => {
    try {
        const patient = await Patient.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        }).populate('assignedDoctor', 'name specialization email');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.json({
            success: true,
            data: { patient }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update patient
 * @route   PATCH /api/patients/:id
 * @access  Private
 */
const updatePatient = async (req, res, next) => {
    try {
        let patient = await Patient.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Update fields
        const updateFields = req.body;

        // If severity or other ML-relevant fields changed, recalculate priority
        const mlFields = ['age', 'severityScore', 'location', 'chronicIllness'];
        const shouldRecalculate = mlFields.some(field => 
            updateFields[field] !== undefined && 
            updateFields[field] !== patient[field]
        );

        if (shouldRecalculate) {
            const updatedData = { ...patient.toObject(), ...updateFields };
            const { score, reason } = await getPriorityFromAI(updatedData);
            updateFields.priorityScore = score;
            updateFields.priorityReason = reason;
        }

        // Update patient
        patient = await Patient.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        ).populate('assignedDoctor', 'name specialization');

        res.json({
            success: true,
            message: 'Patient updated successfully',
            data: { patient }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete patient from queue
 * @route   DELETE /api/patients/:id
 * @access  Private
 */
const deletePatient = async (req, res, next) => {
    try {
        const patient = await Patient.findOneAndDelete({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // If patient had an assigned doctor, release the slot
        if (patient.assignedDoctor) {
            try {
                const doctor = await Doctor.findById(patient.assignedDoctor);
                if (doctor) {
                    await doctor.releasePatient();
                }
            } catch (err) {
                console.error('Error releasing doctor slot:', err);
            }
        }

        res.json({
            success: true,
            message: 'Patient removed from queue'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Recalculate priority for a patient
 * @route   POST /api/patients/:id/recalculate
 * @access  Private
 */
const recalculatePriority = async (req, res, next) => {
    try {
        const patient = await Patient.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Update waiting time
        const now = new Date();
        const joinTime = new Date(patient.queueJoinTime);
        const waitingTime = Math.round((now - joinTime) / (1000 * 60));

        // Get new priority from AI
        const { score, reason } = await getPriorityFromAI({
            ...patient.toObject(),
            waitingTime
        });

        // Update patient
        patient.waitingTime = waitingTime;
        patient.priorityScore = score;
        patient.priorityReason = reason;
        await patient.save();

        res.json({
            success: true,
            message: 'Priority recalculated',
            data: { 
                patient,
                priorityScore: score,
                priorityReason: reason
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Start consultation for a patient
 * @route   POST /api/patients/:id/start-consultation
 * @access  Private
 */
const startConsultation = async (req, res, next) => {
    try {
        const { doctorId } = req.body;

        const patient = await Patient.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        if (patient.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                message: 'Patient is not in waiting status'
            });
        }

        // Assign doctor if provided
        if (doctorId) {
            const doctor = await Doctor.findOne({
                _id: doctorId,
                clinic: req.clinicId
            });

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: 'Doctor not found'
                });
            }

            await doctor.assignPatient();
        }

        // Start consultation
        await patient.startConsultation(doctorId);

        res.json({
            success: true,
            message: 'Consultation started',
            data: { patient }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Complete consultation for a patient
 * @route   POST /api/patients/:id/complete
 * @access  Private
 */
const completeConsultation = async (req, res, next) => {
    try {
        const { notes, prescription, followUpRequired, followUpDate } = req.body;

        const patient = await Patient.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Complete consultation
        await patient.completeConsultation(notes, prescription);

        // Update follow-up info
        if (followUpRequired !== undefined) {
            patient.followUpRequired = followUpRequired;
            patient.followUpDate = followUpDate;
            await patient.save();
        }

        // Release doctor slot
        if (patient.assignedDoctor) {
            try {
                const doctor = await Doctor.findById(patient.assignedDoctor);
                if (doctor) {
                    await doctor.releasePatient();
                }
            } catch (err) {
                console.error('Error releasing doctor slot:', err);
            }
        }

        res.json({
            success: true,
            message: 'Consultation completed',
            data: { patient }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPatient,
    getPatients,
    getPatient,
    updatePatient,
    deletePatient,
    recalculatePriority,
    startConsultation,
    completeConsultation
};
