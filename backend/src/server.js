/**
 * Telemedicine Queue Optimization - Backend Server
 * =================================================
 * Main entry point for the Express.js backend server.
 * 
 * This server provides:
 * - RESTful API endpoints for clinics, patients, and queue management
 * - JWT-based authentication
 * - Integration with MongoDB Atlas
 * - Integration with Python AI engine for priority scoring
 * 
 * @author Telemedicine SaaS Team
 * @version 1.0.0
 */

// Load environment variables first (must be at top)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Database connection
const connectDB = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth.routes');
const patientAuthRoutes = require('./routes/patient.auth.routes');
const patientRoutes = require('./routes/patient.routes');
const clinicRoutes = require('./routes/clinic.routes');
const doctorRoutes = require('./routes/doctor.routes');
const queueRoutes = require('./routes/queue.routes');

// Error handler middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// ============================================
// Security Middleware
// ============================================

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});
app.use('/api/', limiter);

// ============================================
// CORS Configuration
// ============================================

const corsOptions = {
    origin: [
        'http://localhost:3000',    // Next.js frontend
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ============================================
// Body Parsing Middleware
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Logging Middleware
// ============================================

// Use 'dev' format for colored output in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Telemedicine API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Mount route handlers
app.use('/api/auth', authRoutes);
app.use('/api/patient-auth', patientAuthRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/queue', queueRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const PORT = process.env.PORT || 5000;

/**
 * Start the server after connecting to database
 */
const startServer = async () => {
    try {
        // Connect to MongoDB Atlas
        await connectDB();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('');
            console.log('🏥 ========================================');
            console.log('   TELEMEDICINE QUEUE OPTIMIZATION API');
            console.log('   ========================================');
            console.log(`   🚀 Server running on port ${PORT}`);
            console.log(`   📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`   🤖 AI Engine: ${process.env.AI_ENGINE_URL}`);
            console.log('   ========================================');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
