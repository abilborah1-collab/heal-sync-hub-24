const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'doctor'));

router.get('/overview', analyticsController.getOverview);
router.get('/appointments', analyticsController.getAppointmentAnalytics);
router.get('/patients', analyticsController.getPatientAnalytics);

module.exports = router;
