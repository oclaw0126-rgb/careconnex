import React from 'react';
import { Search, MessageSquare, Heart, ArrowRight } from 'lucide-react';
import { ViewType } from '../../types';

interface HowItWorksSectionProps {
    onNavigate: (view: ViewType) => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onNavigate }) => {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">How CareConnex works</h2>
                    <p className="text-lg text-slate-600">We make finding the right care simple, safe, and stress-free.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 -z-10"></div>

                    {/* Step 1 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
                            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
                                <Search className="w-8 h-8" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">1. Search & Filter</h3>
                        <p className="text-slate-500 max-w-xs">
                            Browse profiles by zip code, specific needs (like Dementia), and personality match.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">2. Chat & Interview</h3>
                        <p className="text-slate-500 max-w-xs">
                            Message candidates directly through our secure platform to discuss needs and schedule.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm z-10">
                            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                                <Heart className="w-8 h-8" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">3. Hire & Pay</h3>
                        <p className="text-slate-500 max-w-xs">
                            Book securely. We handle the payments, taxes, and insurance automatically.
                        </p>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <button
                        onClick={() => onNavigate('how-it-works')}
                        className="text-teal-600 font-bold hover:underline flex items-center justify-center mx-auto"
                    >
                        See full details <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
        </section>
    );
};
