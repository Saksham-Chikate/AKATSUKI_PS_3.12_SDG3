/**
 * Add Patient Page
 * ================
 * Form for adding new patients to the queue.
 * Collects all required information for ML priority scoring.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patientAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiAlertTriangle,
  FiActivity,
  FiHeart,
  FiWifi,
} from 'react-icons/fi';

export default function AddPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    email: '',
    location: 'urban',
    symptoms: '',
    severityScore: '5',
    chronicIllness: false,
    chronicConditions: '',
    isEmergency: false,
    emergencyDescription: '',
    internetReliability: 'good',
    preferredCommunication: 'video',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.age || !formData.phone || !formData.symptoms) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        age: parseInt(formData.age),
        phone: formData.phone,
        email: formData.email || undefined,
        location: formData.location as 'rural' | 'urban',
        symptoms: formData.symptoms,
        severityScore: parseInt(formData.severityScore),
        chronicIllness: formData.chronicIllness,
        chronicConditions: formData.chronicConditions
          ? formData.chronicConditions.split(',').map((s) => s.trim())
          : [],
        isEmergency: formData.isEmergency,
        emergencyDescription: formData.isEmergency ? formData.emergencyDescription : undefined,
        internetReliability: formData.internetReliability,
        preferredCommunication: formData.preferredCommunication,
      };

      const response = await patientAPI.create(payload);
      
      if (response.success) {
        toast.success(
          `Patient added with priority score: ${response.data.patient.priorityScore}`
        );
        router.push('/dashboard/queue');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add patient';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Patient</h1>
        <p className="text-gray-600">
          Enter patient details for AI-powered priority scoring
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiUser className="h-5 w-5 mr-2 text-primary-600" />
              Personal Information
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="label">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="label">
                Age *
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="0"
                max="150"
                value={formData.age}
                onChange={handleChange}
                className="input"
                placeholder="45"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Elderly patients (65+) receive higher priority
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="label">
                <FiPhone className="h-4 w-4 inline mr-1" />
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                <FiMail className="h-4 w-4 inline mr-1" />
                Email (Optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="patient@email.com"
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiMapPin className="h-5 w-5 mr-2 text-primary-600" />
              Location Information
            </h2>
          </div>
          <div className="card-body">
            <div>
              <label htmlFor="location" className="label">
                Location Type *
              </label>
              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="urban">Urban</option>
                <option value="rural">Rural</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Rural patients receive +10 priority uplift for fairness
              </p>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiActivity className="h-5 w-5 mr-2 text-primary-600" />
              Medical Information
            </h2>
          </div>
          <div className="card-body space-y-6">
            {/* Symptoms */}
            <div>
              <label htmlFor="symptoms" className="label">
                Symptoms Description *
              </label>
              <textarea
                id="symptoms"
                name="symptoms"
                rows={3}
                value={formData.symptoms}
                onChange={handleChange}
                className="input"
                placeholder="Describe the patient's symptoms..."
                required
              />
            </div>

            {/* Severity Score */}
            <div>
              <label htmlFor="severityScore" className="label">
                Severity Score (1-10) *
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="severityScore"
                  name="severityScore"
                  type="range"
                  min="1"
                  max="10"
                  value={formData.severityScore}
                  onChange={handleChange}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-2xl font-bold ${
                  parseInt(formData.severityScore) >= 8 ? 'text-red-600' :
                  parseInt(formData.severityScore) >= 5 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {formData.severityScore}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Chronic Illness */}
            <div>
              <div className="flex items-center">
                <input
                  id="chronicIllness"
                  name="chronicIllness"
                  type="checkbox"
                  checked={formData.chronicIllness}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="chronicIllness" className="ml-2 text-sm text-gray-700">
                  <FiHeart className="h-4 w-4 inline mr-1 text-red-500" />
                  Patient has chronic illness
                </label>
              </div>
              {formData.chronicIllness && (
                <div className="mt-3">
                  <label htmlFor="chronicConditions" className="label">
                    Chronic Conditions (comma-separated)
                  </label>
                  <input
                    id="chronicConditions"
                    name="chronicConditions"
                    type="text"
                    value={formData.chronicConditions}
                    onChange={handleChange}
                    className="input"
                    placeholder="Diabetes, Hypertension, Asthma"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Flag */}
        <div className="card border-red-200">
          <div className="card-header bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 flex items-center">
              <FiAlertTriangle className="h-5 w-5 mr-2" />
              Emergency Status
            </h2>
          </div>
          <div className="card-body">
            <div className="flex items-center">
              <input
                id="isEmergency"
                name="isEmergency"
                type="checkbox"
                checked={formData.isEmergency}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <label htmlFor="isEmergency" className="ml-2 text-sm text-gray-700">
                This is an EMERGENCY case (will be prioritized to TOP of queue)
              </label>
            </div>
            {formData.isEmergency && (
              <div className="mt-3">
                <label htmlFor="emergencyDescription" className="label">
                  Emergency Description
                </label>
                <textarea
                  id="emergencyDescription"
                  name="emergencyDescription"
                  rows={2}
                  value={formData.emergencyDescription}
                  onChange={handleChange}
                  className="input border-red-300"
                  placeholder="Describe the emergency situation..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Connectivity Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiWifi className="h-5 w-5 mr-2 text-primary-600" />
              Connectivity Information
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Internet Reliability */}
            <div>
              <label htmlFor="internetReliability" className="label">
                Internet Reliability
              </label>
              <select
                id="internetReliability"
                name="internetReliability"
                value={formData.internetReliability}
                onChange={handleChange}
                className="input"
              >
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
                <option value="excellent">Excellent</option>
              </select>
            </div>

            {/* Preferred Communication */}
            <div>
              <label htmlFor="preferredCommunication" className="label">
                Preferred Communication
              </label>
              <select
                id="preferredCommunication"
                name="preferredCommunication"
                value={formData.preferredCommunication}
                onChange={handleChange}
                className="input"
              >
                <option value="video">Video Call</option>
                <option value="audio">Audio Call</option>
                <option value="chat">Chat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Add Patient to Queue'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
