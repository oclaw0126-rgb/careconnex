import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ViewType } from './types';

// Eager load critical landing page for faster first paint
import { LandingView as LandingViewComponent } from './components/LandingView';

// Lazy Load Pages with prefetching
const ClientDashboard = lazy(() => import('./components/ClientDashboard').then(module => ({ default: module.ClientDashboard })));
const CaregiverDashboard = lazy(() => import('./components/CaregiverDashboard').then(module => ({ default: module.CaregiverDashboard })));
const ClientSignup = lazy(() => import('./components/ClientSignup').then(module => ({ default: module.ClientSignup })));
const ClientLogin = lazy(() => import('./components/ClientLogin').then(module => ({ default: module.ClientLogin })));
const CaregiverSignup = lazy(() => import('./components/CaregiverSignup').then(module => ({ default: module.CaregiverSignup })));
const CaregiverLogin = lazy(() => import('./components/CaregiverLogin').then(module => ({ default: module.CaregiverLogin })));
const ForgotPassword = lazy(() => import('./components/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const AdminView = lazy(() => import('./components/AdminView').then(module => ({ default: module.AdminView })));
const ClientProfile = lazy(() => import('./components/ClientProfile').then(module => ({ default: module.ClientProfile })));
const CaregiverProfile = lazy(() => import('./components/CaregiverProfile').then(module => ({ default: module.CaregiverProfile })));
const InboxView = lazy(() => import('./components/InboxView').then(module => ({ default: module.InboxView })));
const StripeCallback = lazy(() => import('./components/StripeCallback').then(module => ({ default: module.StripeCallback })));
const PaymentSuccess = lazy(() => import('./components/PaymentSuccess').then(module => ({ default: module.PaymentSuccess })));
const PaymentCancel = lazy(() => import('./components/PaymentCancel').then(module => ({ default: module.PaymentCancel })));
const CarePlan = lazy(() => import('./components/CarePlan').then(module => ({ default: module.CarePlan })));
const HowItWorks = lazy(() => import('./components/HowItWorks').then(module => ({ default: module.HowItWorks })));
const Insurance = lazy(() => import('./components/Insurance').then(module => ({ default: module.Insurance })));
const Subscription = lazy(() => import('./components/Subscription').then(module => ({ default: module.Subscription })));
const NotFound = lazy(() => import('./components/NotFound').then(module => ({ default: module.NotFound })));

// Phase 1 Components
const ExpressBooking = lazy(() => import('./components/ExpressBooking').then(module => ({ default: module.ExpressBooking })));

// Video Interview & Profile Modals
const ScheduleInterviewModal = lazy(() => import('./components/ScheduleInterviewModal').then(module => ({ default: module.ScheduleInterviewModal })));
const CaregiverProfileModal = lazy(() => import('./components/CaregiverProfileModal').then(module => ({ default: module.CaregiverProfileModal })));
const VideoInterviewRoom = lazy(() => import('./components/VideoInterviewRoom').then(module => ({ default: module.VideoInterviewRoom })));

// Wrapper for landing view
const LandingView = (props: any) => <LandingViewComponent {...props} />;

import { ToastContainer } from './components/ui/Toast';
import { PageLoader } from './components/ui/PageLoader';
import { Home, Settings, MessageSquare, ClipboardList, Loader2 } from 'lucide-react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { CareConnexProvider, useCareConnex } from './context/CareConnexContext';

// Push Notifications
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { pushNotificationService } from './services/pushNotificationService';

// PWA Components
import { PWAInstallPrompt, registerServiceWorker } from './utils/pwa';
import { preloadCriticalResources } from './utils/performance';

// Caregiver Callout
import { useCaregiverCallout } from './hooks/useCaregiverCallout';
import { CaregiverCalloutModal } from './components/CaregiverCalloutModal';
import { useAppointmentForCallout } from './hooks/useCaregiverCallout';

// We create an inner component to consume the context for 'isLoading' and 'toasts' which are global
// But wait, ToastContainer needs 'toasts' and 'removeToast'.
// If App is wrapped by Provider, we can use hooks inside AppContent.
// But App itself returns the Provider. So we need a split.

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, toasts, removeToast, addToast, currentUser } = useCareConnex();

  // Caregiver Callout Handling
  const { activeCallout, dismissCallout } = useCaregiverCallout(currentUser?.uid || null);
  const { appointment: calloutAppointment } = useAppointmentForCallout(
    activeCallout?.data?.appointmentId || null
  );

  // Video Interview State
  const [scheduleInterviewCaregiver, setScheduleInterviewCaregiver] = useState<any>(null);
  const [viewingCaregiver, setViewingCaregiver] = useState<any>(null);
  const [activeInterview, setActiveInterview] = useState<any>(null);

  // Handle caregiver selection from callout modal
  const handleBackupCaregiverSelected = (caregiverId: string, caregiverName: string) => {
    addToast(`Backup caregiver ${caregiverName} confirmed!`, 'success');
    dismissCallout();
    // Refresh the page or navigate to appointments to see the update
    navigate('/client/dashboard');
  };

  // Handle refund request
  const handleRefundRequested = () => {
    addToast('Refund request submitted. You will receive confirmation shortly.', 'info');
    dismissCallout();
  };

  // State for holding the target client ID when a caregiver views a care plan
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  // Check URL for external redirects (Stripe) or legacy params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');

    if (viewParam === 'stripe-callback') {
      navigate('/stripe/callback', { replace: true });
    } else if (viewParam === 'payment-success') {
      navigate('/payment/success', { replace: true });
    } else if (viewParam === 'payment-cancel') {
      navigate('/payment/cancel', { replace: true });
    }
  }, [navigate]);

  // Initialize PWA features
  useEffect(() => {
    registerServiceWorker();
    preloadCriticalResources();
  }, []);


  const handleNavigation = (view: ViewType, data?: any) => {
    if (view === 'care-plan' && typeof data === 'string') {
      setViewingClientId(data);
    } else if (view !== 'care-plan') {
      setViewingClientId(null);
    }

    switch (view) {
      case 'landing': navigate('/'); break;
      case 'how-it-works': navigate('/how-it-works'); break;
      case 'subscription': navigate('/pricing'); break;
      case 'client-signup': navigate('/client/signup'); break;
      case 'client-login': navigate('/client/login'); break;
      case 'forgot-password-client': navigate('/client/forgot-password'); break;
      case 'forgot-password-caregiver': navigate('/caregiver/forgot-password'); break;
      case 'caregiver-signup': navigate('/caregiver/signup'); break;
      case 'caregiver-login': navigate('/caregiver/login'); break;
      case 'client': navigate('/client/dashboard'); break;
      case 'client-profile': navigate('/client/profile'); break;
      case 'client-inbox': navigate('/client/inbox'); break;
      case 'care-plan': navigate('/client/care-plan'); break;
      case 'caregiver': navigate('/caregiver/dashboard'); break;
      case 'caregiver-profile': navigate('/caregiver/profile'); break;
      case 'caregiver-inbox': navigate('/caregiver/inbox'); break;
      case 'admin': navigate('/admin'); break;
      case 'stripe-callback': navigate('/stripe/callback'); break;
      case 'payment-success': navigate('/payment/success'); break;
      case 'payment-cancel': navigate('/payment/cancel'); break;
      case 'insurance': navigate('/insurance'); break;
      case 'express-booking': navigate('/book-now'); break;
      default: navigate('/');
    }
  };

  // Determine if we are in Client Flow or Caregiver Flow for Bottom Nav Styling
  const isCaregiverContext = viewingClientId !== null;
  const path = location.pathname;

  const isClientFlow = (
    path.startsWith('/client') ||
    (path.includes('care-plan') && !isCaregiverContext) ||
    path.includes('payment')
  );

  const isCaregiverFlow = (
    path.startsWith('/caregiver') ||
    (path.includes('care-plan') && isCaregiverContext)
  );

  const authPaths = [
    '/client/login',
    '/client/signup',
    '/client/forgot-password',
    '/caregiver/login',
    '/caregiver/signup',
    '/caregiver/forgot-password'
  ];

  const showBottomNav = (isClientFlow || isCaregiverFlow) && !authPaths.includes(path);
  const activeColor = isClientFlow ? 'text-teal-600' : 'text-orange-500';

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-neutral-50)]">
        <Loader2 className="w-10 h-10 text-[var(--color-primary-600)] animate-spin mb-4" />
        <p className="text-[var(--color-neutral-500)] font-medium">Connecting to secure server...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] font-sans relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <Suspense fallback={<PageLoader fullScreen message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<LandingView onNavigate={handleNavigation} />} />
          <Route path="/how-it-works" element={<HowItWorks onNavigate={handleNavigation} />} />
          <Route path="/pricing" element={<Subscription onNavigate={handleNavigation} />} />
          <Route path="/client/signup" element={<ClientSignup onNavigate={handleNavigation} onShowToast={addToast} />} />
          <Route path="/client/login" element={<ClientLogin onNavigate={handleNavigation} onShowToast={addToast} />} />
          <Route path="/client/forgot-password" element={<ForgotPassword userType="client" onNavigate={handleNavigation} onShowToast={addToast} />} />

          <Route path="/caregiver/signup" element={<CaregiverSignup onNavigate={handleNavigation} onShowToast={addToast} />} />
          <Route path="/caregiver/login" element={<CaregiverLogin onNavigate={handleNavigation} onShowToast={addToast} />} />
          <Route path="/caregiver/forgot-password" element={<ForgotPassword userType="caregiver" onNavigate={handleNavigation} onShowToast={addToast} />} />

          <Route path="/client/dashboard" element={
            <ClientDashboard
              onNavigate={handleNavigation}
            />
          } />
          <Route path="/client/profile" element={<ClientProfile onNavigate={handleNavigation} onShowToast={addToast} />} />
          <Route path="/client/inbox" element={<InboxView 
            userType="client" 
            onNavigate={handleNavigation} 
            onShowToast={addToast}
            onScheduleVideoCall={(caregiverId, caregiverName) => {
              // Find caregiver in list or create minimal object
              setScheduleInterviewCaregiver({
                id: caregiverId,
                uid: caregiverId,
                name: caregiverName,
                hourlyRate: 25,
                imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(caregiverName)}&background=random`
              });
            }}
            onViewProfile={(caregiverId) => {
              navigate(`/caregiver-profile?id=${caregiverId}`);
            }}
          />} />

          <Route path="/caregiver/dashboard" element={<CaregiverDashboard onNavigate={handleNavigation} />} />
          <Route path="/caregiver/profile" element={<CaregiverProfile onNavigate={handleNavigation} onShowToast={addToast} />} />
          <Route path="/caregiver/inbox" element={<InboxView userType="caregiver" onNavigate={handleNavigation} onShowToast={addToast} />} />

          <Route path="/client/care-plan" element={
            <CarePlan
              onNavigate={(view) => {
                // Smart back navigation
                if (viewingClientId) {
                  setViewingClientId(null);
                  navigate('/caregiver/dashboard');
                } else {
                  handleNavigation(view);
                }
              }}
              onShowToast={addToast}
              targetUserId={viewingClientId}
            />
          } />

          <Route path="/admin" element={<AdminView onBack={() => navigate('/')} />} />
          <Route path="/stripe/callback" element={<StripeCallback onNavigate={handleNavigation} />} />
          <Route path="/payment/success" element={<PaymentSuccess onNavigate={handleNavigation} onPaymentComplete={(id) => { /* handled in context now but PaymentSuccess might need update */ }} />} />
          <Route path="/payment/cancel" element={<PaymentCancel onNavigate={handleNavigation} />} />
          <Route path="/insurance" element={<Insurance onNavigate={handleNavigation} />} />

          {/* Phase 1: Express Booking Route */}
          <Route path="/express-booking" element={
            <ExpressBooking
              clientId={currentUser?.uid || ''}
              onBook={async (data) => {
                try {
                  addToast('Finding your perfect caregiver...', 'info');
                  // Navigate to client dashboard where AI matching will show results
                  navigate('/client/dashboard');
                } catch (error) {
                  console.error('Express booking error:', error);
                  addToast('Booking failed. Please try again.', 'error');
                }
              }}
            />
          } />

          {/* 404 Page */}
          <Route path="*" element={<NotFound onNavigate={handleNavigation} />} />
        </Routes>
      </Suspense>

      {/* Push Notification Permission Prompt */}
      {currentUser?.uid && (
        <PushNotificationPrompt 
          userId={currentUser.uid} 
        />
      )}

      {showBottomNav && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md border border-[var(--color-neutral-200)] rounded-full shadow-2xl px-3 sm:px-6 py-2 sm:py-3 flex space-x-2 sm:space-x-6 z-50 safe-area-bottom">
          <button
            onClick={() => handleNavigation(isClientFlow ? 'client' : 'caregiver')}
            className={`flex flex-col items-center justify-center transition-colors min-w-[48px] min-h-[48px] rounded-lg active:scale-95 ${path.endsWith('dashboard') || path === '/client' || path === '/caregiver' ? activeColor : 'text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]'
              }`}
          >
            <Home className="w-5 sm:w-6 h-5 sm:h-6" />
            <span className="text-[10px] font-medium mt-0.5">Home</span>
          </button>

          <div className="w-px bg-[var(--color-neutral-200)] h-8 self-center hidden sm:block"></div>

          {/* Care Plan Tab (Client Only) */}
          {isClientFlow && (
            <>
              <button
                onClick={() => handleNavigation('care-plan')}
                className={`flex flex-col items-center justify-center transition-colors min-w-[48px] min-h-[48px] rounded-lg active:scale-95 ${path.includes('care-plan') ? activeColor : 'text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]'
                  }`}
              >
                <ClipboardList className="w-5 sm:w-6 h-5 sm:h-6" />
                <span className="text-[10px] font-medium mt-0.5">Binder</span>
              </button>
              <div className="w-px bg-[var(--color-neutral-200)] h-8 self-center hidden sm:block"></div>
            </>
          )}

          <button
            onClick={() => handleNavigation(isClientFlow ? 'client-inbox' : 'caregiver-inbox')}
            className={`flex flex-col items-center justify-center transition-colors min-w-[48px] min-h-[48px] rounded-lg active:scale-95 ${path.includes('inbox') ? activeColor : 'text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]'
              }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 sm:w-6 h-5 sm:h-6" />
              {/* Badge could be dynamic */}
            </div>
            <span className="text-[var(--color-neutral-400)] text-[10px] font-medium mt-0.5">Chat</span>
          </button>

          <div className="w-px bg-[var(--color-neutral-200)] h-8 self-center hidden sm:block"></div>

          <button
            onClick={() => handleNavigation(isClientFlow ? 'client-profile' : 'caregiver-profile')}
            className={`flex flex-col items-center justify-center transition-colors min-w-[48px] min-h-[48px] rounded-lg active:scale-95 ${path.includes('profile')
              ? activeColor
              : 'text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]'
              }`}
          >
            <Settings className="w-5 sm:w-6 h-5 sm:h-6" />
            <span className="text-[10px] font-medium mt-0.5">Profile</span>
          </button>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Caregiver Callout Modal */}
      {activeCallout && calloutAppointment && (
        <CaregiverCalloutModal
          appointmentId={activeCallout.data?.appointmentId || ''}
          originalCaregiverName={calloutAppointment.caregiverName || 'Your caregiver'}
          date={calloutAppointment.date}
          time={calloutAppointment.time}
          onClose={dismissCallout}
          onCaregiverSelected={handleBackupCaregiverSelected}
          onRefundRequested={handleRefundRequested}
        />
      )}

      {/* Video Interview Modals */}
      <Suspense fallback={null}>
        {scheduleInterviewCaregiver && (
          <ScheduleInterviewModal
            caregiver={scheduleInterviewCaregiver}
            onClose={() => setScheduleInterviewCaregiver(null)}
            onSuccess={(message) => {
              addToast(message, 'success');
              setScheduleInterviewCaregiver(null);
            }}
            onShowToast={addToast}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {activeInterview && (
          <VideoInterviewRoom
            interview={activeInterview}
            userId={currentUser?.uid || ''}
            userName={currentUser?.displayName || 'User'}
            onEnd={() => {
              setActiveInterview(null);
              addToast('Interview ended', 'info');
            }}
            onShowToast={addToast}
          />
        )}
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <CareConnexProvider>
        <AppContent />
      </CareConnexProvider>
    </ErrorBoundary>
  );
};

export default App;
