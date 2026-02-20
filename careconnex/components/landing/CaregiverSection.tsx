import React from 'react';
import { Users, CheckCircle, Clock, Star } from 'lucide-react';
import { ViewType } from '../../types';
import { Button } from '../ui/Button';

interface CaregiverSectionProps {
    onNavigate: (view: ViewType) => void;
}

export const CaregiverSection: React.FC<CaregiverSectionProps> = ({ onNavigate }) => {
    return (
        <section className="py-20 bg-slate-900 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
                <Users size={400} className="text-white transform translate-x-1/2 -translate-y-1/4" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <span className="text-orange-500 font-bold tracking-wider uppercase text-sm mb-2 block">For Caregivers</span>
                        <h2 className="text-4xl font-bold text-white mb-6">Earn what you deserve.</h2>
                        <p className="text-slate-300 text-lg mb-8">
                            Join the network where caregivers keep 100% of their hourly rate and get paid instantly.
                        </p>
                        <ul className="space-y-4 mb-8">
                            {[
                                "Set your own rates and schedule",
                                "Instant daily payouts via Stripe",
                                "Build your reputation with verified reviews",
                                "Access to premium job board"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center text-slate-300">
                                    <CheckCircle className="w-6 h-6 text-orange-500 mr-3 flex-shrink-0" />
                                    <span className="text-lg">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Button
                            variant="accent"
                            size="lg"
                            onClick={() => onNavigate('caregiver-signup')}
                            className="shadow-lg shadow-orange-900/50"
                        >
                            Become a Caregiver
                        </Button>
                    </div>
                    <div className="relative hidden md:block">
                        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-sm mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-300">
                            <div className="flex items-center mb-6">
                                <img src="https://ui-avatars.com/api/?name=Sarah+Jenkins&background=F97316&color=fff&size=128" alt="Sarah Jenkins - Professional caregiver profile" className="w-16 h-16 rounded-full border-2 border-orange-500" />
                                <div className="ml-4">
                                    <h4 className="text-white font-bold text-lg">Sarah Jenkins</h4>
                                    <div className="flex items-center text-orange-400 text-sm">
                                        <Star className="w-4 h-4 fill-current mr-1" />
                                        5.0 (24 reviews)
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-slate-700/50 p-3 rounded-xl flex justify-between items-center">
                                    <div className="flex items-center text-slate-300">
                                        <Clock className="w-4 h-4 mr-2" /> Monday
                                    </div>
                                    <span className="text-green-400 font-bold">+$180.00</span>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded-xl flex justify-between items-center">
                                    <div className="flex items-center text-slate-300">
                                        <Clock className="w-4 h-4 mr-2" /> Tuesday
                                    </div>
                                    <span className="text-green-400 font-bold">+$220.00</span>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded-xl flex justify-between items-center">
                                    <div className="flex items-center text-slate-300">
                                        <Clock className="w-4 h-4 mr-2" /> Wednesday
                                    </div>
                                    <span className="text-green-400 font-bold">+$160.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
