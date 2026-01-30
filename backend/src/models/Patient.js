/**
 * Patient Model
 * =============
 * Represents a patient in the telemedicine queue.
 * Contains all information needed for ML priority scoring and queue management.
 * 
 * Key Fields:
 * - Authentication (email, password)
 * - Demographics (age, location)
 * - Medical information (symptoms, severity, chronic conditions)
 * - Queue status (waiting time, priority score)
 * - Emergency flag for immediate priority
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const patientSchema = new mongoose.Schema({
    // Reference to the clinic managing this patient
    clinic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
        required: [true, 'Clinic reference is required']
    },

    // Optional: Doctor assigned to this patient
    assignedDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        default: null
    },

    // ============================================
    // Authentication
    // ============================================
    
    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },

    // ============================================
    // Personal Information
    // ============================================

    // Patient's full name
    name: {
        type: String,
        required: [true, 'Patient name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },

    // Patient's age (important for ML scoring)
    age: {
        type: Number,
        required: [true, 'Patient age is required'],
        min: [0, 'Age cannot be negative'],
        max: [150, 'Please enter a valid age']
    },

    // Contact email
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

    // Contact phone
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },

    // ============================================
    // Location Information (for ML scoring)
    // ============================================

    // Urban or Rural location
    location: {
        type: String,
        required: [true, 'Location type is required'],
        enum: ['rural', 'urban'],
        default: 'urban'
    },

    // Detailed address (optional)
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true }
    },

    // ============================================
    // Medical Information
    // ============================================

    // Description of symptoms
    symptoms: {
        type: String,
        required: [true, 'Symptoms description is required'],
        trim: true,
        maxlength: [1000, 'Symptoms description cannot exceed 1000 characters']
    },

    // Symptom severity score (1-10)
    severityScore: {
        type: Number,
        required: [true, 'Severity score is required'],
        min: [1, 'Severity must be at least 1'],
        max: [10, 'Severity cannot exceed 10']
    },

    // Has chronic illness flag (for ML scoring)
    chronicIllness: {
        type: Boolean,
        required: true,
        default: false
    },

    // List of chronic conditions (if any)
    chronicConditions: [{
        type: String,
        trim: true
    }],

    // ============================================
    // Emergency Flag
    // ============================================

    // Emergency patients get top priority
    isEmergency: {
        type: Boolean,
        default: false
    },

    // Emergency description (if emergency)
    emergencyDescription: {
        type: String,
        trim: true
    },

    // ============================================
    // Connectivity Information
    // ============================================

    // Internet reliability (for telemedicine)
    internetReliability: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent'],
        default: 'good'
    },

    // Preferred communication method
    preferredCommunication: {
        type: String,
        enum: ['video', 'audio', 'chat'],
        default: 'video'
    },

    // ============================================
    // Queue Information
    // ============================================

    // When the patient joined the queue
    queueJoinTime: {
        type: Date,
        default: Date.now
    },

    // Current waiting time in minutes (calculated/updated)
    waitingTime: {
        type: Number,
        default: 0,
        min: 0
    },

    // ML-calculated priority score (0-100)
    priorityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Explanation for the priority score (from ML)
    priorityReason: {
        type: String,
        default: ''
    },

    // Current status in the queue
    status: {
        type: String,
        enum: [
            'waiting',           // In queue, waiting for consultation
            'in-consultation',   // Currently being seen
            'completed',         // Consultation finished
            'cancelled',         // Patient cancelled
            'no-show'           // Patient didn't show up
        ],
        default: 'waiting'
    },

    // ============================================
    // Consultation Details
    // ============================================

    // When consultation started
    consultationStartTime: {
        type: Date,
        default: null
    },

    // When consultation ended
    consultationEndTime: {
        type: Date,
        default: null
    },

    // Notes from the consultation
    consultationNotes: {
        type: String,
        trim: true
    },

    // Prescription/follow-up
    prescription: {
        type: String,
        trim: true
    },

    // Follow-up required
    followUpRequired: {
        type: Boolean,
        default: false
    },

    followUpDate: {
        type: Date,
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

// Index for efficient queue queries
patientSchema.index({ clinic: 1, status: 1, priorityScore: -1 });
patientSchema.index({ clinic: 1, queueJoinTime: 1 });
patientSchema.index({ clinic: 1, isEmergency: -1, priorityScore: -1 });

// ============================================
// Virtual Properties
// ============================================

// Virtual for current waiting time (calculated)
patientSchema.virtual('currentWaitingTime').get(function() {
    if (this.status !== 'waiting') {
        return this.waitingTime;
    }
    const now = new Date();
    const joinTime = new Date(this.queueJoinTime);
    return Math.round((now - joinTime) / (1000 * 60)); // Minutes
});

// Virtual for rural flag (for ML input)
patientSchema.virtual('isRural').get(function() {
    return this.location === 'rural' ? 1 : 0;
});

// Virtual for chronic flag (for ML input)
patientSchema.virtual('chronicFlag').get(function() {
    return this.chronicIllness ? 1 : 0;
});

// ============================================
// Pre-save Middleware
// ============================================

/**
 * Update waiting time before save
 */
patientSchema.pre('save', function(next) {
    // Update waiting time if still waiting
    if (this.status === 'waiting') {
        const now = new Date();
        const joinTime = new Date(this.queueJoinTime);
        this.waitingTime = Math.round((now - joinTime) / (1000 * 60));
    }
    next();
});

// ============================================
// Instance Methods
// ============================================

/**
 * Get data formatted for ML prediction
 * @returns {Object} ML input format
 */
patientSchema.methods.getMLInput = function() {
    return {
        age: this.age,
        severity: this.severityScore,
        rural: this.location === 'rural' ? 1 : 0,
        chronic: this.chronicIllness ? 1 : 0,
        waiting_time: this.currentWaitingTime || this.waitingTime
    };
};

/**
 * Update priority from ML prediction
 * @param {number} score - Priority score (0-100)
 * @param {string} reason - Explanation for the score
 */
patientSchema.methods.updatePriority = async function(score, reason) {
    this.priorityScore = score;
    this.priorityReason = reason;
    await this.save();
};

/**
 * Start consultation
 * @param {ObjectId} doctorId - Doctor starting the consultation
 */
patientSchema.methods.startConsultation = async function(doctorId) {
    this.status = 'in-consultation';
    this.consultationStartTime = new Date();
    this.assignedDoctor = doctorId;
    await this.save();
};

/**
 * Complete consultation
 * @param {string} notes - Consultation notes
 * @param {string} prescription - Prescription if any
 */
patientSchema.methods.completeConsultation = async function(notes, prescription = null) {
    this.status = 'completed';
    this.consultationEndTime = new Date();
    this.consultationNotes = notes;
    if (prescription) {
        this.prescription = prescription;
    }
    await this.save();
};

// ============================================
// Static Methods
// ============================================

/**
 * Get optimized queue for a clinic
 * @param {ObjectId} clinicId - Clinic ID
 * @returns {Promise<Array>} Sorted patient queue
 */
patientSchema.statics.getOptimizedQueue = async function(clinicId) {
    // Fetch all waiting patients
    const patients = await this.find({
        clinic: clinicId,
        status: 'waiting'
    }).populate('assignedDoctor', 'name specialization');

    // Sort by: 1) Emergency first, 2) Priority score, 3) Waiting time
    patients.sort((a, b) => {
        // Emergency patients always first
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;

        // Then by priority score (higher first)
        if (a.priorityScore !== b.priorityScore) {
            return b.priorityScore - a.priorityScore;
        }

        // Finally by waiting time (longer waits first)
        return b.waitingTime - a.waitingTime;
    });

    return patients;
};

/**
 * Get queue statistics for a clinic
 * @param {ObjectId} clinicId - Clinic ID
 */
patientSchema.statics.getQueueStats = async function(clinicId) {
    const stats = await this.aggregate([
        { $match: { clinic: new mongoose.Types.ObjectId(clinicId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgWaitTime: { $avg: '$waitingTime' },
                avgPriority: { $avg: '$priorityScore' }
            }
        }
    ]);

    const result = {
        waiting: 0,
        inConsultation: 0,
        completed: 0,
        cancelled: 0,
        averageWaitTime: 0,
        averagePriority: 0
    };

    stats.forEach(stat => {
        switch (stat._id) {
            case 'waiting':
                result.waiting = stat.count;
                result.averageWaitTime = Math.round(stat.avgWaitTime || 0);
                result.averagePriority = Math.round(stat.avgPriority || 0);
                break;
            case 'in-consultation':
                result.inConsultation = stat.count;
                break;
            case 'completed':
                result.completed = stat.count;
                break;
            case 'cancelled':
            case 'no-show':
                result.cancelled += stat.count;
                break;
        }
    });

    return result;
};

// ============================================
// Password Hashing Middleware
// ============================================
patientSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ============================================
// Instance Methods
// ============================================

// Compare password for login
patientSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
patientSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: 'patient' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

module.exports = mongoose.model('Patient', patientSchema);
