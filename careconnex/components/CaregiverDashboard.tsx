import React, { useState, useEffect } from 'react';
import { Calendar, List, Briefcase, FileText, Play, Square, Loader2, MapPin, Clock, MessageSquare, Sparkles, TrendingUp, Heart, Award, Camera } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AddToastFunction, Appointment, ViewType, Caregiver, VideoInterview, JobPost } from '../types';
import { dbService, authService } from '../services/api';
import { useCareConnex } from '../context/CareConnexContext';
import { useAiJobMatch } from '../hooks/useAiJobMatch';
import { aiService } from '../services/ai';

import { CaregiverHeader } from './caregiver/CaregiverHeader';
import { CaregiverSchedule } from './caregiver/CaregiverSchedule';
import { JobBoard } from './caregiver/JobBoard';
import { EarningsPanel } from './caregiver/EarningsPanel';
import { ShiftAssistant } from './caregiver/ShiftAssistant';
import { OnboardingChecklist } from './caregiver/OnboardingChecklist';
import { CaregiverAiPanel } from './dashboard/CaregiverAiPanel';
import { AiJobMatchCard } from './dashboard/AiJobMatchCard';
import { ChatInbox } from './ChatInbox';

import { BackgroundCheckModal } from './BackgroundCheckModal';
import { EmergencySOS } from './EmergencySOS';
import { ConnectBankButton } from './ui/ConnectBankButton';

// Care Journal Components
import { CareJournalEntryForm } from './careJournal/CareJournalEntry';
import { CareJournalEntry } from '../types';

// Video Interview Components
import { VideoInterviewRoom } from './VideoInterviewRoom';
import { InterviewHistory } from './dashboard/InterviewHistory';
import { StaggerContainer, MotionItem } from './ui/Motion';

// Phase 1 Components
import { CaregiverEarnings } from './CaregiverEarnings';

// Phase 2 Components
import { BenefitsDashboard } from './caregiver/BenefitsDashboard';
import { VideoUpdateUploader } from './caregiver/VideoUpdateUploader';
import { RecognitionCenter } from './caregiver/RecognitionCenter';

interface CaregiverDashboardProps {
   onNavigate: (view: ViewType, data?: any) => void;
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({ onNavigate }) => {
   const {
      appointments,
      currentUser,
      addToast: onShowToast
   } = useCareConnex();

   const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'find-work' | 'earnings' | 'benefits' | 'taxes' | 'messages' | 'recognition'>('overview');

   const [balance, setBalance] = useState(0.00);
   const [isCashingOut, setIsCashingOut] = useState(false);
   const [isLoadingEvv, setIsLoadingEvv] = useState(false);
   const [profile, setProfile] = useState<Caregiver | null>(null);
   const [showCheckModal, setShowCheckModal] = useState(false);

   // AI Rate Suggestion State
   const [rateSuggestion, setRateSuggestion] = useState<{
      suggestedRate: number;
      explanation: string;
      marketRange: { low: number; average: number; high: number };
   } | null>(null);
   const [showRateSuggestion, setShowRateSuggestion] = useState(false);

   // AI Job Match Hook - guarded against null profile
   const { matchedJobs, loading: jobsLoading } = useAiJobMatch(profile || undefined);

   // Video Interview State
   const [activeInterview, setActiveInterview] = useState<VideoInterview | null>(null);

   // Care Journal State
   const [showCareJournal, setShowCareJournal] = useState(false);
   const [completedAppointment, setCompletedAppointment] = useState<Appointment | null>(null);

   // Filter appointments for this specific caregiver
   const myAppointments = appointments.filter(a =>
      currentUser && (a.caregiverId.toString() === currentUser.uid)
   );

   const activeAppointment = myAppointments.find(a => a.status === 'in-progress');
   const upcomingAppointment = myAppointments.find(a => a.status === 'confirmed');
   const currentJob = activeAppointment || upcomingAppointment;

   useEffect(() => {
      const fetchProfile = async () => {
         console.log('🚀 fetchProfile STARTED for user:', currentUser?.uid, currentUser?.email);

         if (!currentUser?.uid) {
            console.error('❌ No currentUser UID');
            return;
         }

         try {
            // DIRECT FETCH: Get the specific caregiver document
            const userDoc = await dbService.getUser(currentUser.uid);
            console.log('🔍 Fetched user document:', userDoc);

            if (userDoc) {
               setProfile(userDoc as any);
               console.log('✅ Profile loaded successfully:', userDoc.name);
            } else {
               console.error('❌ No profile found for UID:', currentUser.uid);
            }
         } catch (error) {
            console.error('❌ Error fetching profile:', error);
         }
      };
      if (currentUser) fetchProfile();
   }, [currentUser]);

   // Fetch AI Rate Suggestion when profile loads
   useEffect(() => {
      const getRateSuggestion = async () => {
         if (profile && profile.location) {
            try {
               const suggestion = await aiService.suggestRate({
                  location: profile.location,
                  skills: profile.skills || [],
                  certifications: profile.certifications || [],
                  experience: profile.experience
               });
               setRateSuggestion(suggestion);
            } catch (e) {
               console.error('Rate suggestion failed:', e);
            }
         }
      };
      getRateSuggestion();
   }, [profile]);

   const handleVerificationSuccess = () => {
      // Refresh profile or handle via listener
   };

   const refreshProfile = async () => {
      if (currentUser) {
         const allCaregivers = await dbService.getCaregivers(100);
         const p = allCaregivers.caregivers.find(c => c.uid === currentUser?.uid);
         if (p) setProfile(p);
      }
   };

   // GATING LOGIC
   const isVerified = profile?.verificationStatus === 'approved' || profile?.verified === true;
   const showOnboarding = profile && !isVerified;

   if (showOnboarding && profile) {
      return (
         <div className="min-h-screen bg-slate-50 pb-20 verify-gate">
            <CaregiverHeader
               currentUser={currentUser}
               profile={profile}
               onNavigate={onNavigate}
               onStartBackgroundCheck={() => { }}
            />
            <OnboardingChecklist
               profile={profile}
               onUpdate={refreshProfile}
               onNavigate={onNavigate}
               onShowToast={onShowToast}
            />
         </div>
      );
   }

   const handleCashOut = () => {
      if (balance <= 0) return;
      setIsCashingOut(true);
      setTimeout(() => {
         setBalance(0);
         setIsCashingOut(false);
         onShowToast("Funds transferred to your bank account successfully!", 'success');
      }, 1500);
   };

   const onViewCarePlan = (appt: Appointment) => {
      if (onNavigate) {
         const targetId = appt.clientId || 'client-1';
         onNavigate('care-plan', targetId);
      }
   };

   const handleClockIn = async (apptId: string) => {
      setIsLoadingEvv(true);
      try {
         if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
               const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
               await dbService.startVisit(apptId, loc);
               onShowToast("Clocked In! Visit tracking active. Family has been notified.", 'success');
               
               // Notify family of arrival - use functional ref to get latest appointments
               const appointment = appointments.find(a => 
                  currentUser && a.caregiverId.toString() === currentUser.uid && a.id === apptId
               );
               if (appointment?.clientId && currentUser?.uid) {
                  await dbService.notifyFamilyOfArrival(
                     appointment.clientId,
                     currentUser.uid,
                     appointment.time
                  );
               }
               
               setIsLoadingEvv(false);
            }, (error) => {
               console.error(error);
               onShowToast("GPS Location required to Clock In.", 'error');
               setIsLoadingEvv(false);
            });
         } else {
            onShowToast("Geolocation not supported.", 'error');
            setIsLoadingEvv(false);
         }
      } catch (e) {
         onShowToast("Failed to clock in.", 'error');
         setIsLoadingEvv(false);
      }
   };

   const handleClockOut = async (apptId: string) => {
      setIsLoadingEvv(true);
      try {
         await dbService.endVisit(apptId);
         onShowToast("Clocked Out. Please complete the visit check-in.", 'success');
         setIsLoadingEvv(false);

         // Show care journal form after clocking out - use functional ref to get latest appointments
         const completedAppt = appointments.find(a => 
            currentUser && a.caregiverId.toString() === currentUser.uid && a.id === apptId
         );
         if (completedAppt) {
            setCompletedAppointment(completedAppt);
            setShowCareJournal(true);
         }
      } catch (e) {
         onShowToast("Failed to clock out.", 'error');
         setIsLoadingEvv(false);
      }
   };

   const handleCareJournalSubmit = (entry: CareJournalEntry) => {
      onShowToast("Visit check-in completed! Family has been notified.", 'success');
      setShowCareJournal(false);
      setCompletedAppointment(null);
   };

   const handleApplyForJob = async (job: JobPost) => {
      if (!profile) return;
      try {
         await dbService.acceptJob(job.id, profile);
         onShowToast(`Applied for ${job.title}! Client will be notified.`, 'success');
      } catch (e) {
         onShowToast("Failed to apply for job.", 'error');
      }
   };

   return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 animate-slide-in">
         <CaregiverHeader
            currentUser={currentUser}
            profile={profile}
            onNavigate={onNavigate}
            onStartBackgroundCheck={() => setShowCheckModal(true)}
         />

         {/* AI-Powered Command Center */}
         <CaregiverAiPanel
            profile={profile}
            onOpenChat={() => setActiveTab('messages')}
            onViewEarnings={() => setActiveTab('taxes')}
            onShowToast={onShowToast}
         />

         {/* AI Rate Suggestion Banner */}
         {rateSuggestion && profile && (
            <MotionItem className="mb-6">
               <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                     <div className="bg-blue-100 p-2 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-slate-900">AI Rate Insight</h4>
                        <p className="text-sm text-slate-600 mt-1">
                           {profile.hourlyRate < rateSuggestion.suggestedRate
                              ? `Your rate is $${rateSuggestion.suggestedRate - profile.hourlyRate} below the suggested rate of $${rateSuggestion.suggestedRate}/hr. ${rateSuggestion.explanation}`
                              : `Your rate of $${profile.hourlyRate}/hr is well-positioned. Market range: $${rateSuggestion.marketRange.low}-$${rateSuggestion.marketRange.high}`}
                        </p>
                     </div>
                     <button
                        onClick={() => onNavigate('caregiver-profile')}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                     >
                        Update Rate
                     </button>
                  </div>
               </div>
            </MotionItem>
         )}

         {/* Navigation Tabs */}
         <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
            <button
               onClick={() => setActiveTab('overview')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <List className="w-4 h-4 mr-2" /> Overview
            </button>
            <button
               onClick={() => setActiveTab('schedule')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <Calendar className="w-4 h-4 mr-2" /> Schedule
            </button>
            <button
               onClick={() => setActiveTab('find-work')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'find-work' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <Briefcase className="w-4 h-4 mr-2" /> Find Work
            </button>
            <button
               onClick={() => setActiveTab('earnings')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'earnings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <TrendingUp className="w-4 h-4 mr-2" /> Earnings
            </button>
            <button
               onClick={() => setActiveTab('benefits')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'benefits' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <Heart className="w-4 h-4 mr-2" /> Benefits
            </button>
            <button
               onClick={() => setActiveTab('messages')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'messages' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <MessageSquare className="w-4 h-4 mr-2" /> Messages
            </button>
            <button
               onClick={() => setActiveTab('taxes')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'taxes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <FileText className="w-4 h-4 mr-2" /> Taxes
            </button>
            <button
               onClick={() => setActiveTab('recognition')}
               className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${activeTab === 'recognition' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <Award className="w-4 h-4 mr-2" /> Recognition
            </button>
         </div>

         {activeTab === 'overview' && (
            <div className="animate-slide-in">
               {/* AI-Matched Jobs Section */}
               <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xl font-bold text-slate-900 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-orange-500" />
                        AI-Matched Jobs For You
                     </h3>
                     <button 
                        onClick={() => setActiveTab('find-work')}
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                     >
                        View All
                     </button>
                  </div>

                  {jobsLoading ? (
                     <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                     </div>
                  ) : matchedJobs.length > 0 ? (
                     <StaggerContainer className="space-y-4">
                        {matchedJobs.slice(0, 3).map(({ job, matchScore, matchReasons }) => (
                           <AiJobMatchCard
                              key={job.id}
                              job={{ ...job, matchScore, matchReasons }}
                              onApply={handleApplyForJob}
                              onViewDetails={() => setActiveTab('find-work')}
                           />
                        ))}
                     </StaggerContainer>
                  ) : (
                     <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                        <p className="text-slate-600">No AI-matched jobs found right now.</p>
                        <button 
                           onClick={() => setActiveTab('find-work')}
                           className="text-orange-600 font-semibold mt-2"
                        >
                           Browse All Jobs →
                        </button>
                     </div>
                  )}
               </div>

               {currentJob ? (
                  <div className={`rounded-3xl p-6 mb-8 shadow-lg border relative overflow-hidden transition-all ${currentJob.status === 'in-progress'
                     ? 'bg-green-600 text-white border-green-500 shadow-green-200'
                     : 'bg-white text-slate-900 border-slate-200'
                     }`}>
                     {currentJob.status === 'in-progress' && (
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                           <div className="animate-ping w-20 h-20 bg-white rounded-full"></div>
                        </div>
                     )}

                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${currentJob.status === 'in-progress' ? 'text-green-100' : 'text-slate-400'
                                 }`}>
                                 {currentJob.status === 'in-progress' ? 'Current Shift' : 'Next Up'}
                              </h3>
                              <h2 className="text-2xl font-bold">{currentJob.clientName}</h2>
                              <p className={`text-sm ${currentJob.status === 'in-progress' ? 'text-green-50' : 'text-slate-500'}`}>
                                 Personal Care Assistance
                              </p>
                           </div>
                           {currentJob.status === 'in-progress' ? (
                              <Badge className="bg-white text-green-700">Live Tracking</Badge>
                           ) : (
                              <Badge variant="warning">Scheduled</Badge>
                           )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                           <div className={`p-3 rounded-xl ${currentJob.status === 'in-progress' ? 'bg-green-700/50' : 'bg-slate-50'}`}>
                              <div className={`flex items-center text-xs font-bold uppercase mb-1 ${currentJob.status === 'in-progress' ? 'text-green-200' : 'text-slate-400'}`}>
                                 <Clock className="w-3 h-3 mr-1" /> Time
                              </div>
                              <div className="font-medium text-lg">{currentJob.time}</div>
                           </div>
                           <div className={`p-3 rounded-xl ${currentJob.status === 'in-progress' ? 'bg-green-700/50' : 'bg-slate-50'}`}>
                              <div className={`flex items-center text-xs font-bold uppercase mb-1 ${currentJob.status === 'in-progress' ? 'text-green-200' : 'text-slate-400'}`}>
                                 <MapPin className="w-3 h-3 mr-1" /> Location
                              </div>
                              <div className="font-medium text-lg">Downtown</div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           {currentJob.status === 'confirmed' && (
                              <div className="grid grid-cols-2 gap-3">
                                 <Button
                                    fullWidth
                                    variant="secondary"
                                    className="bg-white/20 text-slate-800 border-none hover:bg-white/30"
                                    onClick={() => onViewCarePlan(currentJob)}
                                 >
                                    View Care Plan
                                 </Button>
                                 <Button
                                    fullWidth
                                    variant="primary"
                                    onClick={() => handleClockIn(currentJob.id)}
                                    disabled={isLoadingEvv}
                                    className="bg-green-600 hover:bg-green-700 border-none text-white shadow-lg shadow-green-200"
                                 >
                                    {isLoadingEvv ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                       <><Play className="w-5 h-5 mr-2 fill-current" /> GPS Clock In</>
                                    )}
                                 </Button>
                              </div>
                           )}

                           {currentJob.status === 'in-progress' && (
                              <>
                                 <div className="grid grid-cols-2 gap-3 mb-3">
                                    <Button
                                       fullWidth
                                       variant="secondary"
                                       className="bg-white/20 text-white border-none hover:bg-white/30"
                                       onClick={() => onViewCarePlan(currentJob)}
                                    >
                                       View Care Plan
                                    </Button>
                                    <Button
                                       fullWidth
                                       className="bg-slate-900/50 hover:bg-slate-900/70 text-white border-none"
                                       onClick={() => handleClockOut(currentJob.id)}
                                       disabled={isLoadingEvv}
                                    >
                                       {isLoadingEvv ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                          <><Square className="w-5 h-5 mr-2 fill-current" /> Clock Out</>
                                       )}
                                    </Button>
                                 </div>
                                 
                                 {/* Phase 2: Video Updates - Share photos/videos during shift */}
                                 {currentUser && (
                                    <div className="mb-3">
                                       <VideoUpdateUploader
                                          appointmentId={currentJob.id}
                                          clientId={currentJob.clientId || ''}
                                          caregiverId={currentUser.uid}
                                          caregiverName={currentUser.displayName || profile?.name || 'Caregiver'}
                                          onUploadComplete={() => onShowToast('Update shared successfully!', 'success')}
                                          onShowToast={onShowToast}
                                       />
                                    </div>
                                 )}
                                 
                                 <EmergencySOS onShowToast={onShowToast} initiatorType="caregiver" />
                              </>
                           )}
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center mb-8">
                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Calendar className="w-8 h-8 text-slate-300" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-900 mb-2">No upcoming shifts</h3>
                     <p className="text-slate-500 mb-6">You're clear for the day. Check the job board for new opportunities.</p>
                     <Button onClick={() => setActiveTab('find-work')}>Find Work</Button>
                  </div>
               )}

               {/* Balance Card */}
               <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-slate-400 font-medium mb-1">Available Balance</p>
                     <h1 className="text-5xl font-bold mb-6">${balance.toFixed(2)}</h1>
                     <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                           variant="accent"
                           onClick={handleCashOut}
                           disabled={isCashingOut || balance === 0}
                           className="min-w-[160px]"
                        >
                           {isCashingOut ? (
                              <span className="flex items-center">
                                 <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                              </span>
                           ) : (
                              "Cash Out Now"
                           )}
                        </Button>
                        <ConnectBankButton onShowToast={onShowToast} onNavigate={onNavigate} />
                     </div>
                  </div>
               </div>

               {/* Video Interview History */}
               <div className="mb-8">
                  <InterviewHistory
                     userType="caregiver"
                     onJoinInterview={setActiveInterview}
                     onShowToast={onShowToast}
                  />
               </div>

               <ShiftAssistant onShowToast={onShowToast} />
            </div>
         )}

         {activeTab === 'schedule' && (
            <CaregiverSchedule appointments={myAppointments} />
         )}

         {activeTab === 'find-work' && (
            <JobBoard
               onShowToast={onShowToast}
               profile={profile}
               onJobAccepted={() => setActiveTab('schedule')}
            />
         )}

         {activeTab === 'earnings' && currentUser && (
            <div className="animate-slide-in">
               <CaregiverEarnings caregiverId={currentUser.uid} />
            </div>
         )}

         {activeTab === 'benefits' && currentUser && (
            <div className="animate-slide-in">
               <BenefitsDashboard caregiverId={currentUser.uid} />
            </div>
         )}

         {activeTab === 'messages' && currentUser && (
            <div className="animate-slide-in">
               <ChatInbox
                  userId={currentUser.uid}
                  userName={currentUser.displayName || profile?.name || 'Caregiver'}
                  userType="caregiver"
               />
            </div>
         )}

         {activeTab === 'taxes' && (
            <EarningsPanel
               appointments={myAppointments}
               onShowToast={onShowToast}
               onNavigate={onNavigate}
            />
         )}

         {activeTab === 'recognition' && currentUser && (
            <div className="animate-slide-in">
               <RecognitionCenter
                  caregiverId={currentUser.uid}
                  onShowToast={onShowToast}
               />
            </div>
         )}

         {showCheckModal && (
            <BackgroundCheckModal
               onClose={() => setShowCheckModal(false)}
               onShowToast={onShowToast}
               onSuccess={handleVerificationSuccess}
            />
         )}

         {/* Video Interview Room */}
         {activeInterview && (
            <VideoInterviewRoom
               interview={activeInterview}
               userId={currentUser?.uid || ''}
               userName={currentUser?.displayName || profile?.name || 'Caregiver'}
               onEnd={() => {
                  setActiveInterview(null);
                  onShowToast('Interview ended', 'info');
               }}
               onShowToast={onShowToast}
            />
         )}

         {/* Care Journal Check-in Modal */}
         {showCareJournal && completedAppointment && currentUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <CareJournalEntryForm
                  appointment={completedAppointment}
                  caregiverId={currentUser.uid}
                  caregiverName={currentUser.displayName || profile?.name || 'Caregiver'}
                  onSubmit={handleCareJournalSubmit}
                  onCancel={() => {
                     setShowCareJournal(false);
                     setCompletedAppointment(null);
                  }}
               />
            </div>
         )}
      </div>
   );
};
