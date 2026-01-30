/**
 * Queue Controller
 * ================
 * Handles queue management and optimization.
 * Provides optimized queue view sorted by priority.
 */

const axios = require('axios');
const { Patient } = require('../models');

// AI Engine URL
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * @desc    Get optimized patient queue
 * @route   GET /api/queue
 * @access  Private
 * 
 * Queue Optimization Rules:
 * 1. Emergency patients always on top
 * 2. Otherwise sort by ML priority score
 * 3. Otherwise sort by waiting time (longer waits first)
 * 4. Rural patients have fairness uplift applied in ML score
 */
const getOptimizedQueue = async (req, res, next) => {
    try {
        // Get all waiting patients
        const patients = await Patient.find({
            clinic: req.clinicId,
            status: 'waiting'
        }).populate('assignedDoctor', 'name specialization');

        // Update waiting times and recalculate priorities for all patients
        const now = new Date();
        const updatedPatients = [];

        for (const patient of patients) {
            // Calculate current waiting time
            const joinTime = new Date(patient.queueJoinTime);
            const waitingTime = Math.round((now - joinTime) / (1000 * 60));

            // Only recalculate if waiting time has significantly changed (>5 min)
            if (Math.abs(waitingTime - patient.waitingTime) > 5) {
                try {
                    // Update priority from AI
                    const response = await axios.post(
                        `${AI_ENGINE_URL}/predict`,
                        {
                            age: patient.age,
                            severity: patient.severityScore,
                            rural: patient.location === 'rural' ? 1 : 0,
                            chronic: patient.chronicIllness ? 1 : 0,
                            waiting_time: waitingTime
                        },
                        { timeout: 3000 }
                    );

                    patient.waitingTime = waitingTime;
                    patient.priorityScore = response.data.priority_score;
                    patient.priorityReason = response.data.reason;
                    await patient.save();
                } catch (aiError) {
                    // Just update waiting time if AI fails
                    patient.waitingTime = waitingTime;
                    await patient.save();
                }
            }

            updatedPatients.push(patient);
        }

        // Sort patients by queue optimization rules
        updatedPatients.sort((a, b) => {
            // 1. Emergency patients always first
            if (a.isEmergency && !b.isEmergency) return -1;
            if (!a.isEmergency && b.isEmergency) return 1;

            // 2. Then by priority score (higher first)
            if (a.priorityScore !== b.priorityScore) {
                return b.priorityScore - a.priorityScore;
            }

            // 3. Finally by waiting time (longer waits first)
            return b.waitingTime - a.waitingTime;
        });

        // Add queue position to each patient
        const queueWithPosition = updatedPatients.map((patient, index) => ({
            ...patient.toObject(),
            queuePosition: index + 1
        }));

        res.json({
            success: true,
            data: {
                queue: queueWithPosition,
                stats: {
                    totalWaiting: queueWithPosition.length,
                    emergencies: queueWithPosition.filter(p => p.isEmergency).length,
                    avgWaitTime: queueWithPosition.length > 0
                        ? Math.round(
                            queueWithPosition.reduce((sum, p) => sum + p.waitingTime, 0) / 
                            queueWithPosition.length
                        )
                        : 0,
                    avgPriority: queueWithPosition.length > 0
                        ? Math.round(
                            queueWithPosition.reduce((sum, p) => sum + p.priorityScore, 0) / 
                            queueWithPosition.length
                        )
                        : 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get queue statistics
 * @route   GET /api/queue/stats
 * @access  Private
 */
const getQueueStats = async (req, res, next) => {
    try {
        const stats = await Patient.getQueueStats(req.clinicId);

        // Get additional stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayStats = await Patient.aggregate([
            {
                $match: {
                    clinic: req.clinicId,
                    createdAt: { $gte: todayStart }
                }
            },
            {
                $group: {
                    _id: null,
                    totalToday: { $sum: 1 },
                    completedToday: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    emergenciesToday: {
                        $sum: { $cond: ['$isEmergency', 1, 0] }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                current: stats,
                today: todayStats[0] || {
                    totalToday: 0,
                    completedToday: 0,
                    emergenciesToday: 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Bulk recalculate priorities for all waiting patients
 * @route   POST /api/queue/recalculate
 * @access  Private
 */
const bulkRecalculatePriorities = async (req, res, next) => {
    try {
        const patients = await Patient.find({
            clinic: req.clinicId,
            status: 'waiting'
        });

        const now = new Date();
        let updated = 0;
        let failed = 0;

        for (const patient of patients) {
            try {
                const joinTime = new Date(patient.queueJoinTime);
                const waitingTime = Math.round((now - joinTime) / (1000 * 60));

                const response = await axios.post(
                    `${AI_ENGINE_URL}/predict`,
                    {
                        age: patient.age,
                        severity: patient.severityScore,
                        rural: patient.location === 'rural' ? 1 : 0,
                        chronic: patient.chronicIllness ? 1 : 0,
                        waiting_time: waitingTime
                    },
                    { timeout: 3000 }
                );

                patient.waitingTime = waitingTime;
                patient.priorityScore = response.data.priority_score;
                patient.priorityReason = response.data.reason;
                await patient.save();
                updated++;
            } catch (err) {
                failed++;
            }
        }

        res.json({
            success: true,
            message: `Priorities recalculated. Updated: ${updated}, Failed: ${failed}`,
            data: { updated, failed }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get patients currently in consultation
 * @route   GET /api/queue/in-consultation
 * @access  Private
 */
const getInConsultation = async (req, res, next) => {
    try {
        const patients = await Patient.find({
            clinic: req.clinicId,
            status: 'in-consultation'
        })
            .populate('assignedDoctor', 'name specialization')
            .sort({ consultationStartTime: 1 });

        res.json({
            success: true,
            data: { patients }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get completed patients for today
 * @route   GET /api/queue/completed
 * @access  Private
 */
const getCompleted = async (req, res, next) => {
    try {
        const { date } = req.query;
        
        // Default to today
        const queryDate = date ? new Date(date) : new Date();
        queryDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(queryDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const patients = await Patient.find({
            clinic: req.clinicId,
            status: 'completed',
            consultationEndTime: {
                $gte: queryDate,
                $lt: nextDay
            }
        })
            .populate('assignedDoctor', 'name specialization')
            .sort({ consultationEndTime: -1 });

        res.json({
            success: true,
            data: { 
                patients,
                date: queryDate.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOptimizedQueue,
    getQueueStats,
    bulkRecalculatePriorities,
    getInConsultation,
    getCompleted
};
