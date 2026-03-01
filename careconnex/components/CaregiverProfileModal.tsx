import React, { useState } from 'react';
import { X, Star, MapPin, ShieldCheck, Clock, Calendar, CheckCircle, Award, Briefcase, Heart } from 'lucide-react';
import { Caregiver } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { DEFAULT_CAREGIVER_AVATAR } from '../constants';

interface CaregiverProfileModalProps {
    caregiver: Caregiver;
    onClose: () => void;
    onBookNow: () => void;
}

export const CaregiverProfileModal: React.FC<CaregiverProfileModalProps> = ({
    caregiver,
    onClose,
    onBookNow
}) => {
    // Debug logging
    console.log('🧩 [CaregiverProfileModal] Rendering with caregiver:', caregiver?.id, caregiver?.name);
    
    // Safety check - if no caregiver data, show error
    if (!caregiver) {
        console.error('❌ [CaregiverProfileModal] No caregiver data provided');
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md">
                    <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Profile</h3>
                    <p className="text-slate-600 mb-4">Could not load caregiver profile. Please try again.</p>
                    <Button onClick={onClose} variant="primary" className="w-full">Close</Button>
                </div>
            </div>
        );
    }

    // Safe property access helpers
    const safeImageUrl = caregiver.imageUrl || caregiver.photo || DEFAULT_CAREGIVER_AVATAR;
    const safeName = caregiver.name || 'Unknown Caregiver';
    const safeHourlyRate = typeof caregiver.hourlyRate === 'number' ? caregiver.hourlyRate : 0;
    const safeRating = typeof caregiver.rating === 'number' ? caregiver.rating : 0;
    const safeReviewCount = typeof caregiver.reviewCount === 'number' ? caregiver.reviewCount : 0;
    const safeExperience = typeof caregiver.experience === 'number' ? caregiver.experience : 0;
    const safeDistance = typeof caregiver.distance === 'number' ? caregiver.distance : null;
    const safeLocation = caregiver.location || 'Santa Clara County';
    const safeSkills = Array.isArray(caregiver.skills) ? caregiver.skills : [];
    const safeCertifications = Array.isArray(caregiver.certifications) ? caregiver.certifications : [];
    const safeAvailability = Array.isArray(caregiver.availability) ? caregiver.availability : [];
    const safeBio = caregiver.bio || `${safeName} is a dedicated caregiver serving the ${safeLocation} area.`;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-slide-in">

                {/* Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-teal-500 to-blue-600">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white bg-black/20 hover:bg-black/30 rounded-full p-2 transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    {/* Profile Image */}
                    <div className="absolute -bottom-16 left-6">
                        <div className="relative">
                            <img
                                src={safeImageUrl}
                                alt={safeName}
                                className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_CAREGIVER_AVATAR; }}
                            />
                            {caregiver.verified && (
                                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2 border-4 border-white">
                                    <ShieldCheck className="w-5 h-5 text-white" fill="currentColor" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(100vh-12rem)] sm:max-h-[calc(90vh-12rem)] pb-24">
                    <div className="pt-20 px-6 pb-6">

                        {/* Name and Rating */}
                        <div className="mb-6">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                        {safeName}
                                    </h2>
                                    <div className="flex items-center text-slate-500 text-sm mt-1">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {safeLocation} {safeDistance !== null && `• ${safeDistance.toFixed(1)} mi away`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-teal-600">
                                        ${safeHourlyRate}
                                        <span className="text-sm text-slate-500">/hr</span>
                                    </div>
                                </div>
                            </div>

                            {/* Rating and Stats */}
                            <div className="flex items-center gap-4 flex-wrap">
                                {safeRating > 0 && (
                                    <div className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg">
                                        <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                                        <span className="font-bold text-slate-900">{safeRating.toFixed(1)}</span>
                                        {safeReviewCount > 0 && (
                                            <span className="text-xs text-slate-500">({safeReviewCount} reviews)</span>
                                        )}
                                    </div>
                                )}

                                {caregiver.verified && (
                                    <Badge variant="success" className="flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        Background Verified
                                    </Badge>
                                )}

                                {safeExperience > 0 && (
                                    <div className="flex items-center gap-1 text-sm text-slate-600">
                                        <Briefcase className="w-4 h-4" />
                                        {safeExperience} years exp.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {safeBio && (
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-teal-600" />
                                    About
                                </h3>
                                <p className="text-slate-600 leading-relaxed">{safeBio}</p>
                            </div>
                        )}

                        {/* Skills */}
                        {safeSkills.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-teal-600" />
                                    Skills & Services
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {safeSkills.map((skill, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium border border-teal-100"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Certifications */}
                        {safeCertifications.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-teal-600" />
                                    Certifications
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {safeCertifications.map((cert, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                                        >
                                            <Award className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700">{cert}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {caregiver.hasTransportation !== undefined && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="text-xs text-slate-500 mb-1">Transportation</div>
                                    <div className="font-bold text-slate-900">
                                        {caregiver.hasTransportation ? '✓ Has Vehicle' : '✗ No Vehicle'}
                                    </div>
                                </div>
                            )}

                            {caregiver.acceptsMicroVisits !== undefined && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="text-xs text-slate-500 mb-1">Micro-Visits</div>
                                    <div className="font-bold text-slate-900">
                                        {caregiver.acceptsMicroVisits ? '✓ Available' : '✗ Not Available'}
                                    </div>
                                </div>
                            )}

                            {caregiver.completedJobs !== undefined && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="text-xs text-slate-500 mb-1">Completed Jobs</div>
                                    <div className="font-bold text-slate-900">{caregiver.completedJobs}</div>
                                </div>
                            )}

                            {caregiver.reliabilityScore !== undefined && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="text-xs text-slate-500 mb-1">Reliability Score</div>
                                    <div className="font-bold text-slate-900">{caregiver.reliabilityScore}%</div>
                                </div>
                            )}
                        </div>

                        {/* Availability */}
                        {safeAvailability.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-teal-600" />
                                    Availability
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {safeAvailability.map((slot, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100"
                                        >
                                            {slot}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Match Reasoning (if available) */}
                        {caregiver.matchReasoning && (
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100 mb-6">
                                <h3 className="text-sm font-bold text-purple-900 mb-2">Why This Match?</h3>
                                <p className="text-sm text-purple-800">{caregiver.matchReasoning}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Bottom Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Close
                        </Button>
                        <Button
                            variant="primary"
                            onClick={onBookNow}
                            className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-lg"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Book Appointment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
