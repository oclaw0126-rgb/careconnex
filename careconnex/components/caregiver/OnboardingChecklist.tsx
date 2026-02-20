import React, { useState, useRef } from 'react';
import { Check, Shield, User, FileText, ChevronRight, AlertCircle, Lock, Upload, X } from 'lucide-react';
import { dbService, storageService } from '../../services/api';
import { Caregiver, WeeklySchedule } from '../../types';
import { Button } from '../ui/Button';
import { SkillsSelector } from './SkillsSelector';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { RateSuggestion } from './RateSuggestion';

interface OnboardingChecklistProps {
    profile: Caregiver;
    onUpdate: () => void;
    onNavigate: (view: any) => void;
    onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ profile, onUpdate, onNavigate, onShowToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profileData, setProfileData] = useState({
        skills: profile.skills || [],
        weeklyAvailability: profile.weeklyAvailability || {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        },
        hourlyRate: profile.hourlyRate || 25
    });
    const [formData, setFormData] = useState({
        legalFirstName: '',
        legalLastName: '',
        dob: '',
        ssn: '',
        ssnLastFour: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        consent: false
    });
    const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentStep = profile.onboardingStep || 1;
    const status = profile.verificationStatus || 'pending';

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Validate caregiver ID is available
        if (!profile?.uid) {
            onShowToast?.('Error: Caregiver profile not loaded. Please refresh the page.', 'error');
            console.error('Document upload failed: profile.uid is undefined');
            return;
        }

        setIsUploading(true);
        const uploadedUrls: string[] = [];
        const failedFiles: string[] = [];

        for (const file of Array.from(files)) {
            try {
                console.log(`Uploading document: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
                
                // Upload to secure storage for manual review
                const url = await storageService.uploadVerificationDocument(
                    file,
                    profile.uid,
                    'background_check'
                );
                
                if (url) {
                    uploadedUrls.push(url);
                    console.log(`Successfully uploaded: ${file.name}`);
                }
            } catch (error: any) {
                console.error(`Failed to upload document ${file.name}:`, error);
                failedFiles.push(file.name);
            }
        }

        if (uploadedUrls.length > 0) {
            setUploadedDocuments(prev => [...prev, ...uploadedUrls]);
            onShowToast?.(`${uploadedUrls.length} document(s) uploaded successfully`, 'success');
        }
        
        if (failedFiles.length > 0) {
            onShowToast?.(`Failed to upload: ${failedFiles.join(', ')}`, 'error');
        }

        setIsUploading(false);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeDocument = (url: string) => {
        setUploadedDocuments(prev => prev.filter(doc => doc !== url));
    };

    const handleSubmitBackgroundCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.legalFirstName.trim()) {
            onShowToast?.('Please enter your legal first name', 'error');
            return;
        }
        if (!formData.legalLastName.trim()) {
            onShowToast?.('Please enter your legal last name', 'error');
            return;
        }
        if (!formData.dob) {
            onShowToast?.('Please enter your date of birth', 'error');
            return;
        }
        if (!formData.ssn || formData.ssn.length < 9) {
            onShowToast?.('Please enter a valid Social Security Number', 'error');
            return;
        }
        if (!formData.consent) {
            onShowToast?.('Please consent to the background check', 'error');
            return;
        }
        if (!profile?.uid) {
            onShowToast?.('Error: Profile not loaded. Please refresh and try again.', 'error');
            return;
        }

        setIsSubmitting(true);
        console.log('Submitting background check for review...');
        
        try {
            // Extract last 4 of SSN for display (don't store full SSN)
            const ssnLastFour = formData.ssn.slice(-4);
            const submitData = {
                verificationStatus: 'submitted' as const,
                onboardingStep: 3,
                backgroundCheckData: {
                    legalFirstName: formData.legalFirstName.trim(),
                    legalLastName: formData.legalLastName.trim(),
                    dob: formData.dob,
                    ssnLastFour: ssnLastFour,
                    address: formData.address.trim(),
                    city: formData.city.trim(),
                    state: formData.state.trim(),
                    zip: formData.zip.trim(),
                    consent: formData.consent,
                    documents: uploadedDocuments,
                    submittedAt: new Date().toISOString()
                }
            };
            
            console.log('Submitting data:', { ...submitData, backgroundCheckData: { ...submitData.backgroundCheckData, ssnLastFour: '***' } });

            // Submit for manual review
            await dbService.updateUser('caregivers', profile.uid, submitData);
            
            console.log('Background check submitted successfully');
            onShowToast?.('Your application has been submitted for review!', 'success');
            onUpdate();
        } catch (error: any) {
            console.error('Failed to submit background check:', error);
            const errorMessage = error?.message || 'Failed to submit application. Please try again.';
            onShowToast?.(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'submitted') {
        return (
            <div className="max-w-2xl mx-auto mt-10 text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification in Progress</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    Thanks for submitting your information! Our Trust & Safety team is reviewing your profile.
                    This usually takes 24-48 hours. You will receive an email when you are approved.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg inline-block text-left text-sm text-slate-600">
                    <p className="font-medium mb-2">Next Steps:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Admin Review</li>
                        <li>Background Check (Checkr)</li>
                        <li>Phone Interview (if required)</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-10">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to CareConnex!</h1>
                <p className="text-slate-500">Complete these steps to activate your account and start accepting jobs.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Steps Sidebar */}
                <div className="space-y-4">
                    <div className={`p-4 rounded-xl border transition-all ${currentStep === 1 ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 1</span>
                            {currentStep > 1 && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <h3 className="font-bold flex items-center"><User className="w-4 h-4 mr-2" /> Profile Setup</h3>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${currentStep === 2 ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 2</span>
                            {currentStep > 2 && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <h3 className="font-bold flex items-center"><Shield className="w-4 h-4 mr-2" /> Background Check</h3>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${currentStep === 3 ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Step 3</span>
                        </div>
                        <h3 className="font-bold flex items-center"><Check className="w-4 h-4 mr-2" /> Admin Approval</h3>
                    </div>
                </div>

                {/* Content Area */}
                <div className="md:col-span-2">
                    {currentStep === 1 && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                            <div>
                                <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
                                <p className="text-slate-500 mb-6">Clients are 5x more likely to hire caregivers with a complete profile.</p>
                            </div>

                            {/* Skills Selection */}
                            <div className="pb-8 border-b border-slate-200">
                                <SkillsSelector
                                    selectedSkills={profileData.skills}
                                    onSkillsChange={(skills) => setProfileData({ ...profileData, skills })}
                                />
                            </div>

                            {/* Availability Calendar */}
                            <div className="pb-8 border-b border-slate-200">
                                <AvailabilityCalendar
                                    availability={profileData.weeklyAvailability}
                                    onAvailabilityChange={(availability) => setProfileData({ ...profileData, weeklyAvailability: availability })}
                                />
                            </div>

                            {/* Rate Suggestion */}
                            <div className="pb-8 border-b border-slate-200">
                                <RateSuggestion
                                    location={profile.location || 'Unknown'}
                                    skills={profileData.skills}
                                    certifications={profile.certifications}
                                    currentRate={profileData.hourlyRate}
                                    onRateChange={(rate) => setProfileData({ ...profileData, hourlyRate: rate })}
                                />
                            </div>

                            {/* Basic Profile Checklist */}
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-4">Additional Profile Items</h3>
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                                        <div className={`w-3 h-3 rounded-full mr-3 ${profile.bio ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                        <span className={profile.bio ? 'text-slate-700' : 'text-slate-400'}>Bio & Experience</span>
                                    </div>
                                    <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                                        <div className={`w-3 h-3 rounded-full mr-3 ${profile.photo ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                        <span className={profile.photo ? 'text-slate-700' : 'text-slate-400'}>Profile Photo</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <Button onClick={() => onNavigate('caregiver-profile')} variant="secondary">Edit Profile</Button>
                                <Button onClick={async () => {
                                    // Save skills, availability, and rate
                                    await dbService.updateUser('caregivers', profile.uid!, {
                                        skills: profileData.skills,
                                        weeklyAvailability: profileData.weeklyAvailability,
                                        hourlyRate: profileData.hourlyRate,
                                        onboardingStep: 2
                                    });
                                    onUpdate();
                                }} disabled={profileData.skills.length === 0}>
                                    Continue to Background Check <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center mb-6">
                                <Lock className="w-5 h-5 text-green-500 mr-2" />
                                <h2 className="text-xl font-bold">Identity Verification</h2>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-start">
                                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-700">
                                    Your SSN is encrypted and sent directly to our background check provider (Checkr).
                                    It is <strong>never</strong> stored visibly in our database.
                                </p>
                            </div>

                            <form onSubmit={handleSubmitBackgroundCheck} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Legal First Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.legalFirstName}
                                            onChange={e => setFormData({ ...formData, legalFirstName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Legal Last Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.legalLastName}
                                            onChange={e => setFormData({ ...formData, legalLastName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.dob}
                                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Social Security Number</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="XXX-XX-XXXX"
                                        maxLength={11}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none tracking-widest"
                                        value={formData.ssn}
                                        onChange={e => setFormData({ ...formData, ssn: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Only last 4 digits stored for verification</p>
                                </div>

                                {/* Document Upload */}
                                <div className="pt-4 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Upload Documents (Optional)</label>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Upload ID, certifications, or other supporting documents to speed up verification
                                    </p>
                                    
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        multiple
                                        ref={fileInputRef}
                                        onChange={handleDocumentUpload}
                                        className="hidden"
                                    />

                                    {uploadedDocuments.length > 0 && (
                                        <div className="space-y-2 mb-3">
                                            {uploadedDocuments.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm">Document {idx + 1}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDocument(doc)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                    >
                                        {isUploading ? (
                                            <><div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" /> Uploading...</>
                                        ) : (
                                            <><Upload className="w-4 h-4" /> Upload Documents</>
                                        )}
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <label className="flex items-start cursor-pointer">
                                        <input
                                            type="checkbox"
                                            required
                                            className="mt-1"
                                            checked={formData.consent}
                                            onChange={e => setFormData({ ...formData, consent: e.target.checked })}
                                        />
                                        <span className="ml-2 text-sm text-slate-600">
                                            I consent to a background check run by Checkr. I understand that my employment eligibility depends on the results of this report.
                                        </span>
                                    </label>
                                </div>

                                <div className="pt-4 flex justify-between">
                                    <Button type="button" variant="secondary" onClick={async () => {
                                        await dbService.updateUser('caregivers', profile.uid!, { onboardingStep: 1 });
                                        onUpdate();
                                    }}>Back</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
