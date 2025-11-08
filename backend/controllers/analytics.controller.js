const Appointment = require('../models/Appointment');
const PatientSummary = require('../models/PatientSummary');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get overview analytics
// @route   GET /api/analytics/overview
// @access  Private (Admin, Doctor)
exports.getOverview = async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const pendingAppointments = await Appointment.countDocuments({ 
      status: { $in: ['scheduled', 'confirmed'] }
    });

    res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        completedAppointments,
        pendingAppointments
      }
    });
  } catch (error) {
    logger.error('Get overview analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overview analytics'
    });
  }
};

// @desc    Get appointment analytics
// @route   GET /api/analytics/appointments
// @access  Private (Admin, Doctor)
exports.getAppointmentAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate && endDate) {
      matchQuery.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Appointments by status
    const appointmentsByStatus = await Appointment.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Appointments by date
    const appointmentsByDate = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Appointments by doctor
    const appointmentsByDoctor = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$doctor',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      {
        $project: {
          doctorName: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] },
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byStatus: appointmentsByStatus,
        byDate: appointmentsByDate,
        byDoctor: appointmentsByDoctor
      }
    });
  } catch (error) {
    logger.error('Get appointment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment analytics'
    });
  }
};

// @desc    Get patient analytics
// @route   GET /api/analytics/patients
// @access  Private (Admin, Doctor)
exports.getPatientAnalytics = async (req, res) => {
  try {
    // Most frequent patients
    const frequentPatients = await PatientSummary.find()
      .sort({ totalVisits: -1 })
      .limit(10)
      .populate('patient', 'firstName lastName email');

    // New patients (registered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newPatients = await User.countDocuments({
      role: 'patient',
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        frequentPatients,
        newPatients
      }
    });
  } catch (error) {
    logger.error('Get patient analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient analytics'
    });
  }
};
