/**
 * Authentication Controller
 * =========================
 * Handles clinic registration, login, and authentication.
 */

const { Clinic } = require('../models');

/**
 * @desc    Register a new clinic
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password, phone, address, locationType, specialties } = req.body;

        // Check if clinic already exists
        const existingClinic = await Clinic.findOne({ email });
        if (existingClinic) {
            return res.status(400).json({
                success: false,
                message: 'A clinic with this email already exists'
            });
        }

        // Create clinic
        const clinic = await Clinic.create({
            name,
            email,
            password,
            phone,
            address,
            locationType,
            specialties
        });

        // Generate token
        const token = clinic.generateAuthToken();

        res.status(201).json({
            success: true,
            message: 'Clinic registered successfully',
            data: {
                clinic: {
                    id: clinic._id,
                    name: clinic.name,
                    email: clinic.email,
                    locationType: clinic.locationType
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Login clinic
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find clinic by credentials
        const clinic = await Clinic.findByCredentials(email, password);

        if (!clinic) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if clinic is active
        if (!clinic.isActive) {
            return res.status(401).json({
                success: false,
                message: 'This clinic account has been deactivated'
            });
        }

        // Generate token
        const token = clinic.generateAuthToken();

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                clinic: {
                    id: clinic._id,
                    name: clinic.name,
                    email: clinic.email,
                    locationType: clinic.locationType
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get current logged in clinic
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
    try {
        const clinic = await Clinic.findById(req.clinicId)
            .select('-password');

        res.json({
            success: true,
            data: { clinic }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update clinic profile
 * @route   PUT /api/auth/update
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, address, locationType, specialties, operatingHours } = req.body;

        const clinic = await Clinic.findByIdAndUpdate(
            req.clinicId,
            { 
                name, 
                phone, 
                address, 
                locationType, 
                specialties,
                operatingHours,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { clinic }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get clinic with password
        const clinic = await Clinic.findById(req.clinicId).select('+password');

        // Check current password
        const isMatch = await clinic.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        clinic.password = newPassword;
        await clinic.save();

        // Generate new token
        const token = clinic.generateAuthToken();

        res.json({
            success: true,
            message: 'Password changed successfully',
            data: { token }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Logout clinic (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
    try {
        // JWT tokens are stateless, so logout is handled client-side
        // This endpoint is for consistency and potential future token blacklisting
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    logout
};
