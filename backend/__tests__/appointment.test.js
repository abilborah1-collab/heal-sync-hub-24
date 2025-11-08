const request = require('supertest');
const { app } = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const jwt = require('jsonwebtoken');

describe('Appointment Endpoints', () => {
  let adminToken, doctorToken, patientToken;
  let adminUser, doctorUser, patientUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    doctorUser = await User.create({
      email: 'doctor@test.com',
      password: 'password123',
      firstName: 'Doctor',
      lastName: 'Smith',
      role: 'doctor',
      specialization: 'Cardiology'
    });

    patientUser = await User.create({
      email: 'patient@test.com',
      password: 'password123',
      firstName: 'Patient',
      lastName: 'Doe',
      role: 'patient'
    });

    // Generate tokens
    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
    doctorToken = jwt.sign({ id: doctorUser._id }, process.env.JWT_SECRET);
    patientToken = jwt.sign({ id: patientUser._id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Appointment.deleteMany({});
  });

  describe('POST /api/appointments', () => {
    it('should create appointment with valid data', async () => {
      const appointmentData = {
        patient: patientUser._id,
        doctor: doctorUser._id,
        appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        appointmentTime: '10:00 AM',
        reason: 'Regular checkup',
        duration: 30
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe(appointmentData.reason);
      expect(response.body.data.status).toBe('scheduled');
    });

    it('should not create appointment without authentication', async () => {
      const appointmentData = {
        patient: patientUser._id,
        doctor: doctorUser._id,
        appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        appointmentTime: '10:00 AM',
        reason: 'Regular checkup'
      };

      await request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .expect(401);
    });
  });

  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      await Appointment.create({
        patient: patientUser._id,
        doctor: doctorUser._id,
        appointmentDate: new Date(Date.now() + 86400000),
        appointmentTime: '10:00 AM',
        reason: 'Regular checkup',
        status: 'scheduled'
      });
    });

    it('should get all appointments for admin', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should get only doctor appointments for doctor role', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(apt => {
        expect(apt.doctor._id.toString()).toBe(doctorUser._id.toString());
      });
    });

    it('should get only patient appointments for patient role', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(apt => {
        expect(apt.patient._id.toString()).toBe(patientUser._id.toString());
      });
    });
  });

  describe('PATCH /api/appointments/:id/status', () => {
    let appointmentId;

    beforeEach(async () => {
      const appointment = await Appointment.create({
        patient: patientUser._id,
        doctor: doctorUser._id,
        appointmentDate: new Date(Date.now() + 86400000),
        appointmentTime: '10:00 AM',
        reason: 'Regular checkup',
        status: 'scheduled'
      });
      appointmentId = appointment._id;
    });

    it('should update appointment status', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });

    it('should not allow patient to update status', async () => {
      await request(app)
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: 'completed' })
        .expect(403);
    });
  });
});
