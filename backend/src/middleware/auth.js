/**
 * Authentication Middleware
 * =========================
 * Protects routes by verifying JWT tokens.
 * Attaches authenticated clinic to the request object.
 */

const jwt = require('jsonwebtoken');
const { Clinic } = require('../models');

/**
 * Protect routes - Verify JWT token
 * Adds req.clinic with the authenticated clinic data
 */
const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Extract token from "Bearer <token>"
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route. Please log in.'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get clinic from database
        const clinic = await Clinic.findById(decoded.id);

        if (!clinic) {
            return res.status(401).json({
                success: false,
                message: 'Clinic not found. Token may be invalid.'
            });
        }

        if (!clinic.isActive) {
            return res.status(401).json({
                success: false,
                message: 'This clinic account has been deactivated.'
            });
        }

        // Attach clinic to request
        req.clinic = clinic;
        req.clinicId = clinic._id;

        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please log in again.'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route.'
        });
    }
};

/**
 * Optional auth - Doesn't fail if no token, but attaches clinic if present
 */
const optionalAuth = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const clinic = await Clinic.findById(decoded.id);

        if (clinic && clinic.isActive) {
            req.clinic = clinic;
            req.clinicId = clinic._id;
        }
    } catch (error) {
        // Silently continue without auth
    }

    next();
};

module.exports = {
    protect,
    optionalAuth
};
