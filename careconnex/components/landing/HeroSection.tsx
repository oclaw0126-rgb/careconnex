import React, { useState } from 'react';
import { ShieldCheck, MapPin, CheckCircle, MessageCircle, AlertCircle, Phone } from 'lucide-react';
import { ViewType } from '../../types';
import { Button } from '../ui/Button';
import { validateZipCode } from '../../utils/validation';

interface HeroSectionProps {
    onNavigate: (view: ViewType) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
    const [zipCode, setZipCode] = useState('');
    const [error, setError] = useState('');

    const handleHeroSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const validation = validateZipCode(zipCode);
        if (!validation.valid) {
            setError(validation.error || 'Please enter a valid zip code');
            return;
        }
        
        onNavigate('client-signup');
    };

    const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 5); // Only allow 5 digits
        setZipCode(value);
        if (error) setError('');
    };

    // WhatsApp number for Cara
    const caraWhatsAppNumber = '+15595204349';

    return (
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-24 lg:pb-32 bg-slate-50">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Text Content */}
                    <div className="space-y-8 animate-slide-in relative z-10">
                        {/* Location Badge */}
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold shadow-sm mb-2">
                            <MapPin className="w-4 h-4 mr-2 text-teal-600" /> Now Serving Santa Clara County
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                            Care that feels like <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-500">family.</span>
                        </h1>

                        <p className="text-xl text-slate-600 max-w-lg leading-relaxed font-light">
                            Find verified, local caregivers for your loved ones in minutes. <span className="font-semibold text-slate-800">Background checked. Interviewed. Insured by Bunker.</span>
                        </p>

                        {/* Pricing Upfront */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm inline-flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">$22-35/hour</p>
                                    <p className="text-sm text-slate-500">No agency markup</p>
                                </div>
                            </div>
                            <div className="hidden sm:block w-px h-10 bg-slate-200"></div>
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">Insurance Included</p>
                                    <p className="text-sm text-slate-500">Powered by Bunker</p>
                                </div>
                            </div>
                        </div>

                        {/* CARA - Featured Prominently */}
                        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-3xl shadow-xl shadow-teal-500/20 text-white">
                            <div className="flex items-start gap-4">
                                <div className="bg-white/20 p-3 rounded-2xl">
                                    <MessageCircle className="w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-1">Meet Cara, Your AI Care Coordinator</h3>
                                    <p className="text-teal-100 text-sm mb-4">
                                        Text Cara on WhatsApp and she'll find the perfect caregiver for your needs. Available 24/7.
                                    </p>
                                    <a 
                                        href={`https://wa.me/${caraWhatsAppNumber.replace(/\+/g, '')}?text=Hi%20Cara,%20I%20need%20help%20finding%20a%20caregiver`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-white text-teal-700 px-6 py-3 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Text Cara on WhatsApp
                                    </a>
                                    <p className="text-teal-200 text-xs mt-2">{caraWhatsAppNumber}</p>
                                </div>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 flex flex-col sm:flex-row gap-2 max-w-xl transition-all hover:shadow-teal-500/5 hover:scale-[1.01]">
                            <div className="flex-grow relative">
                                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={5}
                                    placeholder="Enter Zip Code (e.g., 95050)"
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-teal-50/50 focus:bg-white focus:ring-4 ${error ? 'focus:ring-red-100 border-2 border-red-300' : 'focus:ring-teal-100'} outline-none text-slate-700 font-medium placeholder:text-slate-400 transition-all placeholder:font-normal`}
                                    value={zipCode}
                                    onChange={handleZipChange}
                                    aria-invalid={!!error}
                                    aria-describedby={error ? 'zip-error' : undefined}
                                />
                            </div>
                            <Button 
                                size="lg" 
                                onClick={handleHeroSearch} 
                                disabled={zipCode.length !== 5}
                                className="whitespace-nowrap px-8 rounded-2xl"
                            >
                                Find Caregivers
                            </Button>
                        </div>
                        {error && (
                            <div id="zip-error" className="flex items-center gap-2 text-red-600 text-sm font-medium -mt-4 ml-1">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Trust Indicators */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 pl-2 font-medium">
                            <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1.5 text-teal-500" /> Free to post</span>
                            <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1.5 text-teal-500" /> No hidden fees</span>
                            <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1.5 text-teal-500" /> Background checked</span>
                        </div>

                        {/* Service Area */}
                        <div className="pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500">
                                <span className="font-semibold text-slate-700">Service Areas:</span> San Jose, Santa Clara, Sunnyvale, Mountain View, Palo Alto, Cupertino, Los Gatos, Campbell, Milpitas & surrounding areas
                            </p>
                        </div>

                        {/* Secondary CTA for Caregivers */}
                        <div className="text-sm text-slate-500">
                            Are you a caregiver?{' '}
                            <button 
                                onClick={() => onNavigate('caregiver-signup')}
                                className="text-teal-600 font-semibold hover:underline"
                            >
                                Find paid care jobs →
                            </button>
                        </div>
                    </div>

                    {/* Hero Image - Desktop */}
                    <div className="relative lg:h-[650px] w-full hidden lg:block">
                        <div className="absolute top-10 right-10 w-4/5 h-4/5 bg-gradient-to-br from-teal-50 to-blue-50 rounded-[3rem] transform rotate-3 z-0 border border-slate-100/50"></div>
                        <img
                            src="/assets/hero-image.jpg"
                            alt="Caregiver comforting senior on couch"
                            className="absolute top-0 right-0 w-4/5 h-4/5 object-cover rounded-[3rem] shadow-2xl shadow-teal-900/10 z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-700 ease-out"
                        />

                        {/* Floating Trust Card - Verified */}
                        <div className="absolute top-1/2 left-0 z-20 bg-white/90 backdrop-blur-lg p-5 rounded-3xl shadow-xl shadow-slate-300/40 border border-white/50 flex items-center gap-4 animate-bounce duration-[3000ms]">
                            <div className="bg-green-100 p-3.5 rounded-full ring-4 ring-green-50">
                                <ShieldCheck className="w-7 h-7 text-green-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-lg">100% Verified</p>
                                <p className="text-sm text-slate-500">bg-check & interviewed</p>
                            </div>
                        </div>

                        {/* Floating Trust Card - Insurance */}
                        <div className="absolute bottom-32 right-10 z-20 bg-white/90 backdrop-blur-lg p-5 rounded-3xl shadow-xl shadow-slate-300/40 border border-white/50 flex items-center gap-4">
                            <div className="bg-blue-100 p-3.5 rounded-full ring-4 ring-blue-50">
                                <CheckCircle className="w-7 h-7 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">Insured by Bunker</p>
                                <p className="text-sm text-slate-500">Coverage included</p>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Hero Image */}
                    <div className="lg:hidden mt-8">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                            <img
                                src="/assets/hero-image.jpg"
                                alt="Caregiver comforting senior"
                                className="w-full h-64 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-center gap-2 text-white text-sm">
                                    <ShieldCheck className="w-5 h-5 text-green-400" />
                                    <span>Verified & Insured Caregivers</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
