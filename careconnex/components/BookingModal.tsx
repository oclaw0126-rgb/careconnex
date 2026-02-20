

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, ArrowLeft, ShieldCheck, MapPin, Info } from 'lucide-react';
import { Caregiver, Appointment, MicroTask, MICRO_TASKS } from '../types';
import { Button } from './ui/Button';
import { CareShieldToggle } from './ui/CareShieldToggle';
import { bunkerService, InsuranceQuote } from '../services/bunkerService';
import { useCareConnex } from '../context/CareConnexContext';

interface BookingModalProps {
  caregiver: Caregiver;
  onClose: () => void;
  onConfirm: (appt: Appointment) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ caregiver, onClose, onConfirm }) => {
  const { currentUser, addToast } = useCareConnex();
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Micro-Visit State
  const [bookingType, setBookingType] = useState<'hourly' | 'task'>('hourly');
  const [selectedTask, setSelectedTask] = useState<MicroTask | null>(null);

  // Insurance State
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [insuranceQuote, setInsuranceQuote] = useState<InsuranceQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const INSURANCE_FEE = insuranceQuote?.premium || 2.00;

  // Fetch insurance quote when insurance is enabled and we have booking details
  useEffect(() => {
    const fetchQuote = async () => {
      if (includeInsurance && selectedDate && selectedTime) {
        setLoadingQuote(true);
        try {
          const dateObj = dates.find(d => d.full === selectedDate);
          const duration = bookingType === 'task' && selectedTask
            ? selectedTask.durationMin / 60
            : 3; // Default 3 hours for hourly

          const quote = await bunkerService.getQuote({
            date: dateObj?.iso || new Date().toISOString(),
            duration: duration,
            caregiverName: caregiver.name,
            clientName: currentUser?.displayName || currentUser?.email || "Client",
            location: caregiver.location || "Unknown"
          });

          setInsuranceQuote(quote);
        } catch (error) {
          console.error('Failed to get insurance quote:', error);
          setInsuranceQuote(null);
        } finally {
          setLoadingQuote(false);
        }
      } else {
        setInsuranceQuote(null);
      }
    };

    fetchQuote();
  }, [includeInsurance, selectedDate, selectedTime, bookingType, selectedTask]);

  // Generate next 30 days for selection
  // BUG FIX: Store dates in UTC, display in local timezone
  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i + 1); // Start from tomorrow
    // Store as UTC ISO string (YYYY-MM-DD)
    const utcIso = d.toISOString().split('T')[0];
    // Display in local timezone
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      date: d.getUTCDate(),
      full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
      iso: utcIso
    };
  });

  const times = ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM"];

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      setStep('confirm');
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) return;
    setLoading(true);

    const dateObj = dates.find(d => d.full === selectedDate);
    const isoDate = dateObj ? dateObj.iso : new Date().toISOString().split('T')[0];

    // Cost Logic
    let baseCost = 0;

    if (bookingType === 'task' && selectedTask) {
      baseCost = selectedTask.flatRate;
    } else {
      baseCost = caregiver.hourlyRate * 3; // Default 3 hours
    }

    const totalCost = baseCost + (includeInsurance ? INSURANCE_FEE : 0);

    // Use current user's info if available, fallback to placeholder
    const clientId = currentUser?.uid || 'temp-client-id';
    const clientName = currentUser?.displayName || 'Guest User';

    // Calculate duration
    const duration = bookingType === 'task' && selectedTask
      ? selectedTask.durationMin / 60
      : 3; // Default 3 hours for hourly

    const newAppt: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      clientId,
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      clientName,
      date: selectedDate,
      isoDate,
      time: selectedTime,
      duration,
      status: 'confirmed',
      paymentStatus: 'pending',
      cost: totalCost,

      // Insurance Data
      hasInsurance: includeInsurance,
      insuranceFee: includeInsurance ? INSURANCE_FEE : 0,
      insuranceProvider: includeInsurance ? 'Bunker' : undefined,

      // Micro-Visit Data
      bookingType,
      taskName: selectedTask?.name,
      isMicroVisit: bookingType === 'task'
    };

    // Purchase insurance policy if enabled
    if (includeInsurance && insuranceQuote) {
      try {
        const policy = await bunkerService.purchasePolicy(
          insuranceQuote.quoteId,
          newAppt.id,
          'mock_payment_method' // In real app, use actual payment method
        );

        // Add insurance details to appointment
        newAppt.insurancePolicyId = policy.policyId;
        newAppt.insurancePremium = policy.premium;
        newAppt.insuranceCertificateUrl = policy.certificateUrl;
      } catch (error) {
        console.error('Failed to purchase insurance:', error);
        // BUG FIX: Don't continue booking if insurance purchase fails
        addToast("Booking failed: Insurance purchase could not be completed. Please try again or disable insurance.", 'error');
        setLoading(false);
        return;
      }
    }

    onConfirm(newAppt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-slide-in">

        {/* Modal Header */}
        <div className="bg-teal-600 p-6 text-white relative transition-all duration-300">
          {/* Back Button (Only on Confirm step) */}
          <button
            onClick={step === 'confirm' ? () => setStep('select') : onClose}
            className={`absolute top-4 left-4 p-1 rounded-full transition-colors ${step === 'confirm' ? 'text-teal-100 hover:text-white hover:bg-white/10' : 'hidden'}`}
          >
            <ArrowLeft size={20} />
          </button>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-teal-100 hover:text-white bg-white/10 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-bold text-center">
            {step === 'select' ? 'Book Appointment' : 'Confirm Details'}
          </h2>
          <p className="text-teal-100 text-center text-sm mt-1">
            {step === 'select' ? `with ${caregiver.name}` : 'Review your booking below'}
          </p>
        </div>

        <div className="p-6">
          {step === 'select' ? (
            /* STEP 1: SELECTION */
            <div className="space-y-6 animate-slide-in">
              {/* Booking Type Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => { setBookingType('hourly'); setSelectedTask(null); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${bookingType === 'hourly' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Hourly Shift
                </button>
                <button
                  onClick={() => setBookingType('task')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${bookingType === 'task' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Micro-Visit
                </button>
              </div>

              {/* Task Selection (Only for Micro-Visits) */}
              {bookingType === 'task' && (
                <div>
                  <div className="flex items-center text-slate-800 font-semibold mb-3">
                    <Info className="w-5 h-5 mr-2 text-teal-600" />
                    Select Service
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {MICRO_TASKS.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`
                          w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center group
                          ${selectedTask?.id === task.id ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600' : 'border-slate-200 hover:border-teal-300'}
                        `}
                      >
                        <div>
                          <p className={`font-bold ${selectedTask?.id === task.id ? 'text-teal-900' : 'text-slate-700'}`}>{task.name}</p>
                          <p className="text-xs text-slate-500">{task.durationMin} mins • Flat Rate</p>
                        </div>
                        <span className={`font-bold ${selectedTask?.id === task.id ? 'text-teal-700' : 'text-slate-900'}`}>${task.flatRate}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Date Selection */}
              <div>
                <div className="flex items-center text-slate-800 font-semibold mb-3">
                  <Calendar className="w-5 h-5 mr-2 text-teal-600" />
                  Select Date
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {dates.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => setSelectedDate(d.full)}
                      className={`
                        flex flex-col items-center justify-center min-w-[70px] h-[80px] rounded-xl border-2 transition-all flex-shrink-0
                        ${selectedDate === d.full
                          ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                          : 'border-slate-100 hover:border-teal-200 text-slate-600'
                        }
                      `}
                    >
                      <span className="text-xs font-medium uppercase">{d.day}</span>
                      <span className="text-2xl font-bold">{d.date}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <div className="flex items-center text-slate-800 font-semibold mb-3">
                  <Clock className="w-5 h-5 mr-2 text-teal-600" />
                  Select Time
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {times.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`
                        py-3 px-4 rounded-xl border text-sm font-medium transition-all
                        ${selectedTime === t
                          ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                          : 'border-slate-200 text-slate-600 hover:border-teal-300'
                        }
                      `}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate Info & Action */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4 text-sm bg-slate-50 p-3 rounded-lg">
                  <span className="text-slate-500">
                    {bookingType === 'task' ? 'Service Cost' : 'Hourly Rate'}
                  </span>
                  <span className="font-bold text-slate-900">
                    {bookingType === 'task'
                      ? (selectedTask ? `$${selectedTask.flatRate}` : '-')
                      : `$${caregiver.hourlyRate}/hr`
                    }
                  </span>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleContinue}
                  disabled={!selectedDate || !selectedTime || (bookingType === 'task' && !selectedTask)}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: CONFIRMATION */
            <div className="space-y-6 animate-slide-in">
              {/* Caregiver Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex gap-4 items-center">
                <img
                  src={caregiver.imageUrl}
                  alt={caregiver.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{caregiver.name}</h3>
                  {caregiver.verified && (
                    <div className="flex items-center text-xs text-blue-700 font-medium mt-1 bg-blue-100/50 px-2 py-0.5 rounded w-fit">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Background Verified
                    </div>
                  )}
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 mr-1" />
                    {caregiver.distance} miles away
                  </div>
                </div>
              </div>

              {/* CareShield Toggle */}
              <CareShieldToggle
                enabled={includeInsurance}
                onChange={setIncludeInsurance}
                price={INSURANCE_FEE}
              />

              {/* Appointment Details */}
              <div className="border-t border-b border-slate-100 py-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-slate-600">
                    <Calendar className="w-5 h-5 mr-3 text-teal-600" />
                    <span className="font-medium">Date</span>
                  </div>
                  <span className="font-bold text-slate-900">{selectedDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-slate-600">
                    <Clock className="w-5 h-5 mr-3 text-teal-600" />
                    <span className="font-medium">Time</span>
                  </div>
                  <span className="font-bold text-slate-900">{selectedTime}</span>
                </div>
              </div>

              {/* Cost Estimation */}
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-teal-800 font-bold mb-1">Estimated Total</p>
                    <p className="text-xs text-teal-600">
                      {bookingType === 'task' && selectedTask
                        ? `${selectedTask.name} ($${selectedTask.flatRate})`
                        : `(3 hrs x $${caregiver.hourlyRate})`
                      }
                      {includeInsurance && ` + $${INSURANCE_FEE.toFixed(2)} ins.`}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-teal-700">
                    ${(bookingType === 'task' && selectedTask ? selectedTask.flatRate : caregiver.hourlyRate * 3) + (includeInsurance ? INSURANCE_FEE : 0)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <Button
                  fullWidth
                  size="lg"
                  onClick={handleConfirmBooking}
                  variant="primary"
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200"
                >
                  Confirm Booking
                </Button>

                <div className="flex items-center justify-center mt-4 text-xs text-slate-400">
                  <Info className="w-3 h-3 mr-1" />
                  <span>Payment due only after service is completed.</span>
                </div>

                <button
                  onClick={() => setStep('select')}
                  className="w-full text-center text-slate-500 text-sm mt-4 hover:text-slate-700 hover:underline"
                >
                  Change Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
