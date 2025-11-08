const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/appointment/:id',
  authorize('admin', 'doctor'),
  reportController.generateAppointmentReport
);

module.exports = router;
