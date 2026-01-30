/**
 * Doctors Management Page
 * =======================
 * Manage doctors for the clinic.
 */

'use client';

import { useState, useEffect } from 'react';
import { doctorAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
} from 'react-icons/fi';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  specialization: string;
  yearsOfExperience: number;
  isAvailable: boolean;
  isActive: boolean;
  currentPatientLoad: number;
  maxPatientLoad: number;
}

const SPECIALIZATIONS = [
  'General Practice',
  'Internal Medicine',
  'Pediatrics',
  'Family Medicine',
  'Emergency Medicine',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Psychiatry',
  'Orthopedics',
  'Other',
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: 'General Practice',
    yearsOfExperience: '0',
  });

  const fetchDoctors = async () => {
    try {
      const response = await doctorAPI.getAll();
      if (response.success) {
        setDoctors(response.data.doctors);
      }
    } catch (error) {
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      specialization: 'General Practice',
      yearsOfExperience: '0',
    });
    setEditingDoctor(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.licenseNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        licenseNumber: formData.licenseNumber,
        specialization: formData.specialization,
        yearsOfExperience: parseInt(formData.yearsOfExperience),
      };

      if (editingDoctor) {
        await doctorAPI.update(editingDoctor._id, payload);
        toast.success('Doctor updated successfully');
      } else {
        await doctorAPI.create(payload);
        toast.success('Doctor added successfully');
      }

      resetForm();
      fetchDoctors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone || '',
      licenseNumber: doctor.licenseNumber,
      specialization: doctor.specialization,
      yearsOfExperience: doctor.yearsOfExperience.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor?')) return;

    try {
      await doctorAPI.delete(id);
      toast.success('Doctor removed');
      fetchDoctors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove doctor');
    }
  };

  const handleToggleAvailability = async (id: string) => {
    try {
      const response = await doctorAPI.toggleAvailability(id);
      toast.success(response.message);
      fetchDoctors();
    } catch (error) {
      toast.error('Failed to update availability');
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-gray-600">Manage your clinic's healthcare providers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          <FiPlus className="h-4 w-4 mr-2" />
          Add Doctor
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card animate-fade-in">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="label">Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Dr. John Smith"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="doctor@clinic.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="label">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label htmlFor="licenseNumber" className="label">License Number *</label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="input"
                  placeholder="MD-12345"
                  required
                />
              </div>
              <div>
                <label htmlFor="specialization" className="label">Specialization *</label>
                <select
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="input"
                >
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="yearsOfExperience" className="label">Years of Experience</label>
                <input
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Doctors List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            All Doctors ({doctors.length})
          </h2>
        </div>
        {doctors.length === 0 ? (
          <div className="p-12 text-center">
            <FiUser className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No doctors yet</h3>
            <p className="text-gray-600">Add your first doctor to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {doctors.map((doctor) => (
              <div key={doctor._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <FiUser className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{doctor.name}</p>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <FiMail className="h-3 w-3 mr-1" />
                          {doctor.email}
                        </span>
                        {doctor.phone && (
                          <span className="flex items-center">
                            <FiPhone className="h-3 w-3 mr-1" />
                            {doctor.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Patients: {doctor.currentPatientLoad}/{doctor.maxPatientLoad}
                      </p>
                      <button
                        onClick={() => handleToggleAvailability(doctor._id)}
                        className={`mt-1 text-xs px-2 py-1 rounded-full ${
                          doctor.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {doctor.isAvailable ? (
                          <><FiCheck className="h-3 w-3 inline mr-1" />Available</>
                        ) : (
                          <><FiX className="h-3 w-3 inline mr-1" />Unavailable</>
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(doctor)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doctor._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
