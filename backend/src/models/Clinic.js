/**
 * Clinic Model
 * ============
 * Represents a healthcare clinic that uses the telemedicine platform.
 * Clinics are the primary authentication entity (they log in to manage their queue).
 * 
 * Features:
 * - Secure password hashing with bcrypt
 * - JWT token generation
 * - Password comparison methods
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const clinicSchema = new mongoose.Schema({
    // Clinic name (e.g., "Springfield Medical Center")
    name: {
        type: String,
        required: [true, 'Clinic name is required'],
        trim: true,
        maxlength: [100, 'Clinic name cannot exceed 100 characters']
    },

    // Email used for login
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email'
        ]
    },

    // Hashed password
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },

    // Clinic phone number
    phone: {
        type: String,
        trim: true,
        match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number']
    },

    // Clinic address
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true, default: 'USA' }
    },

    // Location type (affects patient rural scoring)
    locationType: {
        type: String,
        enum: ['urban', 'suburban', 'rural'],
        default: 'urban'
    },

    // Operating hours
    operatingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },

    // Specialties offered
    specialties: [{
        type: String,
        trim: true
    }],

    // Is the clinic currently active
    isActive: {
        type: Boolean,
        default: true
    },

    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============================================
// Virtual Properties
// ============================================

// Virtual for doctors belonging to this clinic
clinicSchema.virtual('doctors', {
    ref: 'Doctor',
    localField: '_id',
    foreignField: 'clinic',
    justOne: false
});

// Virtual for patients in this clinic's queue
clinicSchema.virtual('patients', {
    ref: 'Patient',
    localField: '_id',
    foreignField: 'clinic',
    justOne: false
});

// ============================================
// Pre-save Middleware
// ============================================

/**
 * Hash password before saving
 * Only hashes if password is modified (or new)
 */
clinicSchema.pre('save', async function(next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Update the updatedAt timestamp on every save
clinicSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// ============================================
// Instance Methods
// ============================================

/**
 * Compare entered password with stored hash
 * @param {string} enteredPassword - Password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
clinicSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Generate JWT token for authentication
 * @returns {string} Signed JWT token
 */
clinicSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            id: this._id,
            email: this.email,
            name: this.name,
            type: 'clinic'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// ============================================
// Static Methods
// ============================================

/**
 * Find clinic by email and verify password
 * @param {string} email - Clinic email
 * @param {string} password - Plain text password
 * @returns {Promise<Object|null>} Clinic object or null
 */
clinicSchema.statics.findByCredentials = async function(email, password) {
    // Find clinic and include password field
    const clinic = await this.findOne({ email }).select('+password');
    
    if (!clinic) {
        return null;
    }

    // Check if password matches
    const isMatch = await clinic.matchPassword(password);
    
    if (!isMatch) {
        return null;
    }

    return clinic;
};

module.exports = mongoose.model('Clinic', clinicSchema);
