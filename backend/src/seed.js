/**
 * Database Seed Script
 * ====================
 * Populates the database with mock data for testing
 * Includes: 1 Clinic, 3 Doctors, 25 Patients with realistic medical data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Clinic = require('./models/Clinic');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

// Mock data arrays for realistic generation
const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'William', 'Jennifer', 'James', 'Maria', 'Thomas', 'Patricia', 'Charles', 'Linda', 'Daniel', 'Barbara', 'Matthew', 'Elizabeth', 'Anthony', 'Susan', 'Mark', 'Jessica', 'Donald'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris'];

const symptoms = [
    { text: 'Persistent headache and dizziness for 3 days', severity: 5 },
    { text: 'Severe chest pain radiating to left arm', severity: 9 },
    { text: 'High fever (103°F) with body aches', severity: 7 },
    { text: 'Mild cough and runny nose', severity: 2 },
    { text: 'Difficulty breathing and wheezing', severity: 8 },
    { text: 'Abdominal pain and nausea for 2 days', severity: 6 },
    { text: 'Skin rash spreading across body', severity: 4 },
    { text: 'Joint pain and swelling in knees', severity: 5 },
    { text: 'Blurred vision and eye strain', severity: 4 },
    { text: 'Severe back pain limiting mobility', severity: 7 },
    { text: 'Anxiety and difficulty sleeping', severity: 5 },
    { text: 'Chronic fatigue lasting weeks', severity: 6 },
    { text: 'Sudden weight loss without diet change', severity: 7 },
    { text: 'Recurring migraines with aura', severity: 6 },
    { text: 'Numbness and tingling in extremities', severity: 7 },
    { text: 'Persistent sore throat and difficulty swallowing', severity: 5 },
    { text: 'Irregular heartbeat noticed frequently', severity: 8 },
    { text: 'Memory issues and confusion', severity: 7 },
    { text: 'Severe allergic reaction with hives', severity: 8 },
    { text: 'Depression symptoms affecting daily life', severity: 6 },
    { text: 'Stomach ulcer symptoms with blood in stool', severity: 9 },
    { text: 'Diabetes symptoms - excessive thirst and urination', severity: 7 },
    { text: 'Post-surgical follow-up required', severity: 4 },
    { text: 'Routine health checkup needed', severity: 1 },
    { text: 'Medication refill and blood pressure check', severity: 3 }
];

const chronicConditions = [
    ['Diabetes Type 2'],
    ['Hypertension'],
    ['Asthma'],
    ['Heart Disease', 'Hypertension'],
    ['Diabetes Type 1', 'Thyroid Disorder'],
    ['Arthritis'],
    ['COPD'],
    ['Chronic Kidney Disease'],
    ['Depression', 'Anxiety'],
    []  // No chronic conditions
];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seed...\n');

        // Clear existing patients and doctors only, keep existing clinics
        await Patient.deleteMany({});
        await Doctor.deleteMany({});
        console.log('🗑️  Cleared existing patients and doctors');

        // Find existing clinic or create new one
        let clinic = await Clinic.findOne({});
        
        if (clinic) {
            console.log(`🏥 Using existing clinic: ${clinic.name}`);
            console.log(`   📧 Login with your existing credentials\n`);
        } else {
            // Create Clinic only if none exists
            const hashedClinicPassword = await bcrypt.hash('clinic123', 10);
            clinic = await Clinic.create({
                name: 'HealthFirst Medical Center',
                email: 'admin@healthfirst.com',
                password: hashedClinicPassword,
                phone: '+1-555-123-4567',
                address: {
                    street: '123 Medical Plaza',
                    city: 'Healthcare City',
                    state: 'CA',
                    zipCode: '90210',
                    country: 'USA'
                },
                specialty: ['General Medicine', 'Internal Medicine', 'Emergency Care'],
                operatingHours: {
                    monday: { open: '08:00', close: '20:00' },
                    tuesday: { open: '08:00', close: '20:00' },
                    wednesday: { open: '08:00', close: '20:00' },
                    thursday: { open: '08:00', close: '20:00' },
                    friday: { open: '08:00', close: '18:00' },
                    saturday: { open: '09:00', close: '14:00' },
                    sunday: { open: 'closed', close: 'closed' }
                },
                isActive: true
            });
            console.log('🏥 Created clinic: HealthFirst Medical Center');
            console.log('   📧 Login: admin@healthfirst.com / clinic123\n');
        }

        // Create Doctors
        const doctors = await Doctor.create([
            {
                clinic: clinic._id,
                name: 'Dr. Sarah Mitchell',
                email: 'dr.mitchell@healthfirst.com',
                phone: '+1-555-111-2222',
                specialization: 'Internal Medicine',
                qualifications: ['MD', 'Board Certified Internal Medicine'],
                experience: 12,
                isAvailable: true,
                consultationDuration: 20,
                maxPatientsPerDay: 25,
                licenseNumber: 'CA-MED-2012-001'
            },
            {
                clinic: clinic._id,
                name: 'Dr. James Wilson',
                email: 'dr.wilson@healthfirst.com',
                phone: '+1-555-222-3333',
                specialization: 'Emergency Medicine',
                licenseNumber: 'CA-MED-2008-042',
                qualifications: ['MD', 'FACEP', 'Board Certified Emergency Medicine'],
                experience: 15,
                isAvailable: true,
                consultationDuration: 15,
                maxPatientsPerDay: 30,
                licenseNumber: 'CA-MED-2008-042'
            },
            {
                clinic: clinic._id,
                name: 'Dr. Emily Chen',
                email: 'dr.chen@healthfirst.com',
                phone: '+1-555-333-4444',
                specialization: 'Family Medicine',
                qualifications: ['MD', 'Board Certified Family Medicine'],
                experience: 8,
                isAvailable: true,
                consultationDuration: 25,
                maxPatientsPerDay: 20,
                licenseNumber: 'CA-MED-2016-089'
            }
        ]);
        console.log('👨‍⚕️ Created 3 doctors');

        // Create 25 Patients with realistic data
        const patients = [];
        const hashedPatientPassword = await bcrypt.hash('patient123', 10);

        for (let i = 0; i < 25; i++) {
            const symptom = symptoms[i % symptoms.length];
            const chronic = chronicConditions[Math.floor(Math.random() * chronicConditions.length)];
            const isRural = Math.random() > 0.7; // 30% rural patients
            const isEmergency = symptom.severity >= 9;
            const age = Math.floor(Math.random() * 70) + 18; // 18-87 years old

            // Calculate waiting time based on position
            const waitingTime = Math.floor(Math.random() * 120) + 5; // 5-125 minutes

            // Calculate priority score (simulating ML output)
            let priorityScore = symptom.severity * 8; // Base score from severity
            if (isRural) priorityScore += 10; // Rural bonus
            if (chronic.length > 0) priorityScore += 5 * chronic.length; // Chronic condition bonus
            if (age > 65) priorityScore += 10; // Elderly bonus
            if (age < 18) priorityScore += 5; // Child bonus
            priorityScore = Math.min(100, Math.max(0, priorityScore + Math.floor(Math.random() * 10) - 5));

            // Generate priority reason
            const reasons = [];
            if (isEmergency) reasons.push('EMERGENCY CASE');
            if (symptom.severity >= 7) reasons.push(`High severity (${symptom.severity}/10)`);
            if (isRural) reasons.push('Rural area access consideration');
            if (chronic.length > 0) reasons.push(`Chronic conditions: ${chronic.join(', ')}`);
            if (age > 65) reasons.push('Elderly patient priority');
            if (waitingTime > 60) reasons.push(`Extended wait time (${waitingTime} min)`);

            const patient = {
                clinic: clinic._id,
                assignedDoctor: doctors[i % doctors.length]._id,
                name: `${firstNames[i]} ${lastNames[i]}`,
                email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@email.com`,
                password: hashedPatientPassword,
                phone: `+1-555-${String(100 + i).padStart(3, '0')}-${String(1000 + i * 37).slice(-4)}`,
                age: age,
                location: isRural ? 'rural' : 'urban',
                address: {
                    street: `${100 + i} ${isRural ? 'Country Road' : 'Main Street'}`,
                    city: isRural ? 'Rural Township' : 'Metro City',
                    state: 'CA',
                    zipCode: `9${String(1000 + i).slice(-4)}`
                },
                symptoms: symptom.text,
                severityScore: symptom.severity,
                chronicIllness: chronic.length > 0,
                chronicConditions: chronic,
                isEmergency: isEmergency,
                emergencyDescription: isEmergency ? 'Requires immediate attention - critical symptoms' : '',
                internetReliability: isRural ? (Math.random() > 0.5 ? 'fair' : 'poor') : 'good',
                preferredCommunication: 'video',
                queueJoinTime: new Date(Date.now() - waitingTime * 60 * 1000),
                waitingTime: waitingTime,
                priorityScore: priorityScore,
                priorityReason: reasons.length > 0 ? reasons.join(' | ') : 'Standard priority',
                status: i < 20 ? 'waiting' : (i < 23 ? 'in-consultation' : 'completed')
            };

            patients.push(patient);
        }

        await Patient.insertMany(patients);
        console.log('👥 Created 25 patients with mock medical data');
        console.log('   📧 Patient login: [firstname].[lastname]@email.com / patient123');

        // Summary
        console.log('\n========================================');
        console.log('✅ Database seeded successfully!');
        console.log('========================================');
        console.log('\n📊 Summary:');
        console.log('   • 1 Clinic (HealthFirst Medical Center)');
        console.log('   • 3 Doctors');
        console.log('   • 25 Patients (20 waiting, 3 in-consultation, 2 completed)');
        console.log('\n🔐 Login Credentials:');
        console.log('   Clinic: admin@healthfirst.com / clinic123');
        console.log('   Patient: john.smith@email.com / patient123');
        console.log('\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

// Run seed
connectDB().then(seedDatabase);
