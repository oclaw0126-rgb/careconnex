import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Heart, ArrowLeft, ChevronRight, FileText, Upload, CheckCircle, Shield } from 'lucide-react';
import { Input } from './ui/Input';
import { LocationInput } from './ui/LocationInput';
import { Button } from './ui/Button';
import { DocumentUpload } from './ui/DocumentUpload';
import { ViewType, AddToastFunction, CaregiverDocuments } from '../types';
import { authService, dbService } from '../services/api';
import { documentUploadService, DocumentType } from '../services/documentUpload';
import { validators } from '../utils/validation';

interface CaregiverSignupProps {
   onNavigate: (view: ViewType) => void;
   onShowToast: AddToastFunction;
}

const TOTAL_STEPS = 9;

export const CaregiverSignup: React.FC<CaregiverSignupProps> = ({ onNavigate, onShowToast }) => {
   const [step, setStep] = useState(1);
   const [isLoading, setIsLoading] = useState(false);
   const [createdUserId, setCreatedUserId] = useState<string | null>(null);

   // Cleanup blob URLs on unmount to prevent memory leaks
   useEffect(() => {
      return () => {
         // Revoke all tracked blob URLs
         blobUrlsRef.current.forEach((url) => {
            URL.revokeObjectURL(url);
         });
         blobUrlsRef.current.clear();
      };
   }, []);

   // Step 1: Basics
   const [basicInfo, setBasicInfo] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      gender: '' as 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | ''
   });

   // Step 2: Expertise
   const [certs, setCerts] = useState<string[]>([]);
   const [skills, setSkills] = useState<string[]>([]);
   const [bio, setBio] = useState('');

   // Step 3: Logistics
   const [logistics, setLogistics] = useState({
      experience: '',
      rate: '',
      hasCar: false,
      location: '',
      latitude: 0,
      longitude: 0
   });

   // Steps 4-6: Documents
   const [documents, setDocuments] = useState<CaregiverDocuments>({});
   const [skipDocuments, setSkipDocuments] = useState(false);

   // Step 7: Background Check Data
   const [backgroundCheckData, setBackgroundCheckData] = useState({
      ssn: '', // Only stores last 4 digits (masked display)
      dateOfBirth: '',
      consentToBackgroundCheck: false
   });
   // Secure ref to store full SSN - only used on submit, never persisted to state
   const fullSsnRef = useRef<string>('');
   // Track blob URLs for cleanup
   const blobUrlsRef = useRef<Set<string>>(new Set());

   // Step 8: Weekly Availability
   const [weeklyAvailability, setWeeklyAvailability] = useState<Record<string, boolean>>({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
   });

   const CERTS_OPTIONS = ["CNA", "HHA", "CPR / First Aid", "RN", "LPN"];
   const SKILLS_OPTIONS = ["Dementia", "Hospice", "Transfer/Lifting", "Meal Prep", "Housekeeping"];

   const toggleSelection = useCallback((item: string, list: string[], setList: (l: string[]) => void) => {
      if (list.includes(item)) setList(list.filter(i => i !== item));
      else setList([...list, item]);
   }, []);

   const toggleDay = useCallback((day: string) => {
      setWeeklyAvailability(prev => ({
         ...prev,
         [day]: !prev[day]
      }));
   }, []);

   const handleDocumentUpload = useCallback(async (file: File, type: DocumentType) => {
      // Store file temporarily - will upload after account creation on final submit
      try {
         // Create a temporary object URL for preview
         const tempUrl = URL.createObjectURL(file);
         // Track for cleanup
         blobUrlsRef.current.add(tempUrl);
         
         setDocuments(prev => ({
            ...prev,
            [type]: {
               name: file.name,
               path: tempUrl,
               url: tempUrl,
               type: file.type,
               size: file.size,
               uploadedAt: new Date().toISOString(),
               status: 'approved', // Mark as approved immediately since it's stored locally
               _pendingFile: file // Store actual file for later upload
            }
         }));

         onShowToast(`${documentUploadService.getDocumentTypeName(type)} selected (will upload on submit)`, 'success');
      } catch (error) {
         console.error('Document selection error:', error);
         onShowToast(error instanceof Error ? error.message : 'Failed to select document', 'error');
      }
   }, [onShowToast]);

   const handleDocumentDelete = useCallback(async (type: DocumentType) => {
      try {
         const doc = documents[type];
         // Revoke object URL if it's a pending upload
         if (doc?.path?.startsWith('blob:')) {
            URL.revokeObjectURL(doc.path);
            blobUrlsRef.current.delete(doc.path);
         }

         setDocuments(prev => ({
            ...prev,
            [type]: undefined
         }));

         onShowToast('Document removed', 'info');
      } catch (error) {
         onShowToast('Failed to remove document', 'error');
      }
   }, [documents, onShowToast]);

   const handleNext = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validate Step 1
      if (step === 1) {
         const passwordError = validators.password(basicInfo.password);
         if (passwordError) {
            onShowToast(passwordError, 'error');
            return;
         }
         if (!basicInfo.email || !basicInfo.firstName || !basicInfo.lastName || !basicInfo.phone) {
            onShowToast("Please fill in all fields", 'error');
            return;
         }
         const phoneError = validators.phone(basicInfo.phone);
         if (phoneError) {
            onShowToast(phoneError, 'error');
            return;
         }
      }

      // Validate Step 2 (Bio length)
      if (step === 2 && bio.length > 500) {
         onShowToast("Bio must be 500 characters or less", 'error');
         return;
      }

      // Validate Step 7 (Background Check)
      if (step === 7) {
         if (!fullSsnRef.current || !backgroundCheckData.dateOfBirth) {
            onShowToast("Please provide SSN and Date of Birth", 'error');
            return;
         }
         if (!backgroundCheckData.consentToBackgroundCheck) {
            onShowToast("You must consent to background check to proceed", 'error');
            return;
         }
         const ssnError = validators.ssn(fullSsnRef.current);
         if (ssnError) {
            onShowToast(ssnError, 'error');
            return;
         }
      }

      // Handle step 3 -> validate and proceed (account creation moved to final step)
      if (step === 3) {
         // Just validate and proceed to next step
         setStep(step + 1);
         return;
      }

      if (step < TOTAL_STEPS) {
         setStep(step + 1);
      } else {
         handleSubmit();
      }
   }, [step, basicInfo, logistics, certs, skills, bio, backgroundCheckData, weeklyAvailability, onShowToast, documents, skipDocuments]);

   const handleSubmit = useCallback(async () => {
      setIsLoading(true);
      try {
         // Create account with ALL data including secure full SSN
         const result = await authService.signup(
            basicInfo.email,
            basicInfo.password,
            `${basicInfo.firstName} ${basicInfo.lastName}`,
            'caregiver',
            {
               certifications: certs,
               personalityTags: skills,
               skills: skills,
               experience: parseInt(logistics.experience) || 0,
               hourlyRate: parseInt(logistics.rate) || 25,
               hasTransportation: logistics.hasCar,
               location: logistics.location,
               latitude: logistics.latitude,
               longitude: logistics.longitude,
               gender: basicInfo.gender || undefined,
               phone: basicInfo.phone,
               bio: bio,
               verified: false,
               onboardingStep: 2,
               verificationStatus: 'submitted',
               submittedAt: new Date().toISOString(),
               // SECURE: Full SSN only sent on submit, never stored in state
               ssn: fullSsnRef.current,
               dateOfBirth: backgroundCheckData.dateOfBirth,
               consentToBackgroundCheck: backgroundCheckData.consentToBackgroundCheck,
               weeklyAvailability: weeklyAvailability
            }
         );

         // Get created user for document uploads
         const user = authService.getCurrentUser();
         if (user?.uid) {
            // Actually upload _pendingFile to Firebase Storage
            const docTypes = Object.keys(documents) as DocumentType[];
            for (const docType of docTypes) {
               const doc = documents[docType];
               if (doc?._pendingFile) {
                  // Upload pending document to Firebase Storage
                  try {
                     await documentUploadService.uploadDocument(
                        user.uid,
                        doc._pendingFile,
                        docType
                     );
                  } catch (uploadError) {
                     console.error(`Failed to upload ${docType}:`, uploadError);
                     // Continue with other documents even if one fails
                  }
               }
            }
         }

         onShowToast("Profile submitted for review!", 'success');
         onNavigate('caregiver');
      } catch (error: unknown) {
         console.error(error);
         const errorMessage = error instanceof Error ? error.message : "Failed to create account";
         onShowToast(errorMessage, 'error');
      } finally {
         setIsLoading(false);
      }
   }, [onNavigate, onShowToast, basicInfo, logistics, certs, skills, bio, backgroundCheckData, weeklyAvailability, documents]);

   const canProceedFromDocuments = useCallback(() => {
      if (skipDocuments) return true;
      
      if (step === 4) return !!documents.driversLicense;
      if (step === 5) return !!documents.insurance;
      if (step === 6) return !!documents.registration;
      return true;
   }, [step, documents, skipDocuments]);

   const getStepTitle = () => {
      switch (step) {
         case 1: return 'Account Basics';
         case 2: return 'Qualifications';
         case 3: return 'Final Details';
         case 4: return "Driver's License";
         case 5: return 'Insurance';
         case 6: return 'Vehicle Registration';
         case 7: return 'Background Check';
         case 8: return 'Availability';
         case 9: return 'Review & Submit';
         default: return '';
      }
   };

   const getStepSubtitle = () => {
      switch (step) {
         case 4: return 'Upload a clear photo of your driver\'s license (front)';
         case 5: return 'Upload your insurance card or policy document';
         case 6: return 'Upload your vehicle registration';
         case 7: return 'Secure information for background verification';
         case 8: return 'Select your typical availability';
         case 9: return 'Review your information before submitting';
         default: return '';
      }
   };

   const formatPhoneNumber = (value: string) => {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
   };

   // SSN Masking: Store full SSN in ref, display masked version in state
   // Accepts raw digits only (masking already removed by caller)
   const formatSsn = (cleanedDigits: string) => {
      const cleaned = cleanedDigits.slice(0, 9);
      
      // Return masked display - only show last 4 digits
      if (cleaned.length === 0) return '';
      if (cleaned.length <= 3) {
         return '*'.repeat(cleaned.length);
      }
      if (cleaned.length <= 5) {
         return `***-${'*'.repeat(cleaned.length - 3)}`;
      }
      
      // Full mask: ***-**-####
      const last4 = cleaned.slice(-4);
      return `***-**-${last4}`;
   };

   const handleSsnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Extract only digits from input (removing any existing mask characters)
      const digitsOnly = inputValue.replace(/\D/g, '');
      // Update the full SSN ref with all digits entered so far
      fullSsnRef.current = digitsOnly.slice(0, 9);
      // Format for display
      const masked = formatSsn(digitsOnly);
      setBackgroundCheckData(prev => ({ ...prev, ssn: masked }));
   };

   return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-slide-in">
         <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center mb-6">
               <div className="bg-orange-500 p-3 rounded-xl shadow-lg shadow-orange-200">
                  <Heart className="text-white w-8 h-8" />
               </div>
            </div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
               Join the care network
            </h2>

            {/* Progress Bar */}
            <div className="flex justify-center gap-1 sm:gap-2 mt-4 flex-wrap px-2">
               {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
                  <div key={s} className={`h-2 w-4 sm:w-6 md:w-10 rounded-full transition-colors ${step >= s ? 'bg-orange-500' : 'bg-slate-200'}`} />
               ))}
            </div>
         </div>

         <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100 relative overflow-hidden">

               <form className="space-y-4 relative z-10" onSubmit={handleNext}>
                  
                  {/* Step Header */}
                  <div className="mb-6">
                     <h3 className="text-lg font-bold text-slate-900">{getStepTitle()}</h3>
                     {getStepSubtitle() && (
                        <p className="text-sm text-slate-500 mt-1">{getStepSubtitle()}</p>
                     )}
                  </div>

                  {/* STEP 1: BASICS */}
                  {step === 1 && (
                     <div className="animate-slide-in space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <Input
                              label="First Name" required
                              value={basicInfo.firstName}
                              onChange={(e) => setBasicInfo({ ...basicInfo, firstName: e.target.value })}
                           />
                           <Input
                              label="Last Name" required
                              value={basicInfo.lastName}
                              onChange={(e) => setBasicInfo({ ...basicInfo, lastName: e.target.value })}
                           />
                        </div>
                        <Input
                           label="Email Address" type="email" required
                           value={basicInfo.email}
                           onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                        />
                        <Input
                           label="Phone Number" type="tel" required
                           value={basicInfo.phone}
                           onChange={(e) => setBasicInfo({ ...basicInfo, phone: formatPhoneNumber(e.target.value) })}
                           placeholder="(555) 123-4567"
                        />
                        <Input
                           label="Password" type="password" required
                           value={basicInfo.password}
                           onChange={(e) => setBasicInfo({ ...basicInfo, password: e.target.value })}
                        />
                        <div>
                           <label htmlFor="gender-select" className="block text-sm font-medium text-slate-700 mb-2">Gender (Optional)</label>
                           <select
                              id="gender-select"
                              value={basicInfo.gender}
                              onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value as 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | '' })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white text-slate-900"
                           >
                              <option value="">Prefer not to say</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Non-binary">Non-binary</option>
                           </select>
                        </div>
                     </div>
                  )}

                  {/* STEP 2: EXPERTISE */}
                  {step === 2 && (
                     <div className="animate-slide-in space-y-4">
                        <p className="text-sm text-slate-500 mb-4">Select your certifications to get higher pay.</p>

                        <div className="space-y-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Certifications</label>
                              <div className="flex flex-wrap gap-2">
                                 {CERTS_OPTIONS.map(c => (
                                    <button
                                       key={c}
                                       type="button"
                                       onClick={() => toggleSelection(c, certs, setCerts)}
                                       className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${certs.includes(c) ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600'
                                          }`}
                                    >
                                       {c}
                                    </button>
                                 ))}
                              </div>
                           </div>

                           <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Special Skills</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {SKILLS_OPTIONS.map(s => (
                                    <div
                                       key={s}
                                       onClick={() => toggleSelection(s, skills, setSkills)}
                                       className={`p-2 rounded-lg border text-sm cursor-pointer flex items-center ${skills.includes(s) ? 'bg-orange-50 border-orange-400 text-orange-800' : 'bg-white border-slate-200 text-slate-600'
                                          }`}
                                    >
                                       {s}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div>
                           <label htmlFor="bio" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bio / About You</label>
                           <textarea
                              id="bio"
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Tell families about your experience, approach to care, and what makes you unique..."
                              rows={4}
                              maxLength={500}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white text-slate-900 resize-none"
                           />
                           <p className={`text-xs mt-1 ${bio.length >= 500 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                              {bio.length}/500 characters
                              {bio.length >= 500 && <span className="ml-1">(maximum reached)</span>}
                           </p>
                        </div>
                     </div>
                  )}

                  {/* STEP 3: LOGISTICS */}
                  {step === 3 && (
                     <div className="animate-slide-in space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <Input
                              label="Years Exp." type="number" required
                              value={logistics.experience}
                              onChange={(e) => setLogistics({ ...logistics, experience: e.target.value })}
                           />
                           <Input
                              label="Hourly Rate ($)" type="number" required
                              min={15}
                              max={100}
                              value={logistics.rate}
                              onChange={(e) => {
                                 const value = parseInt(e.target.value);
                                 if (isNaN(value) || value < 15) {
                                    setLogistics({ ...logistics, rate: '15' });
                                 } else if (value > 100) {
                                    setLogistics({ ...logistics, rate: '100' });
                                 } else {
                                    setLogistics({ ...logistics, rate: e.target.value });
                                 }
                              }}
                           />
                        </div>

                        <LocationInput
                           label="Your Location"
                           placeholder="City, State or Zip"
                           value={logistics.location}
                           onChange={(val) => {
                              if (typeof val === 'object') {
                                 setLogistics({
                                    ...logistics,
                                    location: val.address,
                                    latitude: val.lat || 0,
                                    longitude: val.lng || 0
                                 });
                              } else {
                                 setLogistics({ ...logistics, location: val });
                              }
                           }}
                           required
                        />

                        <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                           <div>
                              <span className="block font-bold text-slate-900">Reliable Transportation</span>
                              <span className="text-sm text-slate-500">I have my own car</span>
                           </div>
                           <div className={`w-12 h-6 rounded-full p-1 transition-colors ${logistics.hasCar ? 'bg-orange-500' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${logistics.hasCar ? 'translate-x-6' : 'translate-x-0'}`} />
                           </div>
                           <input
                              type="checkbox"
                              className="hidden"
                              checked={logistics.hasCar}
                              onChange={(e) => setLogistics({ ...logistics, hasCar: e.target.checked })}
                           />
                        </label>
                     </div>
                  )}

                  {/* STEP 4: DRIVER'S LICENSE */}
                  {step === 4 && (
                     <div className="animate-slide-in space-y-4">
                        <DocumentUpload
                           type="driversLicense"
                           label="Driver's License (Front)"
                           description="Upload a clear photo of the front of your driver's license"
                           existingDocument={documents.driversLicense}
                           onUpload={handleDocumentUpload}
                           onDelete={handleDocumentDelete}
                        />
                        
                        {logistics.hasCar && (
                           <DocumentUpload
                              type="driversLicenseBack"
                              label="Driver's License (Back) - Optional"
                              description="Upload the back of your license (optional but recommended)"
                              existingDocument={documents.driversLicenseBack}
                              onUpload={handleDocumentUpload}
                              onDelete={handleDocumentDelete}
                           />
                        )}

                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                           <input
                              type="checkbox"
                              id="skip-docs"
                              checked={skipDocuments}
                              onChange={(e) => setSkipDocuments(e.target.checked)}
                              className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                           />
                           <label htmlFor="skip-docs" className="text-sm text-slate-600 cursor-pointer">
                              I'll upload these later
                           </label>
                        </div>
                     </div>
                  )}

                  {/* STEP 5: INSURANCE */}
                  {step === 5 && !skipDocuments && (
                     <div className="animate-slide-in">
                        <DocumentUpload
                           type="insurance"
                           label="Insurance Card or Policy"
                           description="Upload your current auto insurance card or policy document"
                           existingDocument={documents.insurance}
                           onUpload={handleDocumentUpload}
                           onDelete={handleDocumentDelete}
                        />
                     </div>
                  )}

                  {/* STEP 6: REGISTRATION */}
                  {step === 6 && !skipDocuments && (
                     <div className="animate-slide-in">
                        <DocumentUpload
                           type="registration"
                           label="Vehicle Registration"
                           description="Upload your current vehicle registration document"
                           existingDocument={documents.registration}
                           onUpload={handleDocumentUpload}
                           onDelete={handleDocumentDelete}
                        />
                     </div>
                  )}

                  {/* Skip steps 5-6 if user chose to skip */}
                  {((step === 5 && skipDocuments) || (step === 6 && skipDocuments)) && (
                     <div className="animate-slide-in text-center py-8">
                        <CheckCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Documents skipped</h4>
                        <p className="text-slate-500">You can upload your documents later from your profile.</p>
                     </div>
                  )}

                  {/* STEP 7: BACKGROUND CHECK */}
                  {step === 7 && (
                     <div className="animate-slide-in space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                           <Shield className="w-6 h-6 text-blue-500 flex-shrink-0" />
                           <p className="text-sm text-blue-700">
                              Your information is securely encrypted and used only for background verification purposes.
                           </p>
                        </div>

                        <Input
                           label="Social Security Number" 
                           type="text" 
                           required
                           value={backgroundCheckData.ssn}
                           onChange={handleSsnChange}
                           placeholder="***-**-____"
                           maxLength={11}
                        />

                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth *</label>
                           <input
                              type="date"
                              required
                              value={backgroundCheckData.dateOfBirth}
                              onChange={(e) => setBackgroundCheckData({ ...backgroundCheckData, dateOfBirth: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white text-slate-900"
                           />
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                           <input
                              type="checkbox"
                              id="background-consent"
                              checked={backgroundCheckData.consentToBackgroundCheck}
                              onChange={(e) => setBackgroundCheckData({ ...backgroundCheckData, consentToBackgroundCheck: e.target.checked })}
                              className="mt-1 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                           />
                           <label htmlFor="background-consent" className="text-sm text-slate-600 cursor-pointer">
                              I consent to a background check and understand that my information will be used for verification purposes in accordance with applicable laws.
                           </label>
                        </div>
                     </div>
                  )}

                  {/* STEP 8: AVAILABILITY */}
                  {step === 8 && (
                     <div className="animate-slide-in space-y-4">
                        <p className="text-sm text-slate-500 mb-4">Select the days you're typically available to work.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                           {Object.entries(weeklyAvailability).map(([day, isAvailable]) => (
                              <button
                                 key={day}
                                 type="button"
                                 onClick={() => toggleDay(day)}
                                 className={`p-3 rounded-xl border text-left transition-colors ${
                                    isAvailable 
                                       ? 'bg-orange-100 border-orange-500 text-orange-800' 
                                       : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                 }`}
                              >
                                 <div className="flex items-center justify-between">
                                    <span className="capitalize font-medium">{day}</span>
                                    {isAvailable && <CheckCircle className="w-4 h-4" />}
                                 </div>
                              </button>
                           ))}
                        </div>

                        <p className="text-xs text-slate-400 mt-4">
                           You can update your availability anytime from your profile settings.
                        </p>
                     </div>
                  )}

                  {/* STEP 9: REVIEW */}
                  {step === 9 && (
                     <div className="animate-slide-in space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                           <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                           <h4 className="text-center font-bold text-green-800 mb-1">Almost there!</h4>
                           <p className="text-center text-sm text-green-700">
                              Review your information and submit to complete your caregiver profile.
                           </p>
                        </div>

                        <div className="space-y-3 text-sm">
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Name</span>
                              <span className="font-medium text-slate-900">{basicInfo.firstName} {basicInfo.lastName}</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Email</span>
                              <span className="font-medium text-slate-900">{basicInfo.email}</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Phone</span>
                              <span className="font-medium text-slate-900">{basicInfo.phone}</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Experience</span>
                              <span className="font-medium text-slate-900">{logistics.experience} years</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Hourly Rate</span>
                              <span className="font-medium text-slate-900">${logistics.rate}/hr</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Location</span>
                              <span className="font-medium text-slate-900">{logistics.location}</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Certifications</span>
                              <span className="font-medium text-slate-900">{certs.length > 0 ? certs.join(', ') : 'None'}</span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Available Days</span>
                              <span className="font-medium text-slate-900">
                                 {Object.entries(weeklyAvailability).filter(([_, v]) => v).length} days selected
                              </span>
                           </div>
                           <div className="flex justify-between py-2 border-b border-slate-100">
                              <span className="text-slate-500">Documents</span>
                              <span className="font-medium text-slate-900">
                                 {skipDocuments ? 'Skipped' : [
                                    documents.driversLicense && "License",
                                    documents.insurance && "Insurance",
                                    documents.registration && "Registration"
                                 ].filter(Boolean).join(', ') || 'Pending'}
                              </span>
                           </div>
                           <div className="flex justify-between py-2">
                              <span className="text-slate-500">Background Check</span>
                              <span className="font-medium text-green-600">Consent Given</span>
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="pt-4 flex gap-3">
                     {step > 1 && (
                        <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                           Back
                        </Button>
                     )}
                     <Button 
                        fullWidth 
                        type="submit" 
                        disabled={isLoading || (!skipDocuments && step > 3 && step < 7 && !canProceedFromDocuments())} 
                        variant="accent"
                     >
                        {isLoading ? "Creating Profile..." : step === TOTAL_STEPS ? "Start Earning" : "Next Step"}
                        {!isLoading && step < TOTAL_STEPS && <ChevronRight className="w-4 h-4 ml-1" />}
                     </Button>
                  </div>
               </form>

            </div>

            <div className="mt-6 text-center">
               <button onClick={() => onNavigate('landing')} className="flex items-center justify-center mx-auto text-slate-400 hover:text-slate-600 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
               </button>
            </div>
         </div>
      </div>
   );
};
