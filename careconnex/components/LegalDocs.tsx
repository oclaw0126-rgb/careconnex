
import React from 'react';
import { X, Shield, Lock, FileText } from 'lucide-react';

interface LegalDocsProps {
  type: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalDocs: React.FC<LegalDocsProps> = ({ type, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-full text-teal-600">
                 {type === 'terms' ? <FileText className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-900">
                    {type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                 </h2>
                 <p className="text-xs text-slate-500">Last updated: December 2024</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-500" />
           </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 text-slate-600 text-sm leading-relaxed space-y-6">
           {type === 'terms' ? (
             <>
               <p><strong>1. Acceptance of Terms</strong><br/>By accessing CareSync AI, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform.</p>
               
               <p><strong>2. Nature of Platform</strong><br/>CareSync AI is a venue connecting independent Caregivers with Clients. We are not an employer. Caregivers are independent contractors.</p>
               
               <p><strong>3. Trust & Safety</strong><br/>While we perform background checks via Checkr, we do not guarantee the conduct of any user. Users are responsible for their interactions.</p>
               
               <p><strong>4. Payments & Fees</strong><br/>Clients are charged at the time of booking or completion. CareSync takes a platform fee. Cancellations within 24 hours may incur a fee.</p>
               
               <p><strong>5. Medical Disclaimer</strong><br/>Caregivers provide non-medical assistance unless specifically licensed (e.g., RN). This platform does not provide medical advice.</p>
             </>
           ) : (
             <>
               <p><strong>1. Information Collection</strong><br/>We collect PII (Personally Identifiable Information) such as name, address, and health needs to facilitate care matching.</p>
               
               <p><strong>2. HIPAA Compliance</strong><br/>Health data is encrypted at rest. We execute BAAs with our cloud providers to ensure the security of your medical information.</p>
               
               <p><strong>3. Data Sharing</strong><br/>We verify identity using third-party services (Stripe, Checkr). We do not sell your data to advertisers.</p>
               
               <p><strong>4. Location Data</strong><br/>For Electronic Visit Verification (EVV), we track Caregiver location only during active shifts.</p>
             </>
           )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
           >
             I Understand
           </button>
        </div>
      </div>
    </div>
  );
};
