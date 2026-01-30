/**
 * Clinic Controller
 * =================
 * Handles clinic management operations.
 */

const { Clinic, Doctor, Patient } = require('../models');

/**
 * @desc    Get clinic dashboard data
 * @route   GET /api/clinics/dashboard
 * @access  Private
 */
const getDashboard = async (req, res, next) => {
    try {
        const clinicId = req.clinicId;

        // Get clinic info
        const clinic = await Clinic.findById(clinicId)
            .select('-password');

        // Get doctor count
        const doctorCount = await Doctor.countDocuments({ 
            clinic: clinicId, 
            isActive: true 
        });

        // Get available doctors
        const availableDoctors = await Doctor.countDocuments({
            clinic: clinicId,
            isActive: true,
            isAvailable: true,
            $expr: { $lt: ['$currentPatientLoad', '$maxPatientLoad'] }
        });

        // Get patient stats
        const patientStats = await Patient.getQueueStats(clinicId);

        // Get today's date range
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Get patients added today
        const patientsToday = await Patient.countDocuments({
            clinic: clinicId,
            createdAt: { $gte: todayStart }
        });

        // Get consultations completed today
        const completedToday = await Patient.countDocuments({
            clinic: clinicId,
            status: 'completed',
            consultationEndTime: { $gte: todayStart }
        });

        res.json({
            success: true,
            data: {
                clinic: {
                    name: clinic.name,
                    email: clinic.email,
                    locationType: clinic.locationType
                },
                stats: {
                    doctors: {
                        total: doctorCount,
                        available: availableDoctors
                    },
                    queue: {
                        waiting: patientStats.waiting,
                        inConsultation: patientStats.inConsultation,
                        completed: patientStats.completed,
                        averageWaitTime: patientStats.averageWaitTime,
                        averagePriority: patientStats.averagePriority
                    },
                    today: {
                        newPatients: patientsToday,
                        completed: completedToday
                    }
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get clinic settings
 * @route   GET /api/clinics/settings
 * @access  Private
 */
const getSettings = async (req, res, next) => {
    try {
        const clinic = await Clinic.findById(req.clinicId)
            .select('name email phone address locationType specialties operatingHours');

        res.json({
            success: true,
            data: { clinic }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update clinic settings
 * @route   PUT /api/clinics/settings
 * @access  Private
 */
const updateSettings = async (req, res, next) => {
    try {
        const allowedUpdates = [
            'name', 'phone', 'address', 'locationType', 
            'specialties', 'operatingHours'
        ];

        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const clinic = await Clinic.findByIdAndUpdate(
            req.clinicId,
            { ...updates, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: { clinic }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboard,
    getSettings,
    updateSettings
};
