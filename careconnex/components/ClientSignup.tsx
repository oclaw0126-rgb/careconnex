import React, { useState } from 'react';
import { Activity, ArrowLeft, ShieldCheck, ChevronRight, Check } from 'lucide-react';
import { Input } from './ui/Input';
import { LocationInput } from './ui/LocationInput';
import { Button } from './ui/Button';
import { ViewType, AddToastFunction } from '../types';
import { authService } from '../services/api';

// Connect user with Cara AI agent (Railway)
const connectCaraAgent = async (userData: {
  name: string;
  phone: string;
  telegramUsername: string;
  messagingPreference: string;
  zipCode: string;
  needs: string[];
  schedule: string[];
}, userId?: string) => {
  try {
    // Call the Railway-connected Cloud Function
    const response = await fetch('https://us-central1-careconnex-d4c8b.cloudfunctions.net/connectCaraAgent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userData,
        userId
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to connect Cara:', error);
    // Don't fail signup if Cara connection fails
    return { success: false };
  }
};

interface ClientSignupProps {
  onNavigate: (view: ViewType) => void;
  onShowToast: AddToastFunction;
}

export const ClientSignup: React.FC<ClientSignupProps> = ({ onNavigate, onShowToast }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Account Info
  const [accountData, setAccountData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    zipCode: '',
    latitude: 0,
    longitude: 0
  });

  // Password requirements - MUST match validation.ts requirements
  const passwordRequirements = [
    { label: 'At least 8 characters', met: accountData.password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(accountData.password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(accountData.password) },
    { label: 'Contains a number', met: /\d/.test(accountData.password) }
  ];

  // Step 2: Care Needs
  const [careNeeds, setCareNeeds] = useState<string[]>([]);

  // Step 3: Preferences
  const [schedule, setSchedule] = useState<string[]>([]);
  const [genderPref, setGenderPref] = useState('No Preference');

  // Step 4: Connect with Cara
  const [connectWithCara, setConnectWithCara] = useState(false);
  const [messagingPreference, setMessagingPreference] = useState<'telegram' | 'whatsapp' | 'sms'>('telegram');
  const [telegramUsername, setTelegramUsername] = useState('');

  const NEEDS_OPTIONS = [
    "Dementia Care", "Mobility / Lifting", "Companionship", "Meal Prep",
    "Housekeeping", "Transportation", "Medication Reminders", "Bathing / Hygiene"
  ];

  const SCHEDULE_OPTIONS = [
    "Mornings", "Afternoons", "Evenings", "Overnight", "Weekends"
  ];

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData({ ...accountData, [name]: value });

    // Real-time validation
    const errors: Record<string, string> = { ...fieldErrors };

    if (name === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.email = 'Please enter a valid email address';
      } else {
        delete errors.email;
      }
    }

    if (name === 'phone' && value) {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length > 0 && phoneDigits.length < 10) {
        errors.phone = 'Phone number must be 10 digits';
      } else {
        delete errors.phone;
      }
    }

    if (name === 'password' && value) {
      if (value.length > 0 && value.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else {
        delete errors.password;
      }
    }

    setFieldErrors(errors);
  };

  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Step 1
    if (step === 1) {
      // Check all password requirements
      const hasUppercase = /[A-Z]/.test(accountData.password);
      const hasLowercase = /[a-z]/.test(accountData.password);
      const hasNumber = /\d/.test(accountData.password);
      const hasMinLength = accountData.password.length >= 8;
      
      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
        onShowToast("Password must have: 8+ characters, uppercase, lowercase, and number", 'error');
        return;
      }
      if (!accountData.email || !accountData.firstName || !accountData.lastName || !accountData.zipCode || !accountData.phone) {
        onShowToast("Please fill in all fields", 'error');
        return;
      }
      // Basic phone validation - ensure 10 digits
      const phoneDigits = accountData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        onShowToast("Please enter a valid 10-digit phone number", 'error');
        return;
      }
    }

    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Validate required fields before submission
      if (!accountData.email || !accountData.password || !accountData.firstName || !accountData.lastName) {
        throw new Error("Please fill in all required fields");
      }

      // Ensure phone is formatted properly
      const phoneDigits = accountData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        throw new Error("Please enter a valid 10-digit phone number");
      }

      await authService.signup(
        accountData.email,
        accountData.password,
        `${accountData.firstName} ${accountData.lastName}`,
        'client',
        {
          zipCode: accountData.zipCode,
          phone: accountData.phone,
          needs: careNeeds,
          schedule: schedule,
          genderPreference: genderPref,
          latitude: accountData.latitude || null,
          longitude: accountData.longitude || null,
          caraConnected: connectWithCara,
          messagingPreference: connectWithCara ? messagingPreference : null,
          telegramUsername: connectWithCara && messagingPreference === 'telegram' ? telegramUsername : null
        }
      );

      onShowToast("Account created! Finding your best matches...", 'success');

      // If connected with Cara, trigger welcome message
      if (connectWithCara) {
        await connectCaraAgent({
          name: `${accountData.firstName} ${accountData.lastName}`,
          phone: accountData.phone,
          telegramUsername,
          messagingPreference,
          zipCode: accountData.zipCode,
          needs: careNeeds,
          schedule: schedule
        });
      }

      onNavigate('client');
    } catch (error: any) {
      console.error('Signup error:', error);
      let msg = error?.message || "Failed to create account. Please try again.";

      // Handle specific Firebase errors
      if (msg.includes('already exists') || msg.includes('email-already-in-use')) {
        msg = "An account with this email already exists. Try logging in or reset your password.";
      } else if (msg.includes('auth/invalid-email')) {
        msg = "Please enter a valid email address.";
      } else if (msg.includes('auth/weak-password')) {
        msg = "Password is too weak. Please use at least 8 characters with uppercase, lowercase, and numbers.";
      } else if (msg.includes('auth/network-request-failed')) {
        msg = "Network error. Please check your internet connection and try again.";
      } else if (msg.includes('auth/configuration-not-found') || msg.includes('not configured')) {
        msg = "Service temporarily unavailable. Please try again in a few minutes.";
      }
      
      onShowToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-slide-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-teal-600 p-3 rounded-xl">
            <Activity className="text-white w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
          Find care with confidence
        </h2>

        {/* Progress Bar */}
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-2 w-12 rounded-full transition-colors ${step >= s ? 'bg-teal-600' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100 relative">

          <form className="space-y-4" onSubmit={handleNext}>

            {/* STEP 1: ACCOUNT */}
            {step === 1 && (
              <div className="animate-slide-in">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Create your account</h3>
                <p className="text-base text-slate-600 mb-6">We'll use this information to find the best caregivers near you.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input name="firstName" label="First Name" placeholder="Jane" required value={accountData.firstName} onChange={handleAccountChange} />
                  <Input name="lastName" label="Last Name" placeholder="Doe" required value={accountData.lastName} onChange={handleAccountChange} />
                </div>

                <Input
                  name="email"
                  label="Email Address"
                  type="email"
                  placeholder="jane@example.com"
                  required
                  value={accountData.email}
                  onChange={handleAccountChange}
                  error={fieldErrors.email}
                />

                <div className="relative">
                  <Input
                    name="phone"
                    label="Phone Number"
                    type="tel"
                    placeholder="(555) 123-4567"
                    required
                    value={accountData.phone}
                    onChange={handleAccountChange}
                    error={fieldErrors.phone}
                  />
                  <p className="text-sm text-slate-500 mt-1">We'll send appointment reminders to this number</p>
                </div>

                <div className="relative">
                  <Input
                    name="password"
                    label="Create Password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={accountData.password}
                    onChange={handleAccountChange}
                    error={fieldErrors.password}
                  />

                  {/* Password Requirements */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">Password must have:</p>
                    <ul className="space-y-1">
                      {passwordRequirements.map((req, idx) => (
                        <li key={idx} className={`text-sm flex items-center gap-2 ${req.met ? 'text-emerald-600' : 'text-slate-500'}`}>
                          <Check className={`w-4 h-4 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                          {req.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Zip Code Input */}
                <Input
                  name="zipCode"
                  label="Zip Code"
                  placeholder="94102"
                  required
                  value={accountData.zipCode}
                  onChange={handleAccountChange}
                />

                {/* Google Maps Location Input (Optional - for full address) */}
                <LocationInput
                  label="Full Address (Optional)"
                  placeholder="Enter full address for better matching"
                  value={accountData.zipCode}
                  onChange={(val) => {
                    if (typeof val === 'object') {
                      setAccountData({
                        ...accountData,
                        zipCode: val.address,
                        latitude: val.lat || 0,
                        longitude: val.lng || 0
                      });
                    } else {
                      setAccountData({ ...accountData, zipCode: val });
                    }
                  }}
                />

              </div>
            )}

            {/* STEP 2: NEEDS */}
            {step === 2 && (
              <div className="animate-slide-in">
                <h3 className="text-lg font-bold text-slate-900 mb-2">What help is needed?</h3>
                <p className="text-sm text-slate-500 mb-4">Select all that apply to help us match skills.</p>
                <div className="grid grid-cols-2 gap-3">
                  {NEEDS_OPTIONS.map(need => (
                    <div
                      key={need}
                      onClick={() => toggleSelection(need, careNeeds, setCareNeeds)}
                      className={`p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${careNeeds.includes(need)
                        ? 'bg-teal-50 border-teal-500 text-teal-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-teal-200'
                        }`}
                    >
                      {need}
                      {careNeeds.includes(need) && <Check size={16} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: PREFERENCES */}
            {step === 3 && (
              <div className="animate-slide-in">
                <h3 className="text-lg font-bold text-slate-900 mb-2">When do you need care?</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {SCHEDULE_OPTIONS.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleSelection(time, schedule, setSchedule)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${schedule.includes(time)
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                        }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">Gender Preference</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['Female', 'Male', 'No Preference'].map(g => (
                    <div
                      key={g}
                      onClick={() => setGenderPref(g)}
                      className={`p-2 text-center rounded-xl border text-sm cursor-pointer ${genderPref === g
                        ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                        }`}
                    >
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: CONNECT WITH CARA */}
            {step === 4 && (
              <div className="animate-slide-in text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Meet Cara, Your AI Care Coordinator</h3>
                <p className="text-slate-600 mb-6">
                  Get care faster with personalized matching via text message.
                  Cara will find caregivers, schedule interviews, and handle everything for you.
                </p>

                {!connectWithCara ? (
                  <div className="space-y-4">
                    <Button
                      fullWidth
                      onClick={() => setConnectWithCara(true)}
                      className="py-4 text-lg"
                    >
                      <span className="mr-2">💬</span> Connect with Cara
                    </Button>
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={handleSubmit}
                    >
                      Skip for now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        How would you like Cara to message you?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'whatsapp', label: 'WhatsApp', icon: '💚', desc: 'Recommended' },
                          { id: 'sms', label: 'SMS/Text', icon: '💬', desc: 'Standard rates' }
                        ].map((option) => (
                          <div
                            key={option.id}
                            onClick={() => setMessagingPreference(option.id as any)}
                            className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                              messagingPreference === option.id
                                ? 'bg-teal-50 border-teal-500 text-teal-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                            }`}
                          >
                            <div className="text-2xl mb-2">{option.icon}</div>
                            <div className="text-sm font-medium">{option.label}</div>
                            <div className="text-xs text-slate-500 mt-1">{option.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {messagingPreference === 'whatsapp' && (
                      <div className="animate-slide-in bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-green-800">
                          <strong>📱 WhatsApp Number:</strong> We'll use your phone number {accountData.phone} for WhatsApp messages.
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          Make sure you have WhatsApp installed on this number.
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900 mb-2">What Cara will do:</p>
                      <ul className="space-y-1">
                        <li>✓ Find caregivers in {accountData.zipCode}</li>
                        <li>✓ Match based on your needs: {careNeeds.slice(0, 2).join(', ')}</li>
                        <li>✓ Schedule video interviews</li>
                        <li>✓ Send reminders and updates</li>
                        <li>✓ Available 24/7 for questions</li>
                      </ul>
                    </div>

                    <Button
                      fullWidth
                      onClick={handleSubmit}
                      className="py-4"
                    >
                      Complete Signup & Connect Cara
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex gap-3">
              {step > 1 && (
                <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {step < 4 && (
                <Button fullWidth type="submit" disabled={isLoading}>
                  {isLoading ? "Creating Profile..." : step === 3 ? "Next: Meet Cara" : "Next Step"}
                  {!isLoading && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              )}
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