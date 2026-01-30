/**
 * Model Index
 * ===========
 * Central export point for all Mongoose models.
 */

const Clinic = require('./Clinic');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const Appointment = require('./Appointment');

module.exports = {
    Clinic,
    Doctor,
    Patient,
    Appointment
};
