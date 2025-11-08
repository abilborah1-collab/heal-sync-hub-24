const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  diagnosis: String,
  treatment: String,
  notes: String,
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const patientSummarySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  allergies: [{
    type: String,
    trim: true
  }],
  chronicConditions: [{
    type: String,
    trim: true
  }],
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String
  }],
  medicalHistory: [medicalRecordSchema],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  lastVisit: {
    type: Date
  },
  totalVisits: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PatientSummary', patientSummarySchema);
