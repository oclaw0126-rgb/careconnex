import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  User, 
  Heart, 
  ArrowRight,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

interface ExpressBookingProps {
  onBook: (data: ExpressBookingData) => Promise<void>;
  clientId: string;
}

interface ExpressBookingData {
  date: string;
  time: string;
  duration: number;
  serviceType: string;
  seniorName: string;
  address: string;
  specialNeeds: string[];
}

const SERVICE_TYPES = [
  { id: 'companionship', label: 'Companionship', icon: '👥', desc: 'Conversation, activities, light help' },
  { id: 'personal_care', label: 'Personal Care', icon: '🛁', desc: 'Bathing, dressing, grooming' },
  { id: 'mobility', label: 'Mobility Assistance', icon: '🚶', desc: 'Walking, transfers, fall prevention' },
  { id: 'meal_prep', label: 'Meal Preparation', icon: '🍽️', desc: 'Cooking, feeding assistance' },
  { id: 'medication', label: 'Medication Reminders', icon: '💊', desc: 'Pill reminders, health monitoring' },
  { id: 'housekeeping', label: 'Light Housekeeping', icon: '🏠', desc: 'Cleaning, laundry, organizing' },
];

const DURATIONS = [
  { hours: 2, label: '2 hours', price: '$50-70' },
  { hours: 4, label: '4 hours', price: '$100-140' },
  { hours: 8, label: 'Full day (8h)', price: '$200-280' },
  { hours: 24, label: 'Overnight', price: '$300-400' },
];

export const ExpressBooking: React.FC<ExpressBookingProps> = ({ onBook, clientId }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<Partial<ExpressBookingData>>({
    duration: 4,
    serviceType: 'companionship',
    specialNeeds: [],
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleBook = async () => {
    if (!bookingData.date || !bookingData.time || !bookingData.seniorName) return;
    
    setLoading(true);
    try {
      await onBook(bookingData as ExpressBookingData);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialNeed = (need: string) => {
    const current = bookingData.specialNeeds || [];
    if (current.includes(need)) {
      setBookingData({ 
        ...bookingData, 
        specialNeeds: current.filter(n => n !== need) 
      });
    } else {
      setBookingData({ 
        ...bookingData, 
        specialNeeds: [...current, need] 
      });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <Card className="max-w-lg mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= step 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i < step ? <CheckCircle className="w-5 h-5" /> : i}
            </div>
          ))}
        </div>
        <div className="h-1 bg-slate-200 rounded-full">
          <div 
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Service Type */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">What type of care?</h2>
          <p className="text-slate-600 mb-6">Select the primary service needed</p>

          <div className="grid grid-cols-1 gap-3">
            {SERVICE_TYPES.map((service) => (
              <button
                key={service.id}
                onClick={() => setBookingData({ ...bookingData, serviceType: service.id })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  bookingData.serviceType === service.id
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{service.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{service.label}</p>
                    <p className="text-sm text-slate-500">{service.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: When & How Long */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">When do you need care?</h2>
          <p className="text-slate-600 mb-6">Select date, time, and duration</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                min={today}
                max={maxDate}
                value={bookingData.date || ''}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Start Time
              </label>
              <input
                type="time"
                value={bookingData.time || ''}
                onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Duration
              </label>
              <div className="grid grid-cols-2 gap-3">
                {DURATIONS.map((dur) => (
                  <button
                    key={dur.hours}
                    onClick={() => setBookingData({ ...bookingData, duration: dur.hours })}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      bookingData.duration === dur.hours
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{dur.label}</p>
                    <p className="text-xs text-slate-500">{dur.price}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Special Needs */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Any special needs?</h2>
          <p className="text-slate-600 mb-6">Select all that apply (optional)</p>

          <div className="space-y-3">
            {[
              { id: 'dementia', label: 'Dementia/Alzheimer\'s care', icon: '🧠' },
              { id: 'mobility', label: 'Wheelchair or walker', icon: '♿' },
              { id: 'diabetes', label: 'Diabetes management', icon: '🩸' },
              { id: 'pets', label: 'Pet in the home', icon: '🐕' },
              { id: 'non_smoker', label: 'Non-smoker caregiver required', icon: '🚭' },
              { id: 'language', label: 'Non-English speaker', icon: '🌐' },
            ].map((need) => (
              <button
                key={need.id}
                onClick={() => toggleSpecialNeed(need.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                  bookingData.specialNeeds?.includes(need.id)
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <span className="text-xl">{need.icon}</span>
                <span className="font-medium text-slate-900">{need.label}</span>
                {bookingData.specialNeeds?.includes(need.id) && (
                  <CheckCircle className="w-5 h-5 text-teal-600 ml-auto" />
                )}
              </button>
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Skip this step →
          </button>
        </div>
      )}

      {/* Step 4: Who & Where */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Who needs care?</h2>
          <p className="text-slate-600 mb-6">Enter details for the caregiver</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Senior's Name
              </label>
              <input
                type="text"
                placeholder="e.g., Mom, Dad, Grandma"
                value={bookingData.seniorName || ''}
                onChange={(e) => setBookingData({ ...bookingData, seniorName: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Address
              </label>
              <input
                type="text"
                placeholder="Street address, city, zip"
                value={bookingData.address || ''}
                onChange={(e) => setBookingData({ ...bookingData, address: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mt-6">
              <h3 className="font-semibold text-slate-900 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-600">Service:</span>
                  <span className="font-medium">
                    {SERVICE_TYPES.find(s => s.id === bookingData.serviceType)?.label}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">When:</span>
                  <span className="font-medium">
                    {bookingData.date} at {bookingData.time}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">Duration:</span>
                  <span className="font-medium">{bookingData.duration} hours</span>
                </p>
                {bookingData.specialNeeds && bookingData.specialNeeds.length > 0 && (
                  <p className="flex justify-between">
                    <span className="text-slate-600">Special needs:</span>
                    <span className="font-medium">{bookingData.specialNeeds.length} selected</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <Button 
            variant="secondary" 
            onClick={handleBack}
            className="flex-1"
          >
            Back
          </Button>
        )}
        
        {step < 4 ? (
          <Button 
            onClick={handleNext}
            className="flex-1"
            disabled={
              (step === 2 && (!bookingData.date || !bookingData.time)) ||
              (step === 1 && !bookingData.serviceType)
            }
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleBook}
            className="flex-1"
            disabled={!bookingData.seniorName || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Caregiver...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find My Caregiver
              </>
            )}
          </Button>
        )}
      </div>

      {/* Trust Indicators */}
      <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          Background checked
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3 text-red-500" />
          Insured
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          Same-day available
        </span>
      </div>
    </Card>
  );
};

export default ExpressBooking;
