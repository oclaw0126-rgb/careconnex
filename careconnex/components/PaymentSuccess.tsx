
import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { ViewType, Appointment } from '../types';
import { dbService } from '../services/api';

interface PaymentSuccessProps {
  onNavigate: (view: ViewType) => void;
  onPaymentComplete: (appointmentId: string) => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onNavigate, onPaymentComplete }) => {
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [hasInsurance, setHasInsurance] = useState(false);

  useEffect(() => {
    // 1. Retrieve the appointment ID
    const payingId = localStorage.getItem('payingAppointmentId');
    
    if (payingId) {
       setAppointmentId(payingId);
       
       // Fetch appointment to check insurance status
       const fetchAppointment = async () => {
           try {
               const appt = await dbService.getAppointment(payingId);
               if (appt && appt.hasInsurance) {
                   setHasInsurance(true);
               }
           } catch (error) {
               console.error('Failed to fetch appointment:', error);
               // Continue without insurance info - payment still succeeded
           }
       };
       fetchAppointment();

       // 2. Mark as paid
       onPaymentComplete(payingId);
       
       // 3. Cleanup
       localStorage.removeItem('payingAppointmentId');
    }
  }, [onPaymentComplete]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center animate-slide-in relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>

        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-500 mb-8">
          Thank you. Your invoice has been paid.
        </p>

        {appointmentId && (
          <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left border border-slate-100">
             <div className="flex items-center justify-center text-slate-700 font-medium mb-2">
                <span className="text-sm">Invoice #{appointmentId} settled</span>
             </div>
             
             {/* Insurance Badge - only show if appointment has insurance */}
             {hasInsurance && (
               <div className="flex justify-center mt-4">
                 <div className="inline-flex items-center px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold border border-teal-200">
                    <ShieldCheck className="w-3 h-3 mr-1" /> CareShield Protection Active
                 </div>
               </div>
             )}
          </div>
        )}

        <Button 
          fullWidth 
          onClick={() => onNavigate('client')}
          className="bg-slate-900 hover:bg-slate-800 text-white"
        >
          Return to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
