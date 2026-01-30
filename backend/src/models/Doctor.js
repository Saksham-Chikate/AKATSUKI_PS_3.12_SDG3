/**
 * Doctor Model
 * ============
 * Represents a doctor/healthcare provider at a clinic.
 * Doctors can be assigned to patients and handle telemedicine appointments.
 */

const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    // Reference to the clinic this doctor belongs to
    clinic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
        required: [true, 'Clinic reference is required']
    },

    // Doctor's full name
    name: {
        type: String,
        required: [true, 'Doctor name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },

    // Doctor's email
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email'
        ]
    },

    // Medical license number
    licenseNumber: {
        type: String,
        required: [true, 'License number is required'],
        trim: true
    },

    // Specialization/specialty
    specialization: {
        type: String,
        required: [true, 'Specialization is required'],
        trim: true,
        enum: [
            'General Practice',
            'Internal Medicine',
            'Pediatrics',
            'Family Medicine',
            'Emergency Medicine',
            'Cardiology',
            'Dermatology',
            'Neurology',
            'Psychiatry',
            'Orthopedics',
            'Other'
        ]
    },

    // Years of experience
    yearsOfExperience: {
        type: Number,
        min: [0, 'Years of experience cannot be negative'],
        default: 0
    },

    // Phone number
    phone: {
        type: String,
        trim: true
    },

    // Is currently available for consultations
    isAvailable: {
        type: Boolean,
        default: true
    },

    // Is the doctor account active
    isActive: {
        type: Boolean,
        default: true
    },

    // Current number of patients in queue assigned to this doctor
    currentPatientLoad: {
        type: Number,
        default: 0,
        min: 0
    },

    // Maximum patients this doctor can handle simultaneously
    maxPatientLoad: {
        type: Number,
        default: 10,
        min: 1
    },

    // Profile image URL
    profileImage: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============================================
// Indexes
// ============================================

// Compound index for efficient clinic-based queries
doctorSchema.index({ clinic: 1, isActive: 1 });
doctorSchema.index({ clinic: 1, specialization: 1 });

// ============================================
// Virtual Properties
// ============================================

// Virtual for patients assigned to this doctor
doctorSchema.virtual('patients', {
    ref: 'Patient',
    localField: '_id',
    foreignField: 'assignedDoctor',
    justOne: false
});

// Virtual to check if doctor can accept more patients
doctorSchema.virtual('canAcceptPatients').get(function() {
    return this.isAvailable && 
           this.isActive && 
           this.currentPatientLoad < this.maxPatientLoad;
});

// ============================================
// Instance Methods
// ============================================

/**
 * Increment patient load when patient is assigned
 */
doctorSchema.methods.assignPatient = async function() {
    if (this.currentPatientLoad >= this.maxPatientLoad) {
        throw new Error('Doctor has reached maximum patient capacity');
    }
    this.currentPatientLoad += 1;
    await this.save();
};

/**
 * Decrement patient load when patient is removed
 */
doctorSchema.methods.releasePatient = async function() {
    if (this.currentPatientLoad > 0) {
        this.currentPatientLoad -= 1;
        await this.save();
    }
};

// ============================================
// Static Methods
// ============================================

/**
 * Find available doctors for a clinic
 * @param {ObjectId} clinicId - Clinic ID
 * @param {string} specialization - Optional specialization filter
 */
doctorSchema.statics.findAvailableDoctors = function(clinicId, specialization = null) {
    const query = {
        clinic: clinicId,
        isActive: true,
        isAvailable: true,
        $expr: { $lt: ['$currentPatientLoad', '$maxPatientLoad'] }
    };

    if (specialization) {
        query.specialization = specialization;
    }

    return this.find(query).sort({ currentPatientLoad: 1 });
};

module.exports = mongoose.model('Doctor', doctorSchema);
