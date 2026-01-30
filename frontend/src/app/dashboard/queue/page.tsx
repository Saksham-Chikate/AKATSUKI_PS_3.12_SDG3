/**
 * Patient Queue Page
 * ==================
 * Live patient queue with ML-based priority sorting.
 * Shows optimized queue with priority scores and explanations.
 */

'use client';

import { useState, useEffect } from 'react';
import { queueAPI, patientAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiRefreshCw,
  FiAlertTriangle,
  FiClock,
  FiMapPin,
  FiActivity,
  FiPlay,
  FiCheck,
  FiX,
  FiInfo,
} from 'react-icons/fi';

interface Patient {
  _id: string;
  name: string;
  age: number;
  phone: string;
  location: 'rural' | 'urban';
  symptoms: string;
  severityScore: number;
  chronicIllness: boolean;
  isEmergency: boolean;
  priorityScore: number;
  priorityReason: string;
  waitingTime: number;
  status: string;
  queuePosition: number;
  queueJoinTime: string;
}

interface QueueStats {
  totalWaiting: number;
  emergencies: number;
  avgWaitTime: number;
  avgPriority: number;
}

export default function QueuePage() {
  const [queue, setQueue] = useState<Patient[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const response = await queueAPI.getOptimized();
      if (response.success) {
        setQueue(response.data.queue);
        setStats(response.data.stats);
      }
    } catch (error: any) {
      console.error('Failed to fetch queue:', error);
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const handleRecalculateAll = async () => {
    setRefreshing(true);
    try {
      await queueAPI.recalculateAll();
      toast.success('Priorities recalculated');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to recalculate priorities');
      setRefreshing(false);
    }
  };

  const handleStartConsultation = async (patientId: string) => {
    setActionLoading(patientId);
    try {
      await patientAPI.startConsultation(patientId);
      toast.success('Consultation started');
      fetchQueue();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start consultation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemovePatient = async (patientId: string) => {
    if (!confirm('Are you sure you want to remove this patient from the queue?')) {
      return;
    }
    
    setActionLoading(patientId);
    try {
      await patientAPI.delete(patientId);
      toast.success('Patient removed from queue');
      fetchQueue();
      setSelectedPatient(null);
    } catch (error) {
      toast.error('Failed to remove patient');
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPriorityBadge = (score: number, isEmergency: boolean) => {
    if (isEmergency) return 'badge-emergency';
    if (score >= 80) return 'badge-high';
    if (score >= 50) return 'badge-medium';
    return 'badge-low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Queue</h1>
          <p className="text-gray-600">
            AI-optimized priority queue • Auto-refreshes every 15s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={refreshing}
            className="btn-secondary"
          >
            <FiActivity className={`h-4 w-4 mr-2 ${refreshing ? 'animate-pulse' : ''}`} />
            Recalculate AI
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-primary"
          >
            <FiRefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-600">Total Waiting</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalWaiting}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-600">Emergencies</p>
            <p className="text-2xl font-bold text-red-600">{stats.emergencies}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-600">Avg Wait Time</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgWaitTime} min</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-600">Avg Priority</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.avgPriority}</p>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Optimized Queue
          </h2>
          <p className="text-sm text-gray-600">
            Sorted by: Emergency → Priority Score → Waiting Time
          </p>
        </div>

        {queue.length === 0 ? (
          <div className="p-12 text-center">
            <FiClock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No patients waiting</h3>
            <p className="text-gray-600">The queue is empty. Add a patient to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {queue.map((patient, index) => (
              <div
                key={patient._id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedPatient?._id === patient._id ? 'bg-primary-50' : ''
                }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex items-center gap-4">
                  {/* Position */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                    {patient.queuePosition}
                  </div>

                  {/* Priority Score */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full ${getPriorityColor(
                      patient.priorityScore
                    )} flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {patient.priorityScore}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {patient.name}
                      </p>
                      {patient.isEmergency && (
                        <span className="badge-emergency">
                          <FiAlertTriangle className="h-3 w-3 mr-1" />
                          EMERGENCY
                        </span>
                      )}
                      <span className={getPriorityBadge(patient.priorityScore, patient.isEmergency)}>
                        {patient.priorityScore >= 80 ? 'High' : patient.priorityScore >= 50 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Age: {patient.age}</span>
                      <span className="flex items-center">
                        <FiMapPin className="h-3 w-3 mr-1" />
                        {patient.location}
                      </span>
                      <span>Severity: {patient.severityScore}/10</span>
                      {patient.chronicIllness && (
                        <span className="text-orange-600">Chronic</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {patient.symptoms}
                    </p>
                  </div>

                  {/* Wait Time & Actions */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiClock className="h-4 w-4 mr-1" />
                      <span className="font-medium">{patient.waitingTime} min</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartConsultation(patient._id);
                        }}
                        disabled={actionLoading === patient._id}
                        className="btn-success text-xs px-3 py-1"
                      >
                        <FiPlay className="h-3 w-3 mr-1" />
                        Start
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePatient(patient._id);
                        }}
                        disabled={actionLoading === patient._id}
                        className="btn-danger text-xs px-3 py-1"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Priority Explanation */}
                {selectedPatient?._id === patient._id && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg animate-fade-in">
                    <div className="flex items-start gap-2">
                      <FiInfo className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">AI Priority Explanation</p>
                        <p className="text-sm text-blue-700 mt-1">
                          {patient.priorityReason || 'No explanation available'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Priority Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">High (80-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600">Medium (50-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Low (0-49)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-emergency text-xs">EMERGENCY</span>
            <span className="text-sm text-gray-600">Always first</span>
          </div>
        </div>
      </div>
    </div>
  );
}
