const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLogger');

router.use(protect);

router.route('/summary/:patientId')
  .get(patientController.getPatientSummary)
  .post(
    authorize('admin', 'doctor'),
    logAudit('create', 'patient'),
    patientController.createPatientSummary
  )
  .put(
    authorize('admin', 'doctor'),
    logAudit('update', 'patient'),
    patientController.updatePatientSummary
  );

router.post('/summary/:patientId/medical-record',
  authorize('doctor', 'admin'),
  logAudit('create', 'patient'),
  patientController.addMedicalRecord
);

module.exports = router;
