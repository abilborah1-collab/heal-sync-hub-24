const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const PatientSummary = require('../models/PatientSummary');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/emailService');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
  try {
    const { status, date, doctor, patient } = req.query;
    const query = {};

    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }
    if (doctor) query.doctor = doctor;
    if (patient) query.patient = patient;

    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctor = req.user.id;
    } else if (req.user.role === 'patient') {
      query.patient = req.user.id;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    logger.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments'
    });
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check authorization
    if (req.user.role === 'patient' && appointment.patient._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this appointment'
      });
    }

    if (req.user.role === 'doctor' && appointment.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this appointment'
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    logger.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment'
    });
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private (Admin, Doctor, Patient)
exports.createAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    req.body.createdBy = req.user.id;
    
    const appointment = await Appointment.create(req.body);
    
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email');

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user_${appointment.patient}`).emit('appointmentCreated', populatedAppointment);
    io.to(`user_${appointment.doctor}`).emit('appointmentCreated', populatedAppointment);

    // Send email notifications
    try {
      await sendEmail({
        to: populatedAppointment.patient.email,
        subject: 'Appointment Scheduled',
        text: `Your appointment has been scheduled for ${appointment.appointmentDate.toDateString()} at ${appointment.appointmentTime}`
      });

      await sendEmail({
        to: populatedAppointment.doctor.email,
        subject: 'New Appointment',
        text: `New appointment scheduled with ${populatedAppointment.patient.firstName} ${populatedAppointment.patient.lastName} on ${appointment.appointmentDate.toDateString()} at ${appointment.appointmentTime}`
      });
    } catch (emailError) {
      logger.error('Email notification error:', emailError);
    }

    logger.info(`Appointment created: ${appointment._id}`);

    res.status(201).json({
      success: true,
      data: populatedAppointment
    });
  } catch (error) {
    logger.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appointment'
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (Admin, Doctor)
exports.updateAppointment = async (req, res) => {
  try {
    req.body.modifiedBy = req.user.id;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName email')
    .populate('doctor', 'firstName lastName specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user_${appointment.patient._id}`).emit('appointmentUpdated', appointment);
    io.to(`user_${appointment.doctor._id}`).emit('appointmentUpdated', appointment);

    logger.info(`Appointment updated: ${appointment._id}`);

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    logger.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appointment'
    });
  }
};

// @desc    Update appointment status
// @route   PATCH /api/appointments/:id/status
// @access  Private (Admin, Doctor)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, modifiedBy: req.user.id },
      { new: true, runValidators: true }
    )
    .populate('patient', 'firstName lastName email')
    .populate('doctor', 'firstName lastName specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update patient summary if completed
    if (status === 'completed') {
      await PatientSummary.findOneAndUpdate(
        { patient: appointment.patient._id },
        {
          $inc: { totalVisits: 1 },
          lastVisit: new Date()
        },
        { upsert: true }
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user_${appointment.patient._id}`).emit('appointmentStatusUpdated', appointment);

    // Send email notification
    try {
      await sendEmail({
        to: appointment.patient.email,
        subject: 'Appointment Status Updated',
        text: `Your appointment status has been updated to: ${status}`
      });
    } catch (emailError) {
      logger.error('Email notification error:', emailError);
    }

    logger.info(`Appointment status updated: ${appointment._id} - ${status}`);

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    logger.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appointment status'
    });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Admin)
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await appointment.deleteOne();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user_${appointment.patient}`).emit('appointmentDeleted', { id: req.params.id });
    io.to(`user_${appointment.doctor}`).emit('appointmentDeleted', { id: req.params.id });

    logger.info(`Appointment deleted: ${req.params.id}`);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting appointment'
    });
  }
};

// @desc    Get doctor's appointments
// @route   GET /api/appointments/doctor/:doctorId
// @access  Private
exports.getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.params.doctorId })
      .populate('patient', 'firstName lastName email phone')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    logger.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor appointments'
    });
  }
};

// @desc    Get patient's appointments
// @route   GET /api/appointments/patient/:patientId
// @access  Private
exports.getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.params.patientId })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    logger.error('Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient appointments'
    });
  }
};
