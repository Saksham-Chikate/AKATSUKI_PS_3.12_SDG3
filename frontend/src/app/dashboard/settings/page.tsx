/**
 * Settings Page
 * =============
 * Clinic settings and configuration.
 */

'use client';

import { useState, useEffect } from 'react';
import { clinicAPI, authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { FiSave, FiLock } from 'react-icons/fi';

export default function SettingsPage() {
  const { clinic, updateClinic } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    phone: '',
    locationType: 'urban',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (clinic) {
      setSettings({
        name: clinic.name || '',
        phone: '',
        locationType: clinic.locationType || 'urban',
      });
    }

    // Fetch full settings
    const fetchSettings = async () => {
      try {
        const response = await clinicAPI.getSettings();
        if (response.success) {
          setSettings({
            name: response.data.clinic.name || '',
            phone: response.data.clinic.phone || '',
            locationType: response.data.clinic.locationType || 'urban',
          });
        }
      } catch (error) {
        console.error('Failed to fetch settings');
      }
    };

    fetchSettings();
  }, [clinic]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await clinicAPI.updateSettings(settings);
      if (response.success) {
        updateClinic({ name: settings.name });
        toast.success('Settings saved successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword(passwords.currentPassword, passwords.newPassword);
      toast.success('Password changed successfully');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your clinic settings and account</p>
      </div>

      {/* Clinic Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Clinic Information</h2>
        </div>
        <form onSubmit={handleSaveSettings} className="card-body space-y-6">
          <div>
            <label htmlFor="name" className="label">Clinic Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={settings.name}
              onChange={handleSettingsChange}
              className="input"
              placeholder="Your Clinic Name"
            />
          </div>

          <div>
            <label htmlFor="phone" className="label">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={settings.phone}
              onChange={handleSettingsChange}
              className="input"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="locationType" className="label">Location Type</label>
            <select
              id="locationType"
              name="locationType"
              value={settings.locationType}
              onChange={handleSettingsChange}
              className="input"
            >
              <option value="urban">Urban</option>
              <option value="suburban">Suburban</option>
              <option value="rural">Rural</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary">
              <FiSave className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiLock className="h-5 w-5 mr-2" />
            Change Password
          </h2>
        </div>
        <form onSubmit={handleChangePassword} className="card-body space-y-6">
          <div>
            <label htmlFor="currentPassword" className="label">Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={handlePasswordChange}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="label">New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              className="input"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary">
              <FiLock className="h-4 w-4 mr-2" />
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Email</span>
              <span className="text-gray-900">{clinic?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Clinic ID</span>
              <span className="text-gray-900 font-mono text-sm">{clinic?.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
