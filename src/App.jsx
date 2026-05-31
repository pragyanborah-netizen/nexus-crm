import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import AddEditBooking from './pages/AddEditBooking';
import CustomerManagement from './pages/CustomerManagement';
import TrucksManagement from './pages/TrucksManagement';
import AgentsReport from './pages/AgentsReport';
import Diary from './pages/Diary';
import BulkSmsTool from './pages/BulkSmsTool';
import TimeLog from './pages/TimeLog';
import EmailTemplates from './pages/EmailTemplates';
import Calendars from './pages/Calendars';
import InventoryForm from './pages/InventoryForm';
import SurveyPage from './pages/Survey';
import MoverAvailability from './pages/MoverAvailability';
import FeedbackDashboard from './pages/FeedbackDashboard';
import MoverPerformance from './pages/MoverPerformance';
import Payroll from './pages/Payroll';
import Scheduling from './pages/Scheduling';
import TruckTracking from './pages/TruckTracking';
import DriverPerformance from './pages/DriverPerformance';
import TimeClock from './pages/TimeClock';
import ScheduleMonitoring from './pages/ScheduleMonitoring';
import BookingTimeClock from './pages/BookingTimeClock';
import CustomerPortal from './pages/CustomerPortal';
import CustomerTracking from './pages/CustomerTracking';
import CustomerInvoice from './pages/CustomerInvoice';
import AgentMoverPortal from './pages/AgentMoverPortal';
import NotificationMonitoring from './pages/NotificationMonitoring';
import QuoteEngine from './pages/QuoteEngine';
import DriverPortal from './pages/DriverPortal';
import PackagingOrder from './pages/PackagingOrder';
import PackagingOrders from './pages/PackagingOrders';
import CustomerQuote from './pages/CustomerQuote';
import CustomerInventoryChecklistForm from './pages/CustomerInventoryChecklistForm';
import CustomerInventoryChecklists from './pages/CustomerInventoryChecklists';
import AdminTruckMap from './pages/AdminTruckMap';
import Employees from './pages/Employees';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/inventory/:bookingId" element={<InventoryForm />} />
      <Route path="/packaging-order" element={<PackagingOrder />} />
      <Route path="/get-a-quote" element={<CustomerQuote />} />
      <Route path="/inventory-checklist" element={<CustomerInventoryChecklistForm />} />
      <Route path="/survey/:survey_id" element={<SurveyPage />} />
      <Route path="/mover-availability" element={<MoverAvailability />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/bookings/new" element={<AddEditBooking />} />
        <Route path="/bookings/:id" element={<AddEditBooking />} />
        <Route path="/bookings/:id/edit" element={<AddEditBooking />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/trucks" element={<TrucksManagement />} />
        <Route path="/agents-report" element={<AgentsReport />} />
        <Route path="/time-log" element={<TimeLog />} />
        <Route path="/email-templates" element={<EmailTemplates />} />
        <Route path="/calendars" element={<Calendars />} />
        <Route path="/feedback" element={<FeedbackDashboard />} />
        <Route path="/bulk-sms" element={<BulkSmsTool />} />
        <Route path="/mover-performance" element={<MoverPerformance />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/truck-tracking" element={<TruckTracking />} />
        <Route path="/driver-performance" element={<DriverPerformance />} />
        <Route path="/time-clock" element={<TimeClock />} />
        <Route path="/schedule-monitoring" element={<ScheduleMonitoring />} />
        <Route path="/booking/:bookingId/clock" element={<BookingTimeClock />} />
        <Route path="/customer" element={<CustomerPortal />} />
        <Route path="/customer/tracking" element={<CustomerTracking />} />
        <Route path="/customer/invoice" element={<CustomerInvoice />} />
        <Route path="/agent-portal" element={<AgentMoverPortal />} />
        <Route path="/notification-monitoring" element={<NotificationMonitoring />} />
        <Route path="/bookings/:id/quote" element={<QuoteEngine />} />
        <Route path="/driver-portal" element={<DriverPortal />} />
        <Route path="/packaging-orders" element={<PackagingOrders />} />
        <Route path="/inventory-checklists" element={<CustomerInventoryChecklists />} />
        <Route path="/live-truck-map" element={<AdminTruckMap />} />
        <Route path="/employees" element={<Employees />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App