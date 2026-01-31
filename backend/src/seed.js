/**
 * Database Seed Script
 * ====================
 * Populates the database with realistic Indian patient data for testing.
 * Creates 25 patients with real medical conditions, symptoms, and demographics.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Clinic = require('./models/Clinic');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

// Realistic Indian patient names
const patientData = [
    { name: 'Rajesh Kumar', age: 58, phone: '+91 98765 43210' },
    { name: 'Priya Sharma', age: 34, phone: '+91 87654 32109' },
    { name: 'Amit Patel', age: 45, phone: '+91 76543 21098' },
    { name: 'Sneha Reddy', age: 28, phone: '+91 65432 10987' },
    { name: 'Vikram Singh', age: 72, phone: '+91 54321 09876' },
    { name: 'Anjali Gupta', age: 41, phone: '+91 43210 98765' },
    { name: 'Rahul Verma', age: 55, phone: '+91 32109 87654' },
    { name: 'Pooja Nair', age: 29, phone: '+91 21098 76543' },
    { name: 'Suresh Iyer', age: 67, phone: '+91 10987 65432' },
    { name: 'Kavita Desai', age: 38, phone: '+91 98712 34567' },
    { name: 'Arjun Mehta', age: 52, phone: '+91 87612 34567' },
    { name: 'Deepika Joshi', age: 31, phone: '+91 76512 34567' },
    { name: 'Manoj Tiwari', age: 48, phone: '+91 65412 34567' },
    { name: 'Sunita Rao', age: 63, phone: '+91 54312 34567' },
    { name: 'Karthik Menon', age: 36, phone: '+91 43212 34567' },
    { name: 'Neha Agarwal', age: 25, phone: '+91 32112 34567' },
    { name: 'Sanjay Pillai', age: 59, phone: '+91 21012 34567' },
    { name: 'Meera Choudhury', age: 44, phone: '+91 10912 34567' },
    { name: 'Arun Saxena', age: 76, phone: '+91 98723 45678' },
    { name: 'Divya Kulkarni', age: 33, phone: '+91 87623 45678' },
    { name: 'Venkat Raman', age: 61, phone: '+91 76523 45678' },
    { name: 'Lakshmi Bhat', age: 49, phone: '+91 65423 45678' },
    { name: 'Prakash Hegde', age: 54, phone: '+91 54323 45678' },
    { name: 'Ananya Mishra', age: 22, phone: '+91 43223 45678' },
    { name: 'Ravi Shankar', age: 68, phone: '+91 32123 45678' }
];

// Realistic medical cases with symptoms, severity, and conditions
const medicalCases = [
    { 
        symptoms: 'Severe chest pain radiating to left arm, shortness of breath, profuse sweating',
        severity: 10, 
        chronic: ['Hypertension', 'Diabetes Type 2'],
        isEmergency: true,
        emergencyDesc: 'Suspected myocardial infarction - needs immediate cardiac care'
    },
    { 
        symptoms: 'High fever (103°F) for 3 days, severe body ache, loss of appetite, weakness',
        severity: 7, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Persistent dry cough for 2 weeks, mild fever, fatigue, reduced oxygen saturation',
        severity: 6, 
        chronic: ['Asthma'],
        isEmergency: false
    },
    { 
        symptoms: 'Severe abdominal pain in lower right quadrant, nausea, fever, loss of appetite',
        severity: 8, 
        chronic: [],
        isEmergency: true,
        emergencyDesc: 'Suspected appendicitis - surgical evaluation needed urgently'
    },
    { 
        symptoms: 'Uncontrolled blood sugar (450 mg/dL), excessive thirst, frequent urination, blurred vision',
        severity: 9, 
        chronic: ['Diabetes Type 2', 'Hypertension', 'Diabetic Retinopathy'],
        isEmergency: true,
        emergencyDesc: 'Diabetic ketoacidosis risk - immediate insulin management required'
    },
    { 
        symptoms: 'Severe migraine with visual aura, nausea, sensitivity to light and sound',
        severity: 6, 
        chronic: ['Chronic Migraine'],
        isEmergency: false
    },
    { 
        symptoms: 'Bilateral joint pain and swelling in knees and hands, morning stiffness for 2 hours',
        severity: 5, 
        chronic: ['Rheumatoid Arthritis'],
        isEmergency: false
    },
    { 
        symptoms: 'Acute breathlessness, wheezing, chest tightness, unable to complete sentences',
        severity: 8, 
        chronic: ['Asthma', 'Allergic Rhinitis'],
        isEmergency: true,
        emergencyDesc: 'Severe asthma exacerbation - needs nebulization and steroids'
    },
    { 
        symptoms: 'Sudden severe headache (thunderclap), blurred vision, BP reading 190/120 mmHg',
        severity: 9, 
        chronic: ['Hypertension', 'Chronic Kidney Disease'],
        isEmergency: true,
        emergencyDesc: 'Hypertensive emergency - needs immediate BP control and monitoring'
    },
    { 
        symptoms: 'Burning micturition, lower abdominal pain, cloudy urine, urgency and frequency',
        severity: 4, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Chronic lower back pain for 6 months, radiating to left leg, numbness in foot',
        severity: 6, 
        chronic: ['Lumbar Spondylosis', 'Sciatica'],
        isEmergency: false
    },
    { 
        symptoms: 'Erythematous skin rash with itching, spreading from trunk to limbs, mild fever',
        severity: 4, 
        chronic: ['Eczema', 'Allergic Dermatitis'],
        isEmergency: false
    },
    { 
        symptoms: 'Profuse watery diarrhea (10+ episodes/day), vomiting, signs of severe dehydration',
        severity: 7, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Severe anxiety, heart palpitations, trembling, panic attacks, insomnia for 2 weeks',
        severity: 5, 
        chronic: ['Generalized Anxiety Disorder', 'Depression'],
        isEmergency: false
    },
    { 
        symptoms: 'Extreme fatigue, unexplained weight gain (8kg in 2 months), cold intolerance, constipation',
        severity: 4, 
        chronic: ['Hypothyroidism'],
        isEmergency: false
    },
    { 
        symptoms: 'Severe allergic reaction after medication, facial and throat swelling, difficulty breathing',
        severity: 10, 
        chronic: ['Multiple Drug Allergies', 'Asthma'],
        isEmergency: true,
        emergencyDesc: 'Anaphylactic reaction - needs immediate epinephrine and airway management'
    },
    { 
        symptoms: 'Blood in stool for 1 week, cramping abdominal pain, unexplained weight loss of 5kg',
        severity: 8, 
        chronic: ['Ulcerative Colitis'],
        isEmergency: false
    },
    { 
        symptoms: 'Productive cough with yellowish sputum, fever, chest pain on breathing, fatigue',
        severity: 6, 
        chronic: ['COPD', 'Chronic Bronchitis'],
        isEmergency: false
    },
    { 
        symptoms: 'Vertigo episodes, loss of balance, tinnitus, nausea, unable to walk straight',
        severity: 5, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Severe toothache radiating to jaw and ear, gum swelling with pus discharge',
        severity: 6, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Progressive numbness and burning in both feet, difficulty walking, poor wound healing',
        severity: 6, 
        chronic: ['Diabetes Type 2', 'Peripheral Neuropathy'],
        isEmergency: false
    },
    { 
        symptoms: 'Irregular heartbeat (AF), fatigue on minimal exertion, swollen ankles, breathlessness',
        severity: 7, 
        chronic: ['Atrial Fibrillation', 'Hypertension', 'Heart Failure'],
        isEmergency: false
    },
    { 
        symptoms: 'Red eye with pain, photophobia, blurred vision, watering, foreign body sensation',
        severity: 5, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Annual health checkup, no active complaints, requires BP and diabetes screening',
        severity: 1, 
        chronic: [],
        isEmergency: false
    },
    { 
        symptoms: 'Follow-up for diabetes management, HbA1c review, medication adjustment needed',
        severity: 3, 
        chronic: ['Diabetes Type 2'],
        isEmergency: false
    }
];

// Indian cities for realistic addresses
const locations = [
    { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', rural: false },
    { city: 'Pune', state: 'Maharashtra', pincode: '411001', rural: false },
    { city: 'Nashik', state: 'Maharashtra', pincode: '422001', rural: true },
    { city: 'Nagpur', state: 'Maharashtra', pincode: '440001', rural: false },
    { city: 'Kolhapur', state: 'Maharashtra', pincode: '416001', rural: true },
    { city: 'Aurangabad', state: 'Maharashtra', pincode: '431001', rural: true },
    { city: 'Thane', state: 'Maharashtra', pincode: '400601', rural: false },
    { city: 'Ratnagiri', state: 'Maharashtra', pincode: '415612', rural: true },
    { city: 'Satara', state: 'Maharashtra', pincode: '415001', rural: true },
    { city: 'Solapur', state: 'Maharashtra', pincode: '413001', rural: true }
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

        // Create Doctors with Indian names
        const doctors = await Doctor.create([
            {
                clinic: clinic._id,
                name: 'Dr. Anil Kapoor',
                email: 'dr.kapoor@clinic.com',
                phone: '+91 98200 12345',
                specialization: 'Internal Medicine',
                qualifications: ['MBBS', 'MD (Internal Medicine)', 'Fellowship in Diabetology'],
                experience: 15,
                isAvailable: true,
                consultationDuration: 20,
                maxPatientsPerDay: 25,
                licenseNumber: 'MH-MED-2009-4521'
            },
            {
                clinic: clinic._id,
                name: 'Dr. Priyanka Deshmukh',
                email: 'dr.deshmukh@clinic.com',
                phone: '+91 98200 23456',
                specialization: 'Emergency Medicine',
                qualifications: ['MBBS', 'MD (Emergency Medicine)', 'FCCS'],
                experience: 12,
                isAvailable: true,
                consultationDuration: 15,
                maxPatientsPerDay: 30,
                licenseNumber: 'MH-MED-2012-7832'
            },
            {
                clinic: clinic._id,
                name: 'Dr. Siddharth Joshi',
                email: 'dr.joshi@clinic.com',
                phone: '+91 98200 34567',
                specialization: 'Family Medicine',
                qualifications: ['MBBS', 'DNB (Family Medicine)', 'Diploma in Geriatric Care'],
                experience: 10,
                isAvailable: true,
                consultationDuration: 25,
                maxPatientsPerDay: 20,
                licenseNumber: 'MH-MED-2014-3298'
            }
        ]);
        console.log('👨‍⚕️ Created 3 doctors');

        // Create 25 Patients with realistic Indian data
        const patients = [];
        const hashedPatientPassword = await bcrypt.hash('patient123', 10);

        for (let i = 0; i < 25; i++) {
            const patientInfo = patientData[i];
            const medicalCase = medicalCases[i];
            const location = locations[i % locations.length];
            
            // Calculate waiting time (randomized between 5-180 minutes)
            const waitingTime = Math.floor(Math.random() * 175) + 5;

            // AI Priority Calculation
            let priorityScore = 0;
            const factors = [];
            
            // Severity (40% weight)
            priorityScore += medicalCase.severity * 4;
            if (medicalCase.severity >= 8) factors.push('Critical severity');
            else if (medicalCase.severity >= 6) factors.push('High severity');
            else if (medicalCase.severity >= 4) factors.push('Moderate severity');
            
            // Age factor (25% weight)
            if (patientInfo.age >= 75) { 
                priorityScore += 25; 
                factors.push('Elderly (75+)');
            } else if (patientInfo.age >= 65) { 
                priorityScore += 20; 
                factors.push('Senior citizen');
            } else if (patientInfo.age >= 50) { 
                priorityScore += 10; 
            }
            
            // Chronic illness (20% weight)
            if (medicalCase.chronic.length > 0) {
                priorityScore += 10 + Math.min(medicalCase.chronic.length * 3, 15);
                if (medicalCase.chronic.length >= 2) {
                    factors.push(`Multiple comorbidities (${medicalCase.chronic.length})`);
                } else {
                    factors.push('Chronic condition');
                }
            }
            
            // Rural location (10% weight)
            if (location.rural) {
                priorityScore += 10;
                factors.push('Rural area - limited access');
            }
            
            // Waiting time bonus (5% weight)
            priorityScore += Math.min(Math.floor(waitingTime / 10), 10);
            if (waitingTime >= 90) factors.push('Long wait (>90 min)');
            
            priorityScore = Math.min(100, Math.max(0, priorityScore));
            
            // Determine priority level
            let priorityLevel;
            if (medicalCase.isEmergency) priorityLevel = '🚨 EMERGENCY';
            else if (priorityScore >= 80) priorityLevel = 'HIGH PRIORITY';
            else if (priorityScore >= 60) priorityLevel = 'MEDIUM-HIGH';
            else if (priorityScore >= 40) priorityLevel = 'MEDIUM';
            else priorityLevel = 'LOW';
            
            const priorityReason = `${priorityLevel}: ${factors.join(', ') || 'Routine case'}`;

            // Generate email from name
            const emailName = patientInfo.name.toLowerCase().replace(/\s+/g, '.');

            const patient = {
                clinic: clinic._id,
                assignedDoctor: doctors[i % doctors.length]._id,
                name: patientInfo.name,
                email: `${emailName}@email.com`,
                password: hashedPatientPassword,
                phone: patientInfo.phone,
                age: patientInfo.age,
                location: location.rural ? 'rural' : 'urban',
                address: {
                    street: `${Math.floor(Math.random() * 500) + 1}, Sector ${Math.floor(Math.random() * 30) + 1}`,
                    city: location.city,
                    state: location.state,
                    zipCode: location.pincode
                },
                symptoms: medicalCase.symptoms,
                severityScore: medicalCase.severity,
                chronicIllness: medicalCase.chronic.length > 0,
                chronicConditions: medicalCase.chronic,
                isEmergency: medicalCase.isEmergency || false,
                emergencyDescription: medicalCase.emergencyDesc || '',
                internetReliability: location.rural ? (Math.random() > 0.5 ? 'fair' : 'poor') : 'good',
                preferredCommunication: 'video',
                queueJoinTime: new Date(Date.now() - waitingTime * 60 * 1000),
                waitingTime: waitingTime,
                priorityScore: priorityScore,
                priorityReason: priorityReason,
                status: i < 20 ? 'waiting' : (i < 23 ? 'in-consultation' : 'completed')
            };

            patients.push(patient);
        }

        await Patient.insertMany(patients);
        console.log('👥 Created 25 patients with realistic Indian medical data');
        console.log('   📧 Patient login: [name]@email.com / patient123');
        console.log('   📧 Example: rajesh.kumar@email.com / patient123');

        // Summary
        console.log('\n========================================');
        console.log('✅ Database seeded successfully!');
        console.log('========================================');
        console.log('\n📊 Summary:');
        console.log(`   • 1 Clinic (${clinic.name})`);
        console.log('   • 3 Doctors (Indian specialists)');
        console.log('   • 25 Patients with realistic medical conditions');
        console.log('   • Includes 5 emergency cases');
        console.log('\n🔐 Sample Login Credentials:');
        console.log('   Patient: rajesh.kumar@email.com / patient123');
        console.log('   Patient: priya.sharma@email.com / patient123');
        console.log('\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

// Run seed
connectDB().then(seedDatabase);
