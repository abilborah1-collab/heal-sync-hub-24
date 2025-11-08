const PatientSummary = require('../models/PatientSummary');
const logger = require('../utils/logger');

// @desc    Get patient summary
// @route   GET /api/patients/summary/:patientId
// @access  Private
exports.getPatientSummary = async (req, res) => {
  try {
    const summary = await PatientSummary.findOne({ patient: req.params.patientId })
      .populate('patient', 'firstName lastName email phone')
      .populate('medicalHistory.doctor', 'firstName lastName specialization');

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Patient summary not found'
      });
    }

    // Check authorization
    if (req.user.role === 'patient' && summary.patient._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this patient summary'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get patient summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient summary'
    });
  }
};

// @desc    Create patient summary
// @route   POST /api/patients/summary/:patientId
// @access  Private (Admin, Doctor)
exports.createPatientSummary = async (req, res) => {
  try {
    req.body.patient = req.params.patientId;

    const summary = await PatientSummary.create(req.body);

    const populatedSummary = await PatientSummary.findById(summary._id)
      .populate('patient', 'firstName lastName email phone');

    logger.info(`Patient summary created for patient: ${req.params.patientId}`);

    res.status(201).json({
      success: true,
      data: populatedSummary
    });
  } catch (error) {
    logger.error('Create patient summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating patient summary'
    });
  }
};

// @desc    Update patient summary
// @route   PUT /api/patients/summary/:patientId
// @access  Private (Admin, Doctor)
exports.updatePatientSummary = async (req, res) => {
  try {
    const summary = await PatientSummary.findOneAndUpdate(
      { patient: req.params.patientId },
      req.body,
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName email phone')
    .populate('medicalHistory.doctor', 'firstName lastName specialization');

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Patient summary not found'
      });
    }

    logger.info(`Patient summary updated for patient: ${req.params.patientId}`);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Update patient summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient summary'
    });
  }
};

// @desc    Add medical record to patient summary
// @route   POST /api/patients/summary/:patientId/medical-record
// @access  Private (Doctor, Admin)
exports.addMedicalRecord = async (req, res) => {
  try {
    const { diagnosis, treatment, notes } = req.body;

    const medicalRecord = {
      date: new Date(),
      diagnosis,
      treatment,
      notes,
      doctor: req.user.id
    };

    const summary = await PatientSummary.findOneAndUpdate(
      { patient: req.params.patientId },
      { $push: { medicalHistory: medicalRecord } },
      { new: true, upsert: true }
    )
    .populate('patient', 'firstName lastName email phone')
    .populate('medicalHistory.doctor', 'firstName lastName specialization');

    logger.info(`Medical record added for patient: ${req.params.patientId}`);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Add medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding medical record'
    });
  }
};
