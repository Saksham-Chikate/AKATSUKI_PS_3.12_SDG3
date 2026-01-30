/**
 * Database Configuration
 * ======================
 * Handles MongoDB Atlas connection using Mongoose ODM.
 * 
 * Connection string is loaded from environment variables for security.
 * Includes retry logic and connection event handlers.
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas
 * 
 * @returns {Promise<void>}
 * @throws {Error} If connection fails after retries
 */
const connectDB = async () => {
    try {
        // Get MongoDB URI from environment
        const mongoURI = process.env.MONGO_URI;
        
        if (!mongoURI) {
            throw new Error(
                'MONGO_URI not found in environment variables. ' +
                'Please check your .env file.'
            );
        }

        // Mongoose connection options
        const options = {
            // These options are now default in Mongoose 6+, but explicit for clarity
            maxPoolSize: 10,           // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,    // Close sockets after 45s of inactivity
        };

        console.log('📡 Connecting to MongoDB Atlas...');
        
        // Attempt connection
        const conn = await mongoose.connect(mongoURI, options);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`   Database: ${conn.connection.name}`);

        // ============================================
        // Connection Event Handlers
        // ============================================

        // Handle connection errors after initial connection
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
        });

        // Handle disconnection
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });

        // Handle reconnection
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        
        // Provide helpful error messages for common issues
        if (error.message.includes('ENOTFOUND')) {
            console.error('   ➡️ Check if your MongoDB Atlas cluster is running');
            console.error('   ➡️ Verify your internet connection');
        } else if (error.message.includes('authentication failed')) {
            console.error('   ➡️ Check your database username and password');
            console.error('   ➡️ Ensure user has correct permissions');
        } else if (error.message.includes('IP')) {
            console.error('   ➡️ Add your IP address to MongoDB Atlas Network Access');
            console.error('   ➡️ Or allow access from anywhere (0.0.0.0/0) for development');
        }
        
        // Exit process on connection failure
        process.exit(1);
    }
};

module.exports = connectDB;
