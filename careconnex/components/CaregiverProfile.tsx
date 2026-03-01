import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Settings, CreditCard, LogOut, ChevronLeft, ShieldCheck, Star, Home, Loader2, FileText, Upload, Lock, Trash2, CheckCircle, AlertTriangle, Eye, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { AvatarUpload } from './ui/AvatarUpload';
import { DocumentUpload } from './ui/DocumentUpload';
import { ViewType, AddToastFunction, Review, Caregiver, CaregiverDocument } from '../types';
import { dbService, authService } from '../services/api';
import { BackgroundCheckModal } from './BackgroundCheckModal';
import { documentUploadService, DocumentType } from '../services/documentUpload';

interface CaregiverProfileProps {
  onNavigate: (view: ViewType) => void;
  onShowToast: AddToastFunction;
}

export const CaregiverProfile: React.FC<CaregiverProfileProps> = ({ onNavigate, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'security'>('profile');
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profile, setProfile] = useState<Partial<Caregiver> & { bio?: string, experience?: number }>({
    name: '',
    imageUrl: '',
    hourlyRate: 0,
    bio: '',
    experience: 0,
    verified: false,
    backgroundCheckStatus: 'none'
  });

  // Modal State
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CaregiverDocument | null>(null);

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentUser = authService.getCurrentUser();
  const CAREGIVER_ID = 101;

  useEffect(() => {
    let unsubscribeReviews: (() => void) | undefined;

    const fetchData = async () => {
      try {
        // 1. Fetch Profile
        let fetchedProfile: Caregiver | undefined;
        const { caregivers: allCaregivers } = await dbService.getCaregivers();

        if (currentUser) {
          fetchedProfile = allCaregivers.find(c => c.uid === currentUser.uid);
        }

        if (!fetchedProfile) fetchedProfile = allCaregivers.find(c => c.id === String(CAREGIVER_ID));

        if (fetchedProfile) {
          setProfile(prev => ({
            ...fetchedProfile!,
            bio: fetchedProfile?.bio || "Certified caregiver with 5 years of experience specializing in dementia care and mobility assistance.",
            experience: fetchedProfile?.experience || 5,
            hourlyRate: fetchedProfile?.hourlyRate || prev.hourlyRate || 25,
            imageUrl: fetchedProfile?.imageUrl || prev.imageUrl
          }));
        }

        // 2. Fetch Reviews
        unsubscribeReviews = dbService.subscribeToReviews(String(CAREGIVER_ID), (fetchedReviews) => {
          setReviews(fetchedReviews);
        });

      } catch (error) {
        console.error("Error fetching caregiver profile:", error);
        onShowToast("Failed to load profile data", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribeReviews) unsubscribeReviews();
    };
  }, [currentUser]);

  // Memoize expensive calculations
  const averageRating = useMemo(() => 
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0"
  , [reviews]);

  // Document handlers
  const handleDocumentUpload = useCallback(async (file: File, type: DocumentType) => {
    const userId = currentUser?.uid;
    if (!userId) {
      onShowToast("Please log in to upload documents", 'error');
      return;
    }

    try {
      const doc = await documentUploadService.uploadDocument(
        userId,
        file,
        type
      );

      // Update local state
      setProfile(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [type]: doc
        }
      }));

      onShowToast(`${documentUploadService.getDocumentTypeName(type)} uploaded successfully`, 'success');
    } catch (error) {
      console.error('Upload error:', error);
      onShowToast(error instanceof Error ? error.message : 'Upload failed', 'error');
      throw error;
    }
  }, [currentUser, onShowToast]);

  const handleDocumentDelete = useCallback(async (type: DocumentType) => {
    const userId = currentUser?.uid;
    if (!userId) return;

    const doc = profile.documents?.[type];
    if (!doc?.path) return;

    try {
      await documentUploadService.deleteDocument(userId, type, doc.path);

      setProfile(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [type]: undefined
        }
      }));

      onShowToast('Document removed', 'info');
    } catch (error) {
      onShowToast('Failed to remove document', 'error');
    }
  }, [currentUser, profile.documents, onShowToast]);

  // Wrap handlers in useCallback to prevent unnecessary re-renders
  const handleLogout = useCallback(async () => {
    await authService.logout();
    onShowToast("Logged out successfully", 'info');
    onNavigate('landing');
  }, [onNavigate, onShowToast]);

  const handleSave = useCallback(async () => {
    if (currentUser) {
      try {
        await dbService.updateUser('caregivers', currentUser.uid, {
          hourlyRate: Number(profile.hourlyRate),
          imageUrl: profile.imageUrl
        });
        onShowToast("Profile updated successfully", 'success');
      } catch (e) {
        onShowToast("Failed to update profile", 'error');
      }
    } else {
      onShowToast("Profile updated (Demo Mode)", 'success');
    }
  }, [currentUser, profile.hourlyRate, profile.imageUrl, onShowToast]);

  const handleImageUpdate = useCallback((base64: string) => {
    setProfile(prev => ({ ...prev, imageUrl: base64 }));
  }, []);

  const handlePasswordChange = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      onShowToast("Passwords do not match", 'error');
      return;
    }
    try {
      await authService.updateUserPassword(newPassword);
      onShowToast("Password updated successfully", 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      onShowToast("Failed to update password", 'error');
    }
  }, [newPassword, confirmPassword, onShowToast]);

  const handleDeleteAccount = useCallback(async () => {
    if (confirm("Are you sure you want to delete your account?")) {
      try {
        await authService.deleteUserAccount();
        onShowToast("Account deleted", 'info');
        onNavigate('landing');
      } catch (e) {
        onShowToast("Failed to delete account", 'error');
      }
    }
  }, [onNavigate, onShowToast]);

  const getDocumentStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const getDocumentStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'pending':
      default:
        return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
    }
  };

  // Calculate document summary
  const docSummary = useMemo(() => {
    return documentUploadService.getDocumentStatusSummary(profile.documents);
  }, [profile.documents]);

  if (loading) return (
    <div className="flex justify-center p-10" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-orange-500" aria-hidden="true" />
      <span className="sr-only">Loading profile...</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('caregiver')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 ml-2">Worker Profile</h1>
        </div>
        <button
          onClick={() => onNavigate('caregiver')}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
        >
          Go to Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === 'documents' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Documents
          {docSummary.pending > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
              {docSummary.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'security' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <div className="bg-orange-500 h-24 relative">
              <div className="absolute -bottom-10 left-6">
                <AvatarUpload
                  currentUrl={profile.imageUrl}
                  onImageSelected={handleImageUpdate}
                />
              </div>
            </div>
            <div className="pt-14 px-6 pb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    {profile.name}
                    {profile.verified && <ShieldCheck className="w-5 h-5 text-blue-500 ml-1" fill="currentColor" />}
                  </h2>
                  <div className="flex items-center text-slate-500 text-sm mt-1">
                    <Star className="w-4 h-4 text-orange-400 mr-1" fill="currentColor" />
                    <span className="font-medium text-slate-700 mr-1">{averageRating}</span>
                    <span>({reviews.length} Reviews)</span>
                  </div>
                </div>
                {profile.verified ? (
                  <Badge variant="success">Verified Pro</Badge>
                ) : (
                  <Badge variant="neutral">Unverified</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Hourly Rate ($)"
                    value={profile.hourlyRate}
                    onChange={(e) => setProfile({ ...profile, hourlyRate: Number(e.target.value) })}
                    type="number"
                  />
                  <Input
                    label="Years Exp."
                    value={profile.experience}
                    onChange={(e) => setProfile({ ...profile, experience: Number(e.target.value) })}
                    type="number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 min-h-[100px]"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </div>

                <Button variant="accent" onClick={handleSave} fullWidth>Update Profile</Button>
              </div>
            </div>
          </div>

          {/* Document Status Summary Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-orange-500" /> Document Status
              </h3>
              
              {docSummary.uploaded === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">No documents uploaded yet</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setActiveTab('documents')}
                  >
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Documents Uploaded</span>
                    <span className="font-medium">{docSummary.uploaded} / {docSummary.total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${(docSummary.uploaded / docSummary.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs">
                    {docSummary.approved > 0 && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {docSummary.approved} Approved
                      </span>
                    )}
                    {docSummary.pending > 0 && (
                      <span className="text-orange-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {docSummary.pending} Pending
                      </span>
                    )}
                    {docSummary.rejected > 0 && (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {docSummary.rejected} Rejected
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-orange-500" /> Payout Settings
              </h3>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg mr-3 flex items-center justify-center text-slate-500 font-bold text-xs">BANK</div>
                  <div>
                    <p className="text-slate-900 font-medium text-sm">Chase Bank ....8829</p>
                    <p className="text-slate-400 text-xs">Instant Pay Enabled</p>
                  </div>
                </div>
                <span className="text-green-600 font-bold text-sm">Active</span>
              </div>
              <Button variant="secondary" size="sm" fullWidth>Manage Accounts</Button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Verification Status Card */}
          <div className={`p-4 rounded-xl flex items-start gap-4 ${profile.verified
              ? 'bg-green-50 border border-green-200'
              : profile.backgroundCheckStatus === 'pending'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-slate-50 border border-slate-200'
            }`}>
            <div className={`p-2 rounded-full ${profile.verified ? 'bg-green-100' : profile.backgroundCheckStatus === 'pending' ? 'bg-blue-100' : 'bg-slate-200'
              }`}>
              {profile.verified ? <ShieldCheck className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-slate-500" />}
            </div>
            <div className="flex-grow">
              <h4 className="font-bold text-slate-900">
                {profile.verified ? 'Background Verified' : profile.backgroundCheckStatus === 'pending' ? 'Verification In Progress' : 'Identity Unverified'}
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                {profile.verified
                  ? 'Your Checkr report is clear. You are eligible for all jobs.'
                  : profile.backgroundCheckStatus === 'pending'
                    ? 'We are processing your background check. This typically takes 24-48 hours.'
                    : 'You must complete a background check to accept jobs on CareSync.'}
              </p>

              {!profile.verified && profile.backgroundCheckStatus !== 'pending' && (
                <Button
                  size="sm"
                  onClick={() => setShowCheckModal(true)}
                  className="mt-3 bg-slate-900 text-white"
                >
                  Start Background Check
                </Button>
              )}
            </div>
          </div>

          {/* Required Documents Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-orange-500" /> Required Documents
              </h3>
              <span className="text-xs text-slate-500">Upload clear, readable images or PDFs</span>
            </div>

            <div className="space-y-4">
              {/* Driver's License */}
              <DocumentUpload
                type="driversLicense"
                label="Driver's License (Front)"
                description="Required for all caregivers who provide transportation"
                existingDocument={profile.documents?.driversLicense}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
              />

              {/* Insurance */}
              <DocumentUpload
                type="insurance"
                label="Insurance Card/Policy"
                description="Current auto insurance documentation"
                existingDocument={profile.documents?.insurance}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
              />

              {/* Registration */}
              <DocumentUpload
                type="registration"
                label="Vehicle Registration"
                description="Current vehicle registration document"
                existingDocument={profile.documents?.registration}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
              />
            </div>
          </div>

          {/* Document Help Text */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="text-sm font-bold text-blue-900 mb-1">Why we need these documents</h4>
            <p className="text-xs text-blue-700">
              These documents help us ensure the safety of our clients and verify that you meet our transportation requirements. 
              All documents are securely stored and only accessible to authorized administrators.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-orange-500" /> Security Settings
          </h3>

          <div className="space-y-4 mb-8 border-b border-slate-100 pb-8">
            <h4 className="text-sm font-bold text-slate-700">Change Password</h4>
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button variant="accent" onClick={handlePasswordChange} disabled={!newPassword}>Update Password</Button>
          </div>

          <div>
            <h4 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h4>
            <p className="text-sm text-slate-500 mb-4">Deleting your account is permanent.</p>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center text-red-500 hover:text-red-700 font-medium border border-red-200 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <button onClick={() => onNavigate('caregiver')} className="w-full p-4 text-left flex items-center text-slate-700 hover:bg-slate-50 transition-colors font-medium border-b border-slate-100">
          <Home className="w-5 h-5 mr-3 text-slate-400" />
          Return to Dashboard
        </button>
        <button onClick={handleLogout} className="w-full p-4 text-left flex items-center text-red-500 hover:bg-red-50 transition-colors font-medium">
          <LogOut className="w-5 h-5 mr-3" />
          Log Out
        </button>
      </div>

      {showCheckModal && (
        <BackgroundCheckModal
          onClose={() => setShowCheckModal(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewDocument(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-slate-900">Document Preview</h3>
              <button 
                onClick={() => setPreviewDocument(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-50">
              {previewDocument.fileType?.startsWith('image/') ? (
                <img 
                  src={previewDocument.url} 
                  alt="Document" 
                  className="max-h-[60vh] rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">PDF Document</p>
                  <a 
                    href={previewDocument.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline text-sm mt-2 inline-block"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-slate-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Status: <span className="font-medium capitalize">{previewDocument.status}</span></span>
                <span className="text-slate-500">
                  Uploaded: {new Date(previewDocument.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
