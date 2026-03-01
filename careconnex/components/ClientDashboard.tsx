
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Calendar, Star, User, MessageSquare, Loader2, CheckCircle, MapPin, CreditCard, HelpCircle, Sparkles, Check, XCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { BookingModal } from './BookingModal';
import { AiSearchAgent } from './AiSearchAgent';
import { SimpleSearchWizard } from './SimpleSearchWizard';
import { ReviewModal } from './ReviewModal';
import { SupportModal } from './SupportModal';
import { CancellationModal } from './CancellationModal';
import { HireCaregiverButton } from './ui/HireCaregiverButton';
import { OutstandingInvoices } from './OutstandingInvoices';
import { AddToastFunction, Appointment, Caregiver, ViewType, VideoInterview } from '../types';
import { useSmartMatch } from '../hooks/useSmartMatch';
import { dbService, authService } from '../services/api';
import { useCareConnex } from '../context/CareConnexContext';

// New Components
import { DashboardHeader } from './dashboard/DashboardHeader';
import { AiCommandCenter } from './dashboard/AiCommandCenter';
import { CareCalendar } from './dashboard/CareCalendar';
import { MatchCarousel } from './dashboard/MatchCarousel';
import { JobPostModal } from './JobPostModal';
import { StaggerContainer, MotionItem } from './ui/Motion';
import { CardSkeleton } from './ui/Skeleton';

// Video Interview Components
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { VideoInterviewRoom } from './VideoInterviewRoom';
import { InterviewHistory } from './dashboard/InterviewHistory';
import { CallSupportButton, CallSupportCard } from './CallSupport';
import { CaregiverProfileModal } from './CaregiverProfileModal';
import { VideoDiagnostic } from './VideoDiagnostic';

// Family Command Center Components
import { DailySummary } from './careJournal/DailySummary';
import { PeaceOfMindScore } from './family/PeaceOfMindScore';
import { CareJournalEntry, MatchScore } from '../types';

// Phase 1 Components
import { LiveCareUpdates } from './LiveCareUpdates';
import { ExpressBooking } from './ExpressBooking';

// Phase 2 Components
import { CareTeam } from './family/CareTeam';
import { MediaGallery } from './family/MediaGallery';
import { SmartCarePlan } from './family/SmartCarePlan';
import { WellnessScore } from './family/WellnessScore';

// Referral Program
import { ReferralProgram } from './referral/ReferralProgram';

// AI Matching
import { MatchScoreBadge, MatchIndicator } from './ai/MatchScoreBadge';
import { calculateMLMatchScore, sortByMLMatchScore } from '../services/mlMatchScoring';

// Notifications
import { NotificationBell } from './NotificationBell';

interface ClientDashboardProps {
   onNavigate: (view: ViewType, data?: any) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
   const {
      appointments,
      caregivers,
      bookAppointment: onBook,
      submitReview: onReview,
      addToast: onShowToast
   } = useCareConnex();
   const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
   const [viewingCaregiver, setViewingCaregiver] = useState<Caregiver | null>(null);
   const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
   const [isSimpleSearchOpen, setIsSimpleSearchOpen] = useState(false);
   const [initialQuery, setInitialQuery] = useState('');

   // Job Posting State
   const [isJobModalOpen, setIsJobModalOpen] = useState(false);

   // Chat Loading State
   const [creatingThreadId, setCreatingThreadId] = useState<number | null>(null);

   // Modals State
   const [reviewModalOpen, setReviewModalOpen] = useState(false);
   const [reviewTarget, setReviewTarget] = useState<{ id: string, name: string, caregiverId: number } | null>(null);
   const [supportModalOpen, setSupportModalOpen] = useState(false);
   const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
   const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

   // Video Interview State
   const [scheduleInterviewCaregiver, setScheduleInterviewCaregiver] = useState<Caregiver | null>(null);
   const [activeInterview, setActiveInterview] = useState<VideoInterview | null>(null);

   // Referral Program State
   const [isReferralOpen, setIsReferralOpen] = useState(false);

   // Smart Match Hook
   const { matches: matchedCaregivers, loading: matchLoading, seniorProfile } = useSmartMatch();

   // Scalable "Browse All" State
   const [browseList, setBrowseList] = useState<Caregiver[]>([]);
   const [lastDoc, setLastDoc] = useState<any>(null);
   const [browseLoading, setBrowseLoading] = useState(false);
   const [hasMore, setHasMore] = useState(true);

   // Senior-friendly: Show/hide advanced features
   const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);

   // Family Command Center - Care Journal State
   const [careJournalEntries, setCareJournalEntries] = useState<CareJournalEntry[]>([]);
   const [journalLoading, setJournalLoading] = useState(true);

   // AI Matching - Match Scores (calculated via useMemo below)

   // Subscribe to care journal entries
   useEffect(() => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.uid) {
         setJournalLoading(false);
         return;
      }

      // Load initial entries
      const loadEntries = async () => {
         try {
            const entries = await dbService.getCareJournalEntries(currentUser.uid, 30);
            setCareJournalEntries(entries);
         } catch (error) {
            console.error('Failed to load care journal:', error);
         } finally {
            setJournalLoading(false);
         }
      };

      loadEntries();

      // Subscribe to real-time updates
      const unsubscribe = dbService.subscribeToCareJournal(
         currentUser.uid,
         (entries) => {
            setCareJournalEntries(entries);
         }
      );

      return () => unsubscribe();
   }, []);

   // Calculate match scores with useMemo - expensive calculation
   const matchScores = useMemo(() => {
      if (!seniorProfile || caregivers.length === 0) return {};

      const scores: Record<string, MatchScore> = {};
      for (const caregiver of caregivers) {
         const score = calculateMLMatchScore(caregiver, seniorProfile, appointments);
         scores[caregiver.id] = score;
      }
      return scores;
   }, [caregivers, seniorProfile, appointments]);

   // Initial Load for Browse List
   useEffect(() => {
      let isMounted = true;
      
      const loadInitial = async () => {
         try {
            if (browseLoading || !isMounted) return;
            setBrowseLoading(true);
            const { caregivers: newBatch, lastDoc: newLast } = await dbService.getCaregivers(4, null);
            
            if (!isMounted) return;
            
            if (newBatch.length < 4) setHasMore(false);
            if (newBatch.length > 0) {
               setBrowseList(newBatch);
               setLastDoc(newLast);
            } else {
               setHasMore(false);
            }
         } catch (e) {
            console.error("Browse load failed", e);
         } finally {
            if (isMounted) setBrowseLoading(false);
         }
      };
      
      loadInitial();
      
      return () => { isMounted = false; };
   }, []);

   const loadMoreCaregivers = useCallback(async () => {
      if (browseLoading) return;
      setBrowseLoading(true);
      try {
         const { caregivers: newBatch, lastDoc: newLast } = await dbService.getCaregivers(4, lastDoc);

         if (newBatch.length < 4) setHasMore(false);
         if (newBatch.length > 0) {
            // Filter duplicates just in case
            setBrowseList(prev => {
               const ids = new Set(prev.map(c => c.id));
               const uniqueNew = newBatch.filter(c => !ids.has(c.id));
               return [...prev, ...uniqueNew];
            });
            setLastDoc(newLast);
         } else {
            setHasMore(false);
         }
      } catch (e) {
         console.error("Browse load failed", e);
      } finally {
         setBrowseLoading(false);
      }
   }, [browseLoading, lastDoc]);

   // Memoized derived state
   const unpaidAppointments = useMemo(() => 
      appointments.filter(a => a.paymentStatus === 'pending' && a.status !== 'cancelled'),
   [appointments]);

   const handleBookingConfirm = useCallback((appt: Appointment) => {
      onBook(appt);
      setSelectedCaregiver(null);
      onShowToast("Appointment confirmed! You'll be billed after service.", 'success');
   }, [onBook, onShowToast]);

   const stashPaymentId = useCallback((apptId: string) => {
      localStorage.setItem('payingAppointmentId', apptId);
   }, []);

   const handleReviewClick = useCallback((appt: Appointment) => {
      setReviewTarget({ id: appt.id, name: appt.caregiverName, caregiverId: appt.caregiverId });
      setReviewModalOpen(true);
   }, []);

   const submitReview = useCallback(async (rating: number, comment: string) => {
      if (!reviewTarget) return;
      try {
         // Use current logged in user name
         const user = authService.getCurrentUser();
         await dbService.submitReview({
            id: Date.now().toString(),
            caregiverId: reviewTarget.caregiverId,
            clientName: user?.displayName || "Client",
            rating,
            comment,
            date: new Date().toISOString()
         });

         await dbService.markAppointmentReviewed(reviewTarget.id);

         if (onReview) {
            onReview(reviewTarget.id);
         }

         onShowToast("Review submitted successfully!", 'success');
      } catch (e) {
         onShowToast("Failed to submit review", 'error');
      }
   }, [reviewTarget, onReview, onShowToast]);

   const handleChatClick = useCallback(async (caregiver: Caregiver) => {
      console.log('📝 [Chat] Starting chat with caregiver:', caregiver.id);
      setCreatingThreadId(Number(caregiver.id));
      try {
         const currentUser = authService.getCurrentUser();
         console.log('👤 [Chat] Current user:', currentUser?.uid);
         
         if (!currentUser) {
            console.error('❌ [Chat] User not authenticated');
            onShowToast("Please sign in to message", "error");
            return;
         }
         
         console.log('📨 [Chat] Creating thread...');
         const safeAvatar = caregiver.imageUrl || caregiver.photo || '';
         console.log('🖼️ [Chat] Using avatar:', safeAvatar ? 'Provided' : 'Default');
         const threadId = await dbService.createThread(
            caregiver.id.toString(),
            caregiver.name || 'Unknown Caregiver',
            safeAvatar
         );
         console.log('✅ [Chat] Thread created:', threadId);
         
         console.log('🧭 [Chat] Navigating to client-inbox...');
         onNavigate('client-inbox');
      } catch (e: any) {
         console.error('❌ [Chat] Failed:', e);
         console.error('Error message:', e.message);
         console.error('Error code:', e.code);
         onShowToast(`Could not start chat: ${e.message || 'Unknown error'}`, "error");
      } finally {
         setCreatingThreadId(null);
      }
   }, [onNavigate, onShowToast]);

   const handleViewAppointment = useCallback((appt: Appointment) => {
      setViewingAppointment(appt);
   }, []);

   const handleMessageFromAppointment = useCallback(async (caregiverId: string, caregiverName: string) => {
      setCreatingThreadId(Number(caregiverId));
      try {
         // Find caregiver to get their image
         const caregiver = caregivers.find(c => c.id.toString() === caregiverId);
         await dbService.createThread(
            caregiverId,
            caregiverName,
            caregiver?.imageUrl || ''
         );
         onNavigate('client-inbox');
      } catch (e) {
         onShowToast("Could not start chat", "error");
      } finally {
         setCreatingThreadId(null);
      }
   }, [caregivers, onNavigate, onShowToast]);

   const currentUser = authService.getCurrentUser();

   const handleExpressBooking = useCallback(() => {
      onNavigate('express-booking');
   }, [onNavigate]);

   return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 pb-24 animate-slide-in relative">
         <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
               <DashboardHeader
                  onShowToast={onShowToast}
                  onNavigateProfile={() => onNavigate('client-profile')}
                  onOpenReferral={() => setIsReferralOpen(true)}
               />
            </div>
            {currentUser?.uid && (
               <NotificationBell
                  userId={currentUser.uid}
                  onNotificationClick={(notification) => {
                     if (notification.entryId) {
                        // Scroll to daily summary or navigate to detailed view
                        onShowToast('Opening care update...', 'info');
                     }
                  }}
               />
            )}
         </div>

         <AiCommandCenter
            onPostJob={() => setIsJobModalOpen(true)}
            onSearch={(query) => {
               setIsSimpleSearchOpen(true);
            }}
            onShowToast={onShowToast}
         />

         {/* Quick Actions - Express Booking */}
         <div className="mb-6">
            <button
               onClick={handleExpressBooking}
               className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
            >
               <Sparkles className="w-5 h-5" />
               <span className="font-bold text-lg">Need Care Fast? Book in 2 Minutes →</span>
            </button>
         </div>

         {/* Family Command Center - Peace of Mind Score & Daily Summary */}
         <div className="mb-8 grid md:grid-cols-2 gap-6">
            {!journalLoading && (
               <>
                  <PeaceOfMindScore
                     entries={careJournalEntries || []}
                     seniorName={seniorProfile?.name || 'Your Loved One'}
                     daysToAnalyze={7}
                  />
                  <WellnessScore
                     entries={careJournalEntries || []}
                     seniorName={seniorProfile?.name || 'Your Loved One'}
                     daysToAnalyze={7}
                  />
               </>
            )}
         </div>

         {/* Daily Summary - Full width for better readability */}
         {!journalLoading && (
            <div className="mb-8">
               <DailySummary
                  entries={careJournalEntries?.slice(0, 5) || []}
                  seniorName={seniorProfile?.name || 'Your Loved One'}
                  date={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
               />
            </div>
         )}

         {/* Phase 1: Live Care Updates - Real-time visibility during today's shifts only */}
         {(() => {
            const today = new Date().toLocaleDateString('en-CA');
            const todaysActiveAppointments = appointments.filter(a => 
               (a.status === 'in-progress' || a.status === 'confirmed') && 
               a.date === today
            );
            return todaysActiveAppointments.length > 0 && (
               <div className="mb-8">
                  <LiveCareUpdates 
                     appointmentId={todaysActiveAppointments[0]?.id || ''}
                     clientId={currentUser?.uid || ''}
                  />
               </div>
            );
         })()}

         {/* Phase 2: Care Team - Dedicated caregiver team for continuity */}
         {currentUser?.uid && (
            <div className="mb-8">
               <CareTeam 
                  clientId={currentUser.uid} 
                  appointments={appointments}
                  seniorName={seniorProfile?.name}
               />
            </div>
         )}

         {/* Phase 2: Media Gallery - Photos and videos from caregivers - TEMPORARILY DISABLED */}
         {/* {currentUser?.uid && (
            <div className="mb-8">
               <MediaGallery
                  clientId={currentUser.uid}
                  onShowToast={onShowToast}
               />
            </div>
         )} */}

         {/* Phase 2: Smart Care Plan - Enhanced digital care plan */}
         {currentUser?.uid && (
            <div className="mb-8">
               <SmartCarePlan
                  clientId={currentUser.uid}
                  onShowToast={onShowToast}
                  editable={true}
               />
            </div>
         )}

         {/* Outstanding Invoices Section */}
         <OutstandingInvoices
            appointments={unpaidAppointments}
            caregivers={caregivers}
            onStashPaymentId={stashPaymentId}
         />

         <MatchCarousel
            caregivers={matchedCaregivers}
            loading={matchLoading}
            onChat={handleChatClick}
            onHire={setViewingCaregiver}
            onScheduleInterview={setScheduleInterviewCaregiver}
            onSeeAll={() => setIsAiAgentOpen(true)}
            creatingThreadId={creatingThreadId}
         />

         {/* Video Interview History - Advanced Feature */}
         {showAdvancedFeatures && (
            <div className="mb-8">
               <InterviewHistory
                  userType="client"
                  onJoinInterview={setActiveInterview}
                  onShowToast={onShowToast}
               />
            </div>
         )}

         {/* Video Diagnostic - Help troubleshoot video issues */}
         {showAdvancedFeatures && (
            <div className="mb-8">
               <VideoDiagnostic />
            </div>
         )}

         <CareCalendar
            appointments={appointments}
            onCancelAppointment={setCancelTarget}
            onReviewAppointment={handleReviewClick}
            onShowToast={onShowToast}
            onViewAppointment={handleViewAppointment}
            onMessageCaregiver={handleMessageFromAppointment}
         />

         {/* Empty State - Helpful for new users */}
         {appointments.length === 0 && browseList.length === 0 && !matchLoading && (
            <div className="mb-12">
               <CallSupportCard />
            </div>
         )}

         {/* Browse Caregivers - Always visible for easy discovery */}
         <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
               <User className="w-6 h-6 mr-3 text-teal-600" /> Explore All Caregivers
            </h3>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
               {browseList.map((caregiver) => (
                  <MotionItem key={`browse-${caregiver.id}`} className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl hover:border-teal-200 transition-all overflow-hidden flex flex-col">
                     {/* Caregiver Photo */}
                     <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                        <img
                           src={caregiver.imageUrl}
                           alt={caregiver.name}
                           className="w-full h-full object-cover"
                        />
                        {caregiver.verified && (
                           <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                           </div>
                        )}
                     </div>

                     {/* Card Content */}
                     <div className="p-5 flex flex-col flex-1">
                        {/* Name and Rating */}
                        <div className="mb-3">
                           <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-slate-900 text-lg">{caregiver.name}</h4>
                              {/* AI Match Score Badge */}
                              {matchScores[caregiver.id] && (
                                 <MatchIndicator score={matchScores[caregiver.id].overallScore} />
                              )}
                           </div>
                           <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                 <Star
                                    key={`star-${caregiver.id}-${i}`}
                                    className={`w-4 h-4 ${i < Math.floor(caregiver.rating || 0) ? 'text-amber-400 fill-current' : 'text-slate-300'}`}
                                 />
                              ))}
                              <span className="text-sm text-slate-600 ml-1">
                                 {caregiver.rating?.toFixed(1) || '5.0'}
                              </span>
                           </div>
                        </div>

                        {/* Rate and Distance */}
                        <div className="flex justify-between items-center mb-3">
                           <span className="text-2xl font-bold text-teal-600">${caregiver.hourlyRate}/hr</span>
                           <span className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {caregiver.distance} mi
                           </span>
                        </div>

                        {/* Skills Tags */}
                        {caregiver.skills && caregiver.skills.length > 0 && (
                           <div className="flex flex-wrap gap-1.5 mb-4">
                              {caregiver.skills.slice(0, 2).map((skill, idx) => (
                                 <span
                                    key={`skill-${caregiver.id}-${idx}`}
                                    className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg border border-teal-100"
                                 >
                                    {skill}
                                 </span>
                              ))}
                              {caregiver.skills.length > 2 && (
                                 <span className="px-2 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg">
                                    +{caregiver.skills.length - 2}
                                 </span>
                              )}
                           </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 mt-auto">
                           <Button
                              size="sm"
                              fullWidth
                              variant="primary"
                              onClick={() => setSelectedCaregiver(caregiver)}
                              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 font-semibold shadow-md"
                           >
                              Book
                           </Button>
                           <Button
                              size="sm"
                              fullWidth
                              variant="outline"
                              onClick={() => setViewingCaregiver(caregiver)}
                              className="border-2 border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold"
                           >
                              Profile
                           </Button>
                           <Button
                              size="sm"
                              fullWidth
                              variant="secondary"
                              className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 font-semibold"
                              onClick={() => setScheduleInterviewCaregiver(caregiver)}
                           >
                              Call
                           </Button>
                        </div>
                     </div>
                  </MotionItem>
               ))}


               {/* Skeletons while loading more */}
               {browseLoading && (
                  <>
                     <CardSkeleton />
                     <CardSkeleton />
                     <CardSkeleton />
                     <CardSkeleton />
                  </>
               )}
            </StaggerContainer>

            {hasMore && !browseLoading && (
               <div className="flex justify-center mt-6">
                  <button
                     onClick={loadMoreCaregivers}
                     disabled={browseLoading}
                     className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center disabled:opacity-50"
                  >
                     {browseLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                     {browseLoading ? 'Loading...' : 'Load More Caregivers'}
                  </button>
               </div>
            )}
         </div>

         {/* Advanced Features Toggle - Video/Interview options only */}
         <div className="mb-8 text-center">
            <button
               onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
               className="text-teal-600 hover:text-teal-700 font-medium text-lg px-6 py-3 border-2 border-teal-200 rounded-xl hover:bg-teal-50 transition-colors"
            >
               {showAdvancedFeatures ? 'Hide Advanced Options ▲' : 'More Options ▼'}
            </button>
         </div>

         {/* Support / Help Section */}
         <div className="flex justify-center mb-8">
            <button
               onClick={() => setSupportModalOpen(true)}
               className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 transition-colors"
            >
               <HelpCircle className="w-4 h-4" /> Need help? Report an issue
            </button>
         </div>

         {/* Modals */}
         {isJobModalOpen && (
            <JobPostModal
               onClose={() => setIsJobModalOpen(false)}
               onShowToast={onShowToast}
            />
         )}

         {selectedCaregiver && (
            <BookingModal
               caregiver={selectedCaregiver}
               onClose={() => setSelectedCaregiver(null)}
               onConfirm={handleBookingConfirm}
            />
         )}

         {reviewModalOpen && reviewTarget && (
            <ReviewModal
               caregiverName={reviewTarget.name}
               onClose={() => setReviewModalOpen(false)}
               onSubmit={submitReview}
            />
         )}

         {supportModalOpen && (
            <SupportModal
               onClose={() => setSupportModalOpen(false)}
               onShowToast={onShowToast}
               userType="client"
            />
         )}

         {cancelTarget && (
            <CancellationModal
               appointment={cancelTarget}
               onClose={() => setCancelTarget(null)}
               onSuccess={() => onShowToast('Cancellation processed', 'success')}
               onShowToast={onShowToast}
               cancelledBy="client"
            />
         )}

         {/* Appointment Details Modal */}
         {viewingAppointment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-bold text-slate-900">Appointment Details</h3>
                     <button 
                        onClick={() => setViewingAppointment(null)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                     >
                        ✕
                     </button>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                           <User className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                           <p className="font-semibold text-slate-900">{viewingAppointment.caregiverName}</p>
                           <p className="text-sm text-slate-500">Caregiver</p>
                        </div>
                     </div>
                     
                     <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between">
                           <span className="text-slate-500">Date:</span>
                           <span className="font-medium">{viewingAppointment.date}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-slate-500">Time:</span>
                           <span className="font-medium">{viewingAppointment.time}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-slate-500">Status:</span>
                           <Badge variant={viewingAppointment.status === 'confirmed' ? 'success' : viewingAppointment.status === 'completed' ? 'secondary' : 'warning'}>
                              {viewingAppointment.status}
                           </Badge>
                        </div>
                        {viewingAppointment.cost && (
                           <div className="flex justify-between">
                              <span className="text-slate-500">Cost:</span>
                              <span className="font-medium text-teal-600">${viewingAppointment.cost}</span>
                           </div>
                        )}
                        {viewingAppointment.address && (
                           <div className="flex justify-between">
                              <span className="text-slate-500">Location:</span>
                              <span className="font-medium">{viewingAppointment.address}</span>
                           </div>
                        )}
                     </div>
                     
                     {viewingAppointment.notes && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                           <p className="text-sm text-amber-800">
                              <span className="font-semibold">Notes:</span> {viewingAppointment.notes}
                           </p>
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                     <Button 
                        variant="secondary" 
                        fullWidth 
                        onClick={() => setViewingAppointment(null)}
                     >
                        Close
                     </Button>
                     <Button 
                        variant="primary" 
                        fullWidth
                        onClick={() => {
                           setViewingAppointment(null);
                           handleMessageFromAppointment(viewingAppointment.caregiverId, viewingAppointment.caregiverName);
                        }}
                     >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                     </Button>
                  </div>
               </div>
            </div>
         )}

         <SimpleSearchWizard
            isOpen={isSimpleSearchOpen}
            onClose={() => setIsSimpleSearchOpen(false)}
            caregivers={caregivers}
            onSelectCaregiver={setSelectedCaregiver}
            onViewProfile={setViewingCaregiver}
            onScheduleInterview={setScheduleInterviewCaregiver}
            seniorProfile={seniorProfile}
         />

         {/* Keep AI Chat as Advanced Option (Hidden by default) */}
         <AiSearchAgent
            isOpen={isAiAgentOpen}
            onClose={() => {
               setIsAiAgentOpen(false);
               setInitialQuery('');
            }}
            caregivers={matchedCaregivers.length > 0 ? matchedCaregivers : caregivers}
            onBookCaregiver={setSelectedCaregiver}
            onViewProfile={setViewingCaregiver}
            onScheduleInterview={setScheduleInterviewCaregiver}
            initialQuery={initialQuery}
            seniorProfile={seniorProfile}
            previousBookings={appointments}
         />

         {/* Video Interview Modals */}
         {scheduleInterviewCaregiver && (
            <ScheduleInterviewModal
               caregiver={scheduleInterviewCaregiver}
               onClose={() => setScheduleInterviewCaregiver(null)}
               onSuccess={(message) => {
                  onShowToast(message, 'success');
                  setScheduleInterviewCaregiver(null);
               }}
               onShowToast={onShowToast}
            />
         )}

         {activeInterview && (
            <VideoInterviewRoom
               interview={activeInterview}
               userId={authService.getCurrentUser()?.uid || ''}
               userName={authService.getCurrentUser()?.displayName || 'Client'}
               onEnd={() => {
                  setActiveInterview(null);
                  onShowToast('Interview ended', 'info');
               }}
               onShowToast={onShowToast}
            />
         )}

         {/* Caregiver Profile Modal */}
         {viewingCaregiver && (
            <CaregiverProfileModal
               caregiver={viewingCaregiver}
               onClose={() => setViewingCaregiver(null)}
               onBookNow={() => {
                  setSelectedCaregiver(viewingCaregiver);
                  setViewingCaregiver(null);
               }}
            />
         )}

         {/* Referral Program Modal */}
         {isReferralOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
               <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                     <h2 className="text-xl font-bold">Refer & Earn</h2>
                     <button
                        onClick={() => setIsReferralOpen(false)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                     >
                        ✕
                     </button>
                  </div>
                  <ReferralProgram
                     userId={authService.getCurrentUser()?.uid || ''}
                     userType="client"
                     onShowToast={onShowToast}
                  />
               </div>
            </div>
         )}

         {/* Persistent Call Support Button for Seniors */}
         <CallSupportButton />
      </div>
   );
};
