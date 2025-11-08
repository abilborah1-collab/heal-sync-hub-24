const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointment.controller');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLogger');

router.use(protect);

router.route('/')
  .get(appointmentController.getAppointments)
  .post(
    authorize('admin', 'doctor', 'patient'),
    [
      body('doctor').notEmpty(),
      body('patient').notEmpty(),
      body('appointmentDate').isISO8601(),
      body('appointmentTime').notEmpty(),
      body('reason').trim().notEmpty()
    ],
    logAudit('create', 'appointment'),
    appointmentController.createAppointment
  );

router.route('/:id')
  .get(appointmentController.getAppointment)
  .put(
    authorize('admin', 'doctor'),
    logAudit('update', 'appointment'),
    appointmentController.updateAppointment
  )
  .delete(
    authorize('admin'),
    logAudit('delete', 'appointment'),
    appointmentController.deleteAppointment
  );

router.patch('/:id/status',
  authorize('admin', 'doctor'),
  logAudit('update', 'appointment'),
  appointmentController.updateAppointmentStatus
);

router.get('/doctor/:doctorId', appointmentController.getDoctorAppointments);
router.get('/patient/:patientId', appointmentController.getPatientAppointments);

module.exports = router;
