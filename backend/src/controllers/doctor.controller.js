/**
 * Doctor Controller
 * =================
 * Handles doctor management operations.
 */

const { Doctor, Patient } = require('../models');

/**
 * @desc    Create new doctor
 * @route   POST /api/doctors
 * @access  Private
 */
const createDoctor = async (req, res, next) => {
    try {
        const doctorData = {
            ...req.body,
            clinic: req.clinicId
        };

        const doctor = await Doctor.create(doctorData);

        res.status(201).json({
            success: true,
            message: 'Doctor added successfully',
            data: { doctor }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all doctors for clinic
 * @route   GET /api/doctors
 * @access  Private
 */
const getDoctors = async (req, res, next) => {
    try {
        const { active, available, specialization } = req.query;

        const query = { clinic: req.clinicId };

        if (active !== undefined) {
            query.isActive = active === 'true';
        }
        if (available !== undefined) {
            query.isAvailable = available === 'true';
        }
        if (specialization) {
            query.specialization = specialization;
        }

        const doctors = await Doctor.find(query)
            .sort({ name: 1 });

        res.json({
            success: true,
            data: { 
                doctors,
                count: doctors.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single doctor
 * @route   GET /api/doctors/:id
 * @access  Private
 */
const getDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Get current patients assigned to this doctor
        const currentPatients = await Patient.find({
            assignedDoctor: doctor._id,
            status: { $in: ['waiting', 'in-consultation'] }
        }).select('name status priorityScore');

        res.json({
            success: true,
            data: { 
                doctor,
                currentPatients
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update doctor
 * @route   PUT /api/doctors/:id
 * @access  Private
 */
const updateDoctor = async (req, res, next) => {
    try {
        const allowedUpdates = [
            'name', 'email', 'phone', 'specialization',
            'yearsOfExperience', 'isAvailable', 'isActive',
            'maxPatientLoad', 'profileImage'
        ];

        const updates = {};
        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const doctor = await Doctor.findOneAndUpdate(
            { _id: req.params.id, clinic: req.clinicId },
            updates,
            { new: true, runValidators: true }
        );

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        res.json({
            success: true,
            message: 'Doctor updated successfully',
            data: { doctor }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete doctor
 * @route   DELETE /api/doctors/:id
 * @access  Private
 */
const deleteDoctor = async (req, res, next) => {
    try {
        // Check if doctor has active patients
        const activePatients = await Patient.countDocuments({
            assignedDoctor: req.params.id,
            status: { $in: ['waiting', 'in-consultation'] }
        });

        if (activePatients > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete doctor with ${activePatients} active patient(s). Please reassign them first.`
            });
        }

        const doctor = await Doctor.findOneAndDelete({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        res.json({
            success: true,
            message: 'Doctor removed successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get available doctors
 * @route   GET /api/doctors/available
 * @access  Private
 */
const getAvailableDoctors = async (req, res, next) => {
    try {
        const { specialization } = req.query;

        const doctors = await Doctor.findAvailableDoctors(
            req.clinicId,
            specialization
        );

        res.json({
            success: true,
            data: { doctors }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Toggle doctor availability
 * @route   POST /api/doctors/:id/toggle-availability
 * @access  Private
 */
const toggleAvailability = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({
            _id: req.params.id,
            clinic: req.clinicId
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        doctor.isAvailable = !doctor.isAvailable;
        await doctor.save();

        res.json({
            success: true,
            message: `Doctor is now ${doctor.isAvailable ? 'available' : 'unavailable'}`,
            data: { 
                isAvailable: doctor.isAvailable 
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createDoctor,
    getDoctors,
    getDoctor,
    updateDoctor,
    deleteDoctor,
    getAvailableDoctors,
    toggleAvailability
};
