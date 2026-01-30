/**
 * Validation Middleware
 * =====================
 * Input validation using express-validator.
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Check validation results and return errors if any
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// ============================================
// Auth Validation Rules
// ============================================

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Clinic name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email'),
    body('password')
        .notEmpty().withMessage('Password is required'),
    validate
];

// ============================================
// Patient Validation Rules
// ============================================

const patientValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Patient name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('age')
        .notEmpty().withMessage('Age is required')
        .isInt({ min: 0, max: 150 }).withMessage('Please enter a valid age'),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required'),
    body('location')
        .notEmpty().withMessage('Location is required')
        .isIn(['rural', 'urban']).withMessage('Location must be rural or urban'),
    body('symptoms')
        .trim()
        .notEmpty().withMessage('Symptoms description is required')
        .isLength({ max: 1000 }).withMessage('Symptoms cannot exceed 1000 characters'),
    body('severityScore')
        .notEmpty().withMessage('Severity score is required')
        .isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('chronicIllness')
        .optional()
        .isBoolean().withMessage('Chronic illness must be true or false'),
    body('isEmergency')
        .optional()
        .isBoolean().withMessage('Emergency flag must be true or false'),
    body('internetReliability')
        .optional()
        .isIn(['poor', 'fair', 'good', 'excellent'])
        .withMessage('Invalid internet reliability value'),
    validate
];

const patientUpdateValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('age')
        .optional()
        .isInt({ min: 0, max: 150 }).withMessage('Please enter a valid age'),
    body('severityScore')
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('status')
        .optional()
        .isIn(['waiting', 'in-consultation', 'completed', 'cancelled', 'no-show'])
        .withMessage('Invalid status value'),
    validate
];

// ============================================
// Doctor Validation Rules
// ============================================

const doctorValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Doctor name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email'),
    body('licenseNumber')
        .trim()
        .notEmpty().withMessage('License number is required'),
    body('specialization')
        .notEmpty().withMessage('Specialization is required'),
    validate
];

// ============================================
// ID Parameter Validation
// ============================================

const idParamValidation = [
    param('id')
        .isMongoId().withMessage('Invalid ID format'),
    validate
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    patientValidation,
    patientUpdateValidation,
    doctorValidation,
    idParamValidation
};
