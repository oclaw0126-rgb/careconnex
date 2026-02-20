import React from 'react';
import { ShieldCheck, DollarSign, Calendar, Activity, CheckCircle } from 'lucide-react';
import { ViewType } from '../../types';
import { Button } from '../ui/Button';

interface FeaturesSectionProps {
    onNavigate: (view: ViewType) => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onNavigate }) => {
    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-1/2 left-[-10%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>
            <div className="absolute bottom-0 right-[-5%] w-[600px] h-[600px] bg-teal-100/40 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div className="order-2 md:order-1">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-teal-100/50 border border-white/60 hover:-translate-y-1 transition-all duration-300 group">
                                <div className="bg-teal-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="w-7 h-7 text-teal-600" />
                                </div>
                                <h4 className="font-bold text-lg mb-2 text-slate-800">Safety First</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Comprehensive background checks and identity verification for every caregiver.</p>
                            </div>
                            <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-orange-100/50 border border-white/60 mt-8 hover:-translate-y-1 transition-all duration-300 group">
                                <div className="bg-orange-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <DollarSign className="w-7 h-7 text-orange-500" />
                                </div>
                                <h4 className="font-bold text-lg mb-2 text-slate-800">Affordable</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Direct hiring means you save 30-50% compared to traditional agencies.</p>
                            </div>
                            <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-blue-100/50 border border-white/60 hover:-translate-y-1 transition-all duration-300 group">
                                <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Calendar className="w-7 h-7 text-blue-500" />
                                </div>
                                <h4 className="font-bold text-lg mb-2 text-slate-800">Flexible</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Book for 2 hours or 24/7. No long-term contracts required.</p>
                            </div>
                            <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-purple-100/50 border border-white/60 mt-8 hover:-translate-y-1 transition-all duration-300 group">
                                <div className="bg-purple-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Activity className="w-7 h-7 text-purple-500" />
                                </div>
                                <h4 className="font-bold text-lg mb-2 text-slate-800">Smart Match</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">Our AI finds caregivers who match your personality and specific medical needs.</p>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 md:order-2">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold mb-4 border border-teal-100">
                            Why Choose Us
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                            Better care starts with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">better connections.</span>
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed font-light">
                            Traditional agencies are expensive and opaque. Classified ads are risky. CareConnex combines the safety of an agency with the affordability and choice of a marketplace.
                        </p>
                        <ul className="space-y-5 mb-10">
                            {[
                                "Liability insurance up to $5M included",
                                "GPS time tracking for accountability",
                                "Automated tax forms (1099)",
                                "Dedicated care advisor support"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center text-slate-700">
                                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center mr-3 flex-shrink-0">
                                        <CheckCircle className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Button onClick={() => onNavigate('client-signup')} size="lg" className="rounded-2xl px-8 shadow-teal-500/20">Find Your Match</Button>
                    </div>
                </div>
            </div>
        </section>
    );
};
