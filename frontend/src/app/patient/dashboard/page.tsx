'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { patientAuthAPI } from '@/lib/api';

interface Patient {
  _id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  location: string;
  symptoms: string;
  severityScore: number;
  chronicIllness: boolean;
  chronicConditions: string[];
  status: string;
  priorityScore: number;
  priorityReason: string;
  queueJoinTime: string;
  clinic?: {
    name: string;
    phone?: string;
  };
  assignedDoctor?: {
    name: string;
    specialization?: string;
  };
}

interface QueueStatus {
  position: number | null;
  totalInQueue: number;
  status: string;
  priorityScore: number;
  priorityReason: string;
  estimatedWait: number;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    symptoms: '',
    severityScore: 5,
    chronicIllness: false,
    chronicConditions: '',
  });

  useEffect(() => {
    const userType = localStorage.getItem('userType');
    if (userType !== 'patient') {
      router.push('/patient/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [profileRes, queueRes] = await Promise.all([
        patientAuthAPI.getMe(),
        patientAuthAPI.getQueueStatus(),
      ]);

      if (profileRes.success) {
        setPatient(profileRes.patient);
        setFormData({
          name: profileRes.patient.name,
          phone: profileRes.patient.phone,
          symptoms: profileRes.patient.symptoms,
          severityScore: profileRes.patient.severityScore,
          chronicIllness: profileRes.patient.chronicIllness,
          chronicConditions: profileRes.patient.chronicConditions?.join(', ') || '',
        });
      }

      if (queueRes.success) {
        setQueueStatus(queueRes.queueStatus);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('patient');
    localStorage.removeItem('userType');
    router.push('/patient/login');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await patientAuthAPI.updateProfile({
        ...formData,
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(c => c.trim()) : [],
      });

      if (response.success) {
        setPatient(response.patient);
        setEditing(false);
        fetchData(); // Refresh queue status
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'in-consultation': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Patient Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {patient?.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Queue Status Card */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Queue Status</h2>
              <p className="text-green-100">
                {patient?.clinic?.name || 'Healthcare Center'}
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                queueStatus?.status === 'waiting' ? 'bg-yellow-400 text-yellow-900' :
                queueStatus?.status === 'in-consultation' ? 'bg-green-400 text-green-900' :
                'bg-blue-400 text-blue-900'
              }`}>
                {queueStatus?.status?.replace('-', ' ').toUpperCase() || 'N/A'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">
                {queueStatus?.position || '-'}
              </div>
              <div className="text-sm text-green-100">Queue Position</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">
                {queueStatus?.totalInQueue || 0}
              </div>
              <div className="text-sm text-green-100">Total in Queue</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">
                {queueStatus?.priorityScore || 0}
              </div>
              <div className="text-sm text-green-100">Priority Score</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">
                ~{queueStatus?.estimatedWait || 0}
              </div>
              <div className="text-sm text-green-100">Est. Wait (min)</div>
            </div>
          </div>

          {queueStatus?.priorityReason && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">Priority Factors:</span> {queueStatus.priorityReason}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Your Information</h3>
              <button
                onClick={() => setEditing(!editing)}
                className="text-sm font-medium text-green-600 hover:text-green-700"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                  <textarea
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity: {formData.severityScore}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.severityScore}
                    onChange={(e) => setFormData({ ...formData, severityScore: parseInt(e.target.value) })}
                    className="w-full accent-green-600"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="chronicEdit"
                    checked={formData.chronicIllness}
                    onChange={(e) => setFormData({ ...formData, chronicIllness: e.target.checked })}
                    className="w-4 h-4 text-green-600"
                  />
                  <label htmlFor="chronicEdit" className="text-sm text-gray-700">Chronic conditions</label>
                </div>
                {formData.chronicIllness && (
                  <input
                    type="text"
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                    placeholder="List conditions (comma-separated)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                )}
                <button
                  type="submit"
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium">{patient?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{patient?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-medium">{patient?.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Age</span>
                  <span className="font-medium">{patient?.age} years</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Location</span>
                  <span className="font-medium capitalize">{patient?.location}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Severity</span>
                  <span className={`font-medium ${getPriorityColor(patient?.severityScore || 0)}`}>
                    {patient?.severityScore}/10
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Medical Details</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Symptoms</h4>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{patient?.symptoms || 'Not specified'}</p>
              </div>

              {patient?.chronicIllness && patient.chronicConditions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Chronic Conditions</h4>
                  <div className="flex flex-wrap gap-2">
                    {patient.chronicConditions.map((condition, idx) => (
                      <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {patient?.assignedDoctor && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Assigned Doctor</h4>
                  <p className="font-semibold text-blue-900">{patient.assignedDoctor.name}</p>
                  <p className="text-sm text-blue-700">{patient.assignedDoctor.specialization}</p>
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Queue Joined</h4>
                <p className="font-medium text-gray-900">
                  {patient?.queueJoinTime ? new Date(patient.queueJoinTime).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-yellow-800">Important Information</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Your position in the queue is determined by AI-based priority scoring that considers your symptoms, 
                severity, chronic conditions, and other factors. Emergency cases are always prioritized.
                If you experience a medical emergency, please call emergency services immediately.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
