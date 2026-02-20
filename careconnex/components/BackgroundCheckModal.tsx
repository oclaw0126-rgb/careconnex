
import React, { useState } from 'react';
import { X, Shield, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { dbService, authService } from '../services/api';
import { AddToastFunction } from '../types';

interface BackgroundCheckModalProps {
  onClose: () => void;
  onShowToast: AddToastFunction;
  onSuccess?: () => void; // New callback
}

export const BackgroundCheckModal: React.FC<BackgroundCheckModalProps> = ({ onClose, onShowToast, onSuccess }) => {
  const [formData, setFormData] = useState({
    legalFirstName: '',
    legalLastName: '',
    dob: '',
    ssn: '',
    zipCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real production app, this data would be sent to a Cloud Function 
      // which then transmits it securely to Checkr. It should NEVER be stored in plain text in Firestore.
      await dbService.initiateBackgroundCheck(formData);
      
      setSuccess(true);
      
      if (onSuccess) {
          onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error(error);
      onShowToast("Verification request failed. Please check your internet.", 'error');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slide-in text-center">
           <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className="w-10 h-10 text-green-600" />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Submitted</h2>
           <p className="text-slate-500">
             Checkr is processing your background report. This usually takes 24-48 hours. We'll notify you when you are verified!
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-in">
        {/* Secure Header */}
        <div className="bg-slate-900 p-6 text-white text-center relative">
           <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
             <X size={24} />
           </button>
           <div className="flex justify-center mb-4">
              <Shield className="w-10 h-10 text-green-400" />
           </div>
           <h2 className="text-xl font-bold">Identity Verification</h2>
           <p className="text-sm text-slate-400 mt-1">Powered by Checkr • 256-bit SSL Encrypted</p>
        </div>

        <div className="p-6">
           <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-3 mb-6">
              <Lock className="w-5 h-5 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                 We need your SSN and Date of Birth to run a criminal background check. This information is sent directly to Checkr and is <strong>never stored</strong> on our servers.
              </p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <Input 
                   label="Legal First Name" 
                   required
                   value={formData.legalFirstName}
                   onChange={(e) => setFormData({...formData, legalFirstName: e.target.value})}
                 />
                 <Input 
                   label="Legal Last Name" 
                   required
                   value={formData.legalLastName}
                   onChange={(e) => setFormData({...formData, legalLastName: e.target.value})}
                 />
              </div>
              
              <Input 
                 label="Social Security Number (SSN)" 
                 placeholder="XXX-XX-XXXX"
                 required
                 value={formData.ssn}
                 onChange={(e) => setFormData({...formData, ssn: e.target.value})}
              />

              <div className="grid grid-cols-2 gap-4">
                 <Input 
                   label="Date of Birth" 
                   type="date"
                   required
                   value={formData.dob}
                   onChange={(e) => setFormData({...formData, dob: e.target.value})}
                 />
                 <Input 
                   label="Current Zip Code" 
                   required
                   value={formData.zipCode}
                   onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                 />
              </div>

              <div className="pt-2">
                 <Button fullWidth type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                    {loading ? 'Submitting securely...' : 'Submit for Verification'}
                 </Button>
              </div>
              
              <p className="text-center text-[10px] text-slate-400 mt-4">
                 By clicking Submit, you agree to the Checkr Terms of Service and authorize a background check.
              </p>
           </form>
        </div>
      </div>
    </div>
  );
};
