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
 * Local AI Priority Calculator (Fallback when Python AI Engine is unavailable)
 * Uses the same algorithm as the Python model for consistent scoring
 * 
 * Priority Factors (weighted):
 * - Severity (40%): Higher severity = higher priority
 * - Age (25%): Elderly (65+) and very young (<5) get priority
 * - Chronic Illness (20%): Patients with chronic conditions need more attention
 * - Rural Location (10%): Fairness uplift for limited healthcare access
 * - Waiting Time (5%): Longer waits gradually increase priority
 */
const calculateLocalPriority = (patient) => {
    const { age, severityScore, location, chronicIllness, chronicConditions = [], waitingTime = 0 } = patient;
    
    let score = 0;
    const factors = [];
    
    // 1. SEVERITY SCORE (40% weight) - Most important factor
    // Scale: 1-10 -> contributes 0-40 points
    const severityPoints = severityScore * 4;
    score += severityPoints;
    
    if (severityScore >= 8) {
        factors.push('Critical severity');
    } else if (severityScore >= 6) {
        factors.push('High severity');
    } else if (severityScore >= 4) {
        factors.push('Moderate severity');
    } else {
        factors.push('Low severity');
    }
    
    // 2. AGE FACTOR (25% weight)
    // Elderly (65+): +20-25 points based on how old
    // Children (<5): +15 points
    // Middle-aged (50-64): +10 points
    if (age >= 75) {
        score += 25;
        factors.push('elderly patient (75+)');
    } else if (age >= 65) {
        score += 20;
        factors.push('senior patient (65+)');
    } else if (age >= 50) {
        score += 10;
        factors.push('middle-aged patient');
    } else if (age < 5) {
        score += 15;
        factors.push('infant/toddler');
    } else if (age < 12) {
        score += 8;
        factors.push('child patient');
    }
    
    // 3. CHRONIC ILLNESS (20% weight)
    // Base: +10 points for any chronic illness
    // Additional: +3 points per condition (max +15 extra)
    if (chronicIllness) {
        score += 10;
        const conditionCount = chronicConditions.length || 1;
        const extraPoints = Math.min(conditionCount * 3, 15);
        score += extraPoints;
        
        if (conditionCount >= 3) {
            factors.push(`multiple chronic conditions (${conditionCount})`);
        } else if (conditionCount > 0) {
            factors.push('chronic illness');
        }
    }
    
    // 4. RURAL LOCATION FAIRNESS (10% weight)
    // Rural patients face connectivity and access challenges
    if (location === 'rural') {
        score += 10;
        factors.push('rural location (fairness uplift)');
    }
    
    // 5. WAITING TIME (5% weight)
    // +1 point per 10 minutes waited, max +10 points
    const waitingBonus = Math.min(Math.floor(waitingTime / 10), 10);
    if (waitingBonus > 0) {
        score += waitingBonus;
        if (waitingTime >= 60) {
            factors.push('long wait time');
        } else if (waitingTime >= 30) {
            factors.push('moderate wait time');
        }
    }
    
    // Clamp score to 0-100 range
    score = Math.min(100, Math.max(0, score));
    
    // Determine priority level for explanation
    let priorityLevel;
    if (score >= 80) {
        priorityLevel = 'HIGH PRIORITY';
    } else if (score >= 60) {
        priorityLevel = 'MEDIUM-HIGH PRIORITY';
    } else if (score >= 40) {
        priorityLevel = 'MEDIUM PRIORITY';
    } else {
        priorityLevel = 'LOW PRIORITY';
    }
    
    // Build reason string
    const reason = factors.length > 0 
        ? `${priorityLevel}: ${factors.join(', ')}`
        : `${priorityLevel}: Standard case`;
    
    return {
        priority_score: Math.round(score),
        reason: reason
    };
};

/**
 * Get priority from AI Engine or fallback to local calculation
 */
const getPriorityScore = async (patient, waitingTime) => {
    try {
        // Try Python AI Engine first
        const response = await axios.post(
            `${AI_ENGINE_URL}/predict`,
            {
                age: patient.age,
                severity: patient.severityScore,
                rural: patient.location === 'rural' ? 1 : 0,
                chronic: patient.chronicIllness ? 1 : 0,
                waiting_time: waitingTime
            },
            { timeout: 2000 }
        );
        return response.data;
    } catch (error) {
        // Fallback to local AI calculation
        return calculateLocalPriority({
            ...patient.toObject ? patient.toObject() : patient,
            waitingTime
        });
    }
};

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

            // Recalculate priority using AI (local or remote)
            try {
                const aiResult = await getPriorityScore(patient, waitingTime);
                
                patient.waitingTime = waitingTime;
                patient.priorityScore = aiResult.priority_score;
                patient.priorityReason = aiResult.reason;
                await patient.save();
            } catch (aiError) {
                // Just update waiting time if AI fails
                patient.waitingTime = waitingTime;
                await patient.save();
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

                // Use AI priority calculation (local or remote)
                const aiResult = await getPriorityScore(patient, waitingTime);

                patient.waitingTime = waitingTime;
                patient.priorityScore = aiResult.priority_score;
                patient.priorityReason = aiResult.reason;
                await patient.save();
                updated++;
            } catch (err) {
                failed++;
            }
        }

        res.json({
            success: true,
            message: `AI priorities recalculated. Updated: ${updated}, Failed: ${failed}`,
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
