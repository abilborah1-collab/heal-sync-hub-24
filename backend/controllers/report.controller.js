const PDFDocument = require('pdfkit');
const Appointment = require('../models/Appointment');
const PatientSummary = require('../models/PatientSummary');
const logger = require('../utils/logger');

// @desc    Generate post-visit appointment report
// @route   GET /api/reports/appointment/:id
// @access  Private (Admin, Doctor)
exports.generateAppointmentReport = async (req, res) => {
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

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Report can only be generated for completed appointments'
      });
    }

    const patientSummary = await PatientSummary.findOne({ patient: appointment.patient._id });

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=appointment-report-${appointment._id}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('Medical Visit Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Date: ${appointment.appointmentDate.toDateString()}`);
    doc.text(`Time: ${appointment.appointmentTime}`);
    doc.moveDown();

    doc.fontSize(14).text('Patient Information', { underline: true });
    doc.fontSize(12)
      .text(`Name: ${appointment.patient.firstName} ${appointment.patient.lastName}`)
      .text(`Email: ${appointment.patient.email}`)
      .text(`Phone: ${appointment.patient.phone || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Doctor Information', { underline: true });
    doc.fontSize(12)
      .text(`Name: Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`)
      .text(`Specialization: ${appointment.doctor.specialization || 'General'}`);
    doc.moveDown();

    doc.fontSize(14).text('Visit Details', { underline: true });
    doc.fontSize(12)
      .text(`Reason for Visit: ${appointment.reason}`)
      .text(`Diagnosis: ${appointment.diagnosis || 'Not specified'}`)
      .text(`Notes: ${appointment.notes || 'None'}`);
    doc.moveDown();

    if (appointment.prescription) {
      doc.fontSize(14).text('Prescription', { underline: true });
      doc.fontSize(12).text(appointment.prescription);
      doc.moveDown();
    }

    if (patientSummary) {
      doc.fontSize(14).text('Medical History Summary', { underline: true });
      doc.fontSize(12)
        .text(`Blood Type: ${patientSummary.bloodType || 'Not specified'}`)
        .text(`Allergies: ${patientSummary.allergies.join(', ') || 'None'}`)
        .text(`Chronic Conditions: ${patientSummary.chronicConditions.join(', ') || 'None'}`)
        .text(`Total Visits: ${patientSummary.totalVisits}`);
    }

    doc.moveDown();
    doc.fontSize(10).text('This is a computer-generated report.', { align: 'center' });

    // Finalize PDF
    doc.end();

    logger.info(`Report generated for appointment: ${appointment._id}`);
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
};
