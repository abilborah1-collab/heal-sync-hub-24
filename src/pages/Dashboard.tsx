import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Activity, Clock, LogOut, FileText } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import AppointmentList from '@/components/AppointmentList';
import CreateAppointment from '@/components/CreateAppointment';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('appointments');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Fetch overview data for admin and doctor
    if (user.role === 'admin' || user.role === 'doctor') {
      api.get('/analytics/overview').then(({ data }) => {
        setOverview(data.data);
      });
    }

    // Setup socket listeners
    const socket = getSocket();
    if (socket) {
      socket.on('appointmentCreated', () => {
        toast.success('New appointment created!');
      });

      socket.on('appointmentUpdated', () => {
        toast.info('Appointment updated');
      });

      socket.on('appointmentStatusUpdated', (data) => {
        toast.info(`Appointment status: ${data.status}`);
      });
    }

    return () => {
      if (socket) {
        socket.off('appointmentCreated');
        socket.off('appointmentUpdated');
        socket.off('appointmentStatusUpdated');
      }
    };
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">HealthCare Portal</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user.firstName} {user.lastName} ({user.role})
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        {(user.role === 'admin' || user.role === 'doctor') && overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalPatients}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalAppointments}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{overview.completedAppointments}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{overview.pendingAppointments}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <Button
            variant={activeTab === 'appointments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Appointments
          </Button>
          
          {(user.role === 'admin' || user.role === 'doctor' || user.role === 'patient') && (
            <Button
              variant={activeTab === 'create' ? 'default' : 'outline'}
              onClick={() => setActiveTab('create')}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          )}
          
          {(user.role === 'admin' || user.role === 'doctor') && (
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              onClick={() => setActiveTab('analytics')}
            >
              <Activity className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'appointments' && <AppointmentList />}
          {activeTab === 'create' && <CreateAppointment />}
          {activeTab === 'analytics' && (user.role === 'admin' || user.role === 'doctor') && (
            <AnalyticsDashboard />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
