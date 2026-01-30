# Telemedicine Queue Optimization SaaS

A production-ready full-stack telemedicine application that uses AI/ML to optimize patient queue prioritization for clinics.

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│    Backend      │────▶│   AI Engine     │
│   (Next.js)     │     │   (Express)     │     │   (FastAPI)     │
│   Port: 3000    │     │   Port: 5000    │     │   Port: 8000    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │  MongoDB Atlas  │
                        │                 │
                        └─────────────────┘
```

## 📁 Project Structure

```
├── frontend/           # Next.js frontend application
├── backend/            # Express.js REST API server
├── ai-engine/          # Python FastAPI ML service
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- MongoDB Atlas account (free tier works)

### 1. Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account or sign in
3. Create a new cluster (free tier M0)
4. Click "Connect" on your cluster
5. Choose "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your database user password
8. Replace `<dbname>` with `telemedicine`

Your connection string should look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/telemedicine?retryWrites=true&w=majority
```

### 2. Setup AI Engine (Python)

```bash
cd ai-engine

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the AI engine
python main.py
```

The AI engine will start on `http://localhost:8000`

### 3. Setup Backend (Node.js)

```bash
cd backend

# Install dependencies
npm install

# Copy environment file and configure
copy .env.example .env
# Edit .env with your MongoDB URI and secrets

# Run the backend
npm run dev
```

The backend will start on `http://localhost:5000`

### 4. Setup Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local

# Run the frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

## 🔑 Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/telemedicine?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
AI_ENGINE_URL=http://localhost:8000
PORT=5000
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📋 Features

### Authentication
- JWT-based clinic authentication
- Protected routes on frontend and backend
- Session management

### Patient Intake
- Complete patient registration with:
  - Demographics (age, location)
  - Medical info (symptoms, severity, chronic conditions)
  - Connectivity info (internet reliability)
  - Emergency flagging

### ML Priority Scoring
- XGBoost-based priority scoring model
- Factors considered:
  - Age (elderly patients prioritized)
  - Severity score (1-10)
  - Rural/Urban location
  - Chronic illness presence
  - Current waiting time
- Explainable AI with reason generation

### Queue Optimization
- Emergency patients always first
- ML-based priority scoring
- Rural fairness uplift (+10 points)
- Waiting time consideration
- Real-time queue updates

### Clinic Dashboard
- Live patient queue view
- Color-coded priority levels
- Priority score explanations
- Patient management actions

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new clinic
- `POST /api/auth/login` - Login clinic
- `GET /api/auth/me` - Get current clinic

### Patients
- `POST /api/patients` - Add new patient
- `GET /api/patients` - Get all patients for clinic
- `GET /api/patients/queue` - Get optimized queue
- `PATCH /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Remove patient

### AI Engine
- `POST /predict` - Get priority score
- `GET /health` - Health check

## 🤖 ML Model Details

The priority scoring model uses XGBoost regression trained on synthetic healthcare data.

**Input Features:**
- `age`: Patient age (0-100)
- `severity`: Symptom severity (1-10)
- `rural`: Rural location flag (0/1)
- `chronic`: Chronic illness flag (0/1)
- `waiting_time`: Minutes waiting (0+)

**Output:**
- `priority_score`: 0-100 score
- `reason`: Human-readable explanation

**Fairness Logic:**
- Rural patients receive +10 priority uplift
- Elderly patients (65+) receive additional priority
- Chronic conditions increase priority

## 📝 License

MIT License - Feel free to use for your startup!

## 🆘 Troubleshooting

### MongoDB Connection Issues
1. Ensure your IP is whitelisted in MongoDB Atlas Network Access
2. Check username/password are correct
3. Verify the database name in connection string

### AI Engine Issues
1. Ensure Python virtual environment is activated
2. Check all dependencies are installed
3. Verify port 8000 is available

### CORS Issues
1. Backend CORS is configured for localhost:3000
2. For production, update CORS origins
