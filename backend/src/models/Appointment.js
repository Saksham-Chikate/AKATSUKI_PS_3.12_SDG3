/**
 * Appointment Model
 * =================
 * Represents a scheduled telemedicine appointment.
 * Can be created from the queue when a patient is selected for consultation.
 */

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    // Reference to the clinic
    clinic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
        required: [true, 'Clinic reference is required']
    },

    // Reference to the patient
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'Patient reference is required']
    },

    // Reference to the doctor
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: [true, 'Doctor reference is required']
    },

    // Scheduled date and time
    scheduledTime: {
        type: Date,
        required: [true, 'Scheduled time is required']
    },

    // Duration in minutes
    duration: {
        type: Number,
        default: 30,
        min: [5, 'Appointment must be at least 5 minutes'],
        max: [120, 'Appointment cannot exceed 2 hours']
    },

    // Appointment type
    type: {
        type: String,
        enum: ['initial', 'follow-up', 'emergency', 'routine'],
        default: 'initial'
    },

    // Communication method
    communicationMethod: {
        type: String,
        enum: ['video', 'audio', 'chat'],
        default: 'video'
    },

    // Appointment status
    status: {
        type: String,
        enum: [
            'scheduled',
            'confirmed',
            'in-progress',
            'completed',
            'cancelled',
            'no-show',
            'rescheduled'
        ],
        default: 'scheduled'
    },

    // Priority score (from ML)
    priorityScore: {
        type: Number,
        default: 0
    },

    // Reason for appointment
    reason: {
        type: String,
        trim: true
    },

    // Pre-appointment notes
    preNotes: {
        type: String,
        trim: true
    },

    // Post-appointment notes
    postNotes: {
        type: String,
        trim: true
    },

    // Actual start time
    actualStartTime: {
        type: Date
    },

    // Actual end time
    actualEndTime: {
        type: Date
    },

    // Meeting link (for video calls)
    meetingLink: {
        type: String,
        trim: true
    },

    // Cancellation reason (if cancelled)
    cancellationReason: {
        type: String,
        trim: true
    },

    // Follow-up created
    followUpAppointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============================================
// Indexes
// ============================================

appointmentSchema.index({ clinic: 1, scheduledTime: 1 });
appointmentSchema.index({ doctor: 1, scheduledTime: 1 });
appointmentSchema.index({ patient: 1, status: 1 });
appointmentSchema.index({ clinic: 1, status: 1 });

// ============================================
// Virtual Properties
// ============================================

// Check if appointment can be started
appointmentSchema.virtual('canStart').get(function() {
    return this.status === 'scheduled' || this.status === 'confirmed';
});

// Get actual duration
appointmentSchema.virtual('actualDuration').get(function() {
    if (this.actualStartTime && this.actualEndTime) {
        return Math.round(
            (this.actualEndTime - this.actualStartTime) / (1000 * 60)
        );
    }
    return null;
});

// ============================================
// Instance Methods
// ============================================

/**
 * Start the appointment
 */
appointmentSchema.methods.start = async function() {
    if (!this.canStart) {
        throw new Error('Cannot start appointment in current status');
    }
    this.status = 'in-progress';
    this.actualStartTime = new Date();
    await this.save();
};

/**
 * Complete the appointment
 * @param {string} notes - Post-appointment notes
 */
appointmentSchema.methods.complete = async function(notes = '') {
    this.status = 'completed';
    this.actualEndTime = new Date();
    this.postNotes = notes;
    await this.save();
};

/**
 * Cancel the appointment
 * @param {string} reason - Cancellation reason
 */
appointmentSchema.methods.cancel = async function(reason = '') {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    await this.save();
};

// ============================================
// Static Methods
// ============================================

/**
 * Get today's appointments for a clinic
 * @param {ObjectId} clinicId - Clinic ID
 */
appointmentSchema.statics.getTodayAppointments = function(clinicId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.find({
        clinic: clinicId,
        scheduledTime: {
            $gte: today,
            $lt: tomorrow
        }
    })
        .populate('patient', 'name age symptoms')
        .populate('doctor', 'name specialization')
        .sort({ scheduledTime: 1 });
};

/**
 * Get upcoming appointments for a doctor
 * @param {ObjectId} doctorId - Doctor ID
 */
appointmentSchema.statics.getDoctorUpcoming = function(doctorId) {
    return this.find({
        doctor: doctorId,
        scheduledTime: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
    })
        .populate('patient', 'name age symptoms priorityScore')
        .sort({ scheduledTime: 1 });
};

module.exports = mongoose.model('Appointment', appointmentSchema);
