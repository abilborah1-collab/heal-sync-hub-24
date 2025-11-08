# Healthcare Management System - Backend API

A comprehensive healthcare management system backend built with Node.js, Express, MongoDB, and Socket.io.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Doctor, Patient)
- **Appointment Management**: Schedule, manage, and track patient appointments
- **Patient Medical Summaries**: Maintain detailed patient medical records and history
- **Real-Time Updates**: WebSocket integration for instant appointment status notifications
- **Analytics Dashboard**: Generate insights on patient visits and appointment patterns
- **Post-Visit Reports**: PDF generation for completed appointments
- **Email Notifications**: Automated email alerts for appointments (optional)
- **Audit Logging**: Complete audit trail of all system changes
- **Comprehensive Testing**: Unit tests for critical endpoints
- **Docker Support**: Easy deployment with Docker and docker-compose

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Real-Time**: Socket.io
- **Logging**: Winston & Morgan
- **Email**: Nodemailer
- **PDF Generation**: PDFKit
- **Testing**: Jest & Supertest
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Docker & Docker Compose (optional)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
cd backend
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update environment variables in `.env`

### Running with Docker

```bash
docker-compose up -d
```

This will start both MongoDB and the backend API.

### Running Locally

Make sure MongoDB is running, then:

```bash
npm run dev
```

## API Documentation

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient",
  "phone": "+1234567890"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient"
  }
}
```

### Appointments

#### Create Appointment
```
POST /api/appointments
Authorization: Bearer {token}
Content-Type: application/json

{
  "patient": "patient_id",
  "doctor": "doctor_id",
  "appointmentDate": "2024-12-01",
  "appointmentTime": "10:00 AM",
  "reason": "Regular checkup",
  "duration": 30
}
```

#### Get All Appointments
```
GET /api/appointments
Authorization: Bearer {token}

Query Parameters:
- status: scheduled|confirmed|completed|cancelled
- date: YYYY-MM-DD
- doctor: doctor_id
- patient: patient_id
```

#### Update Appointment Status
```
PATCH /api/appointments/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "completed"
}
```

### Patient Management

#### Get Patient Summary
```
GET /api/patients/summary/:patientId
Authorization: Bearer {token}
```

#### Add Medical Record
```
POST /api/patients/summary/:patientId/medical-record
Authorization: Bearer {token}
Content-Type: application/json

{
  "diagnosis": "Hypertension",
  "treatment": "Prescribed medication",
  "notes": "Follow-up in 2 weeks"
}
```

### Analytics

#### Get Overview
```
GET /api/analytics/overview
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": {
    "totalPatients": 150,
    "totalDoctors": 10,
    "totalAppointments": 500,
    "completedAppointments": 450,
    "pendingAppointments": 50
  }
}
```

#### Get Appointment Analytics
```
GET /api/analytics/appointments?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {token}
```

### Reports

#### Generate Appointment Report
```
GET /api/reports/appointment/:id
Authorization: Bearer {token}
```

Returns a PDF file for download.

## WebSocket Events

Connect to WebSocket server:
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Listen for appointment updates
socket.on('appointmentCreated', (data) => {
  console.log('New appointment:', data);
});

socket.on('appointmentUpdated', (data) => {
  console.log('Appointment updated:', data);
});

socket.on('appointmentStatusUpdated', (data) => {
  console.log('Status updated:', data);
});
```

## Role-Based Access Control

### Admin
- Full access to all endpoints
- Can manage appointments, users, and view analytics
- Can delete appointments

### Doctor
- View and manage their own appointments
- Update appointment status and add notes
- View patient summaries
- Generate post-visit reports
- View analytics

### Patient
- View their own appointments
- Create new appointment requests
- View their own medical summary
- Receive real-time notifications

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Logging

Logs are stored in the `logs` directory:
- `combined.log`: All logs
- `error.log`: Error logs only

In development, logs are also output to the console with color coding.

## Email Configuration

To enable email notifications:

1. Set up an email service (Gmail, SendGrid, etc.)
2. Update `.env` with email credentials:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

Note: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

## Security Best Practices

- All passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- Role-based access control
- Input validation using express-validator
- Audit logging for all critical operations
- CORS configuration for frontend integration
- Environment variables for sensitive data

## Project Structure

```
backend/
├── __tests__/           # Test files
├── controllers/         # Request handlers
├── models/             # Mongoose models
├── routes/             # API routes
├── middleware/         # Custom middleware
├── socket/             # WebSocket handlers
├── utils/              # Utility functions
├── logs/               # Log files
├── server.js           # Main application file
├── Dockerfile          # Docker configuration
└── docker-compose.yml  # Docker Compose configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT
