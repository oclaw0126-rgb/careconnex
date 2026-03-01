import React, { useState } from 'react';
import { X, ChevronRight, Loader2, Star, MapPin, DollarSign, ShieldCheck, Check, Calendar, Clock, Video } from 'lucide-react';
import { Caregiver, Senior } from '../types';
import { matchService } from '../services/matchService';

interface SimpleSearchWizardProps {
    isOpen: boolean;
    onClose: () => void;
    caregivers: Caregiver[];
    onSelectCaregiver: (caregiver: Caregiver) => void;
    onViewProfile?: (caregiver: Caregiver) => void;
    onScheduleInterview?: (caregiver: Caregiver) => void;
    seniorProfile?: Senior;
}

type CareType = 'transportation' | 'meals' | 'medical' | 'companion' | 'overnight' | 'personal';
type TimeFrame = 'today' | 'this-week' | 'ongoing';
type Priority = 'affordable' | 'rated' | 'nearby' | 'verified';

const CARE_TYPES = [
    { id: 'transportation' as CareType, icon: '🚗', label: 'Transportation', description: 'Driving & errands' },
    { id: 'meals' as CareType, icon: '🍳', label: 'Meal Prep', description: 'Cooking & nutrition' },
    { id: 'medical' as CareType, icon: '💊', label: 'Medical Care', description: 'Medication & health' },
    { id: 'companion' as CareType, icon: '🏠', label: 'Companionship', description: 'Social & activities' },
    { id: 'overnight' as CareType, icon: '🌙', label: 'Overnight Care', description: '24/7 support' },
    { id: 'personal' as CareType, icon: '🛁', label: 'Personal Care', description: 'Bathing & grooming' },
];

const TIME_FRAMES = [
    { id: 'today' as TimeFrame, icon: '📅', label: 'Today', description: 'As soon as possible' },
    { id: 'this-week' as TimeFrame, icon: '📆', label: 'This Week', description: 'Within 7 days' },
    { id: 'ongoing' as TimeFrame, icon: '🔄', label: 'Ongoing Care', description: 'Regular schedule' },
];

const PRIORITIES = [
    { id: 'affordable' as Priority, icon: '💰', label: 'Most Affordable', description: 'Best value' },
    { id: 'rated' as Priority, icon: '⭐', label: 'Highest Rated', description: 'Top reviews' },
    { id: 'nearby' as Priority, icon: '📍', label: 'Closest to Me', description: 'Shortest distance' },
    { id: 'verified' as Priority, icon: '✓', label: 'Verified Only', description: 'Background checked' },
];

export const SimpleSearchWizard: React.FC<SimpleSearchWizardProps> = ({
    isOpen,
    onClose,
    caregivers,
    onSelectCaregiver,
    onViewProfile,
    onScheduleInterview,
    seniorProfile
}) => {
    const [step, setStep] = useState(1);
    const [careTypes, setCareTypes] = useState<CareType[]>([]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame | null>(null);
    const [priorities, setPriorities] = useState<Priority[]>([]);
    const [matches, setMatches] = useState<Caregiver[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedDuration, setSelectedDuration] = useState<number>(2);

    const toggleCareType = (type: CareType) => {
        setCareTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const togglePriority = (prio: Priority) => {
        setPriorities(prev =>
            prev.includes(prio)
                ? prev.filter(p => p !== prio)
                : [...prev, prio]
        );
    };

    const handleContinueFromStep1 = () => {
        if (careTypes.length > 0) {
            setStep(2);
        }
    };

    const handleTimeFrameSelect = (time: TimeFrame) => {
        setTimeFrame(time);
        setTimeout(() => setStep(3), 300);
    };

    const handleSearchWithPriorities = async () => {
        if (priorities.length === 0 || !selectedDate || !selectedTime) return;

        setLoading(true);

        try {
            // Parse date and time for availability checking
            const [year, month, day] = selectedDate.split('-').map(Number);
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const requestedDate = new Date(year, month - 1, day);

            // Use new async matchService with real availability checking
            let results = await matchService.scoreCaregivers(
                caregivers,
                seniorProfile || {
                    id: 0,
                    name: 'Client',
                    age: 75,
                    location: 'Springfield, IL',
                    zipCode: '62701',
                    needs: careTypes.map(ct => CARE_TYPES.find(c => c.id === ct)?.label || ''),
                    personality: 'Ambivert'
                },
                [], // No feedback history yet
                {
                    requestedDate,
                    requestedTime: selectedTime,
                    requestedDuration: selectedDuration,
                    isMicroVisit: selectedDuration <= 2
                }
            );

            // Apply verified filter if selected
            if (priorities.includes('verified')) {
                results = results.filter(c => c.verified);
            }

            // Sort by the first priority selected (match score is default)
            const primaryPriority = priorities[0];
            if (primaryPriority === 'affordable') {
                results.sort((a, b) => a.hourlyRate - b.hourlyRate);
            } else if (primaryPriority === 'rated') {
                results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            } else if (primaryPriority === 'nearby') {
                results.sort((a, b) => a.distance - b.distance);
            }
            // 'affordable' and default already sorted by matchScore from API

            setMatches(results.slice(0, 5));
            setStep(4);
        } catch (error) {
            console.error('Search failed:', error);
            // Fallback: show top caregivers without availability filtering
            let fallback = [...caregivers];

            if (priorities.includes('verified')) {
                fallback = fallback.filter(c => c.verified);
            }

            const primaryPriority = priorities[0];
            if (primaryPriority === 'affordable') fallback.sort((a, b) => a.hourlyRate - b.hourlyRate);
            else if (primaryPriority === 'rated') fallback.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            else if (primaryPriority === 'nearby') fallback.sort((a, b) => a.distance - b.distance);

            setMatches(fallback.slice(0, 5));
            setStep(4);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setCareTypes([]);
        setTimeFrame(null);
        setPriorities([]);
        setMatches([]);
        setSelectedDate('');
        setSelectedTime('');
        setSelectedDuration(2);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 rounded-t-3xl flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold">Find a Caregiver</h2>
                        <p className="text-teal-100 text-lg mt-1">Simple • Fast • Easy</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Progress Indicator */}
                {step < 4 && (
                    <div className="px-6 pt-6 pb-4">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                1
                            </div>
                            <div className={`h-1 w-16 ${step >= 2 ? 'bg-teal-600' : 'bg-slate-200'}`}></div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                2
                            </div>
                            <div className={`h-1 w-16 ${step >= 3 ? 'bg-teal-600' : 'bg-slate-200'}`}></div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${step >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                3
                            </div>
                        </div>
                        <p className="text-center text-slate-500 text-lg font-medium">
                            Step {step} of 3
                        </p>
                    </div>
                )}

                {/* Content */}
                <div className="p-8">
                    {/* Step 1: Care Type - MULTIPLE SELECTION */}
                    {step === 1 && (
                        <div className="animate-slide-in">
                            <h3 className="text-3xl font-bold text-slate-900 mb-3 text-center">
                                What do you need help with?
                            </h3>
                            <p className="text-xl text-slate-600 mb-2 text-center">
                                Select all types of care you're looking for
                            </p>
                            <p className="text-base text-teal-600 mb-8 text-center font-semibold">
                                ✓ You can choose multiple options
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {CARE_TYPES.map((type) => {
                                    const isSelected = careTypes.includes(type.id);
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => toggleCareType(type.id)}
                                            className={`p-6 bg-white border-3 rounded-2xl hover:shadow-lg transition-all group relative ${isSelected
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-slate-200 hover:border-teal-300'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 bg-teal-600 text-white rounded-full p-1">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="text-6xl mb-3">{type.icon}</div>
                                            <div className="text-xl font-bold text-slate-900 mb-1">{type.label}</div>
                                            <div className="text-base text-slate-500">{type.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-8 text-center">
                                <button
                                    onClick={handleContinueFromStep1}
                                    disabled={careTypes.length === 0}
                                    className={`px-8 py-4 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-2 mx-auto ${careTypes.length > 0
                                            ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-700 hover:to-blue-700 shadow-lg'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Continue ({careTypes.length} selected)
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Date & Time Selection */}
                    {step === 2 && (
                        <div className="animate-slide-in">
                            <h3 className="text-3xl font-bold text-slate-900 mb-3 text-center">
                                When do you need care?
                            </h3>
                            <p className="text-xl text-slate-600 mb-8 text-center">
                                Select the specific date and time
                            </p>
                            
                            <div className="max-w-xl mx-auto space-y-6">
                                {/* Date Picker */}
                                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                                    <label className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                                        <Calendar className="w-5 h-5 text-teal-600" />
                                        Select Date
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                                    />
                                </div>

                                {/* Time Picker */}
                                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                                    <label className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                                        <Clock className="w-5 h-5 text-teal-600" />
                                        Select Time
                                    </label>
                                    <input
                                        type="time"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                                    />
                                </div>

                                {/* Duration Selection */}
                                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                                    <label className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                                        <Clock className="w-5 h-5 text-teal-600" />
                                        Duration
                                    </label>
                                    <div className="flex gap-3 flex-wrap">
                                        {[1, 2, 3, 4, 6, 8].map((hours) => (
                                            <button
                                                key={hours}
                                                onClick={() => setSelectedDuration(hours)}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                                    selectedDuration === hours
                                                        ? 'bg-teal-600 text-white'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {hours} hour{hours > 1 ? 's' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-4 justify-center">
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-teal-600 hover:text-teal-700 font-medium text-lg"
                                >
                                    ← Go Back
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedDate && selectedTime) {
                                            setStep(3);
                                        }
                                    }}
                                    disabled={!selectedDate || !selectedTime}
                                    className={`px-8 py-4 rounded-xl font-bold text-xl transition-all flex items-center gap-2 ${
                                        selectedDate && selectedTime
                                            ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-700 hover:to-blue-700 shadow-lg'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    Continue
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Priority - MULTIPLE SELECTION */}
                    {step === 3 && !loading && (
                        <div className="animate-slide-in">
                            <h3 className="text-3xl font-bold text-slate-900 mb-3 text-center">
                                What's most important to you?
                            </h3>
                            <p className="text-xl text-slate-600 mb-2 text-center">
                                Select your priorities for matching
                            </p>
                            <p className="text-base text-teal-600 mb-8 text-center font-semibold">
                                ✓ You can choose multiple options
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                                {PRIORITIES.map((prio) => {
                                    const isSelected = priorities.includes(prio.id);
                                    return (
                                        <button
                                            key={prio.id}
                                            onClick={() => togglePriority(prio.id)}
                                            className={`p-8 bg-white border-3 rounded-2xl hover:shadow-lg transition-all relative ${isSelected
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-slate-200 hover:border-teal-300'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 bg-teal-600 text-white rounded-full p-1">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="text-6xl mb-3">{prio.icon}</div>
                                            <div className="text-2xl font-bold text-slate-900 mb-1">{prio.label}</div>
                                            <div className="text-lg text-slate-500">{prio.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-8 flex gap-4 justify-center">
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 text-teal-600 hover:text-teal-700 font-medium text-lg"
                                >
                                    ← Go Back
                                </button>
                                <button
                                    onClick={handleSearchWithPriorities}
                                    disabled={priorities.length === 0}
                                    className={`px-8 py-4 rounded-xl font-bold text-xl transition-all flex items-center gap-2 ${priorities.length > 0
                                            ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-700 hover:to-blue-700 shadow-lg'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    Find Matches ({priorities.length} selected)
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="text-center py-16">
                            <Loader2 className="w-16 h-16 text-teal-600 animate-spin mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Finding the best matches...</h3>
                            <p className="text-lg text-slate-600">This will just take a moment</p>
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {step === 4 && !loading && (
                        <div className="animate-slide-in">
                            <h3 className="text-3xl font-bold text-slate-900 mb-3 text-center">
                                We found {matches.length} great {matches.length === 1 ? 'match' : 'matches'} for you!
                            </h3>
                            <p className="text-xl text-slate-600 mb-8 text-center">
                                Tap "Book Now" to schedule care
                            </p>

                            {matches.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-xl text-slate-600 mb-6">
                                        No caregivers match your exact criteria right now.
                                    </p>
                                    <button
                                        onClick={handleReset}
                                        className="px-8 py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors"
                                    >
                                        Try Different Search
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {matches.map((caregiver) => (
                                        <div
                                            key={caregiver.id}
                                            className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-teal-500 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-start gap-4">
                                                <img
                                                    src={caregiver.imageUrl}
                                                    alt={caregiver.name}
                                                    className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                                                />
                                                <div className="flex-grow">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h4 className="text-2xl font-bold text-slate-900">{caregiver.name}</h4>
                                                            <div className="flex items-center gap-4 mt-1 text-base">
                                                                <span className="flex items-center text-orange-500 font-semibold">
                                                                    <Star className="w-5 h-5 fill-current mr-1" />
                                                                    {caregiver.rating || 'New'}
                                                                </span>
                                                                <span className="flex items-center text-slate-600">
                                                                    <MapPin className="w-5 h-5 mr-1" />
                                                                    {caregiver.distance} mi away
                                                                </span>
                                                                {caregiver.verified && (
                                                                    <span className="flex items-center text-green-600 font-semibold">
                                                                        <ShieldCheck className="w-5 h-5 mr-1" />
                                                                        Verified
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-3xl font-bold text-teal-600">
                                                                ${caregiver.hourlyRate}
                                                            </div>
                                                            <div className="text-base text-slate-500">per hour</div>
                                                        </div>
                                                    </div>

                                                    {caregiver.medicalSkills && caregiver.medicalSkills.length > 0 && (
                                                        <div className="mb-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {caregiver.medicalSkills.slice(0, 4).map((skill, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium"
                                                                    >
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => {
                                                                onSelectCaregiver(caregiver);
                                                                setTimeout(() => onClose(), 100);
                                                            }}
                                                            className="py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl font-bold text-base hover:from-teal-700 hover:to-blue-700 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            Book
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onViewProfile?.(caregiver);
                                                                setTimeout(() => onClose(), 100);
                                                            }}
                                                            className="py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-base hover:bg-slate-200 transition-all"
                                                        >
                                                            Profile
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onScheduleInterview?.(caregiver);
                                                                setTimeout(() => onClose(), 100);
                                                            }}
                                                            className="py-3 bg-purple-100 text-purple-700 rounded-xl font-bold text-base hover:bg-purple-200 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            <Video className="w-4 h-4" />
                                                            Call
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 text-center space-y-3">
                                <button
                                    onClick={handleReset}
                                    className="text-teal-600 hover:text-teal-700 font-bold text-lg"
                                >
                                    Start New Search
                                </button>
                                <div className="text-slate-500 text-lg">
                                    Need help? <a href="tel:1-800-CARE" className="text-teal-600 hover:text-teal-700 font-semibold">Call us at 1-800-CARE</a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
