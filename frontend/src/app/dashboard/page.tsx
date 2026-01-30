/**
 * Doctor/Clinic Dashboard Home Page
 * ==================================
 * Main dashboard with analytics, queue overview, and patient management.
 * Includes priority-sorted patient queue with AI explanations.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clinicAPI, queueAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Patient {
  _id: string;
  name: string;
  age: number;
  symptoms: string;
  severityScore: number;
  priorityScore: number;
  priorityReason: string;
  status: string;
  waitingTime: number;
  isEmergency: boolean;
  location: string;
  chronicIllness: boolean;
  chronicConditions: string[];
  queueJoinTime: string;
}

interface DashboardStats {
  queue: {
    waiting: number;
    inConsultation: number;
    completed: number;
    averageWaitTime: number;
    averagePriority: number;
  };
  doctors: {
    total: number;
    available: number;
  };
  today: {
    newPatients: number;
    completed: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [dashRes, queueRes] = await Promise.all([
        clinicAPI.getDashboard(),
        queueAPI.getOptimized(),
      ]);
      
      if (dashRes.success) {
        setStats(dashRes.data.stats);
      }
      if (queueRes.success) {
        setPatients(queueRes.data.patients || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    toast.success('Dashboard refreshed');
  };

  const handleRecalculateAll = async () => {
    try {
      setRefreshing(true);
      await queueAPI.recalculateAll();
      await fetchDashboard();
      toast.success('All priorities recalculated by AI');
    } catch (error) {
      toast.error('Failed to recalculate priorities');
    } finally {
      setRefreshing(false);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getSeverityBadge = (score: number) => {
    if (score >= 8) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Analytics data from patients
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const emergencyCount = patients.filter(p => p.isEmergency && p.status === 'waiting').length;
  const ruralCount = patients.filter(p => p.location === 'rural' && p.status === 'waiting').length;
  const chronicCount = patients.filter(p => p.chronicIllness && p.status === 'waiting').length;
  const avgSeverity = waitingPatients.length > 0 
    ? (waitingPatients.reduce((sum, p) => sum + p.severityScore, 0) / waitingPatients.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600">AI-powered patient queue management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={refreshing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Recalculate
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link
            href="/dashboard/patients/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Patient
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Waiting</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.queue.waiting || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Consultation</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.queue.inConsultation || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Today</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.queue.completed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Emergency Cases</p>
              <p className="text-3xl font-bold text-gray-900">{emergencyCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Queue Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-purple-200">Avg Wait Time</span>
              <span className="font-bold">{stats?.queue.averageWaitTime || 0} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-200">Avg Priority Score</span>
              <span className="font-bold">{stats?.queue.averagePriority || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-200">Avg Severity</span>
              <span className="font-bold">{avgSeverity}/10</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Patient Demographics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-teal-200">Rural Patients</span>
              <span className="font-bold">{ruralCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-teal-200">Urban Patients</span>
              <span className="font-bold">{waitingPatients.length - ruralCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-teal-200">Chronic Conditions</span>
              <span className="font-bold">{chronicCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Staff Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-orange-200">Total Doctors</span>
              <span className="font-bold">{stats?.doctors.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-200">Available Now</span>
              <span className="font-bold">{stats?.doctors.available || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-200">Patients/Doctor</span>
              <span className="font-bold">
                {stats?.doctors.available ? Math.ceil(waitingPatients.length / stats.doctors.available) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Queue - AI Sorted */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Prioritized Patient Queue</h2>
              <p className="text-sm text-gray-600">Patients sorted by ML priority score (emergency → high priority → waiting time)</p>
            </div>
            <Link href="/dashboard/queue" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Full Queue →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wait Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Reasoning</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patients.slice(0, 10).map((patient, idx) => (
                <tr key={patient._id} className={patient.isEmergency ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-red-500 text-white' : 
                      idx < 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {patient.name}
                        {patient.isEmergency && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">EMERGENCY</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{patient.age} yrs • {patient.location}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getPriorityColor(patient.priorityScore)}`}>
                      {patient.priorityScore}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityBadge(patient.severityScore)}`}></div>
                      <span>{patient.severityScore}/10</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {patient.waitingTime} min
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 max-w-xs truncate" title={patient.priorityReason}>
                      {patient.priorityReason || 'Standard priority'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      patient.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                      patient.status === 'in-consultation' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {patient.status.replace('-', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {patients.length === 0 && (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-4 text-gray-500">No patients in the queue</p>
            <Link href="/dashboard/patients/new" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              Add your first patient →
            </Link>
          </div>
        )}

        {patients.length > 10 && (
          <div className="p-4 bg-gray-50 text-center">
            <Link href="/dashboard/queue" className="text-blue-600 hover:text-blue-700 font-medium">
              View all {patients.length} patients →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
