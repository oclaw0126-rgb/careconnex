import React, { useState } from 'react';
import { 
  ShieldCheck, MapPin, CheckCircle, MessageCircle, AlertCircle, Phone,
  ArrowRight, Star, Clock, Users, DollarSign, TrendingUp, Heart
} from 'lucide-react';
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
        const value = e.target.value.replace(/\D/g, '').slice(0, 5);
        setZipCode(value);
        if (error) setError('');
    };

    const caraWhatsAppNumber = '+15595204349';

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/5 rounded-full blur-3xl"></div>
            </div>

<<<<<<< HEAD
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
=======
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="min-h-[90vh] flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-20">
                    
                    {/* Left Content */}
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                            <MapPin className="w-4 h-4 text-teal-400" />
                            <span className="text-sm font-medium">Now Serving Santa Clara County</span>
                        </div>

                        {/* Headline */}
                        <div className="space-y-4">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]">
                                Find Trusted Senior Care in{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400">
                                    Santa Clara County
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                Connect with verified, local caregivers in San Jose, Palo Alto & Mountain View. 
                                $22-35/hr. No agency markups. Background-checked & insured.
                            </p>
                        </div>

                        {/* Pricing clarity */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-6 md:gap-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-teal-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-2xl font-bold">$22-35/hr</p>
                                    <p className="text-sm text-slate-400">caregiver rate</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-2xl font-bold">24-48hrs</p>
                                    <p className="text-sm text-slate-400">to match</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-green-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-2xl font-bold">Save 27%</p>
                                    <p className="text-sm text-slate-400">vs agencies</p>
                                </div>
>>>>>>> ff94ff7 (Sync CareConnex updates - 2026-03-01)
                            </div>
                        </div>

                        {/* Trust Pills - Objection Handling */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                            {[
                                { icon: <CheckCircle className="w-4 h-4" />, text: 'Background Checked' },
                                { icon: <ShieldCheck className="w-4 h-4" />, text: '$5M Insurance Coverage' },
                                { icon: <TrendingUp className="w-4 h-4" />, text: 'No Hidden Fees' },
                                { icon: <Clock className="w-4 h-4" />, text: 'Backup Caregivers in 30 min' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm">
                                    <span className="text-teal-400">{item.icon}</span>
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Search Box */}
                        <div className="max-w-xl mx-auto lg:mx-0">
                            <form onSubmit={handleHeroSearch} className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col sm:flex-row gap-2">
                                <div className="flex-grow relative">
                                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={5}
                                        placeholder="Enter your zip code"
                                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 outline-none"
                                        value={zipCode}
                                        onChange={handleZipChange}
                                    />
                                </div>
                                <Button 
                                    size="lg" 
                                    type="submit"
                                    disabled={zipCode.length !== 5}
                                    className="whitespace-nowrap px-8 rounded-xl bg-teal-500 hover:bg-teal-400"
                                >
                                    Find Caregivers
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </form>
                            {error && (
                                <p className="text-red-400 text-sm mt-2 text-left">{error}</p>
                            )}
                        </div>

                        {/* Dual CTA - Primary + Secondary */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <a 
                                href={`https://wa.me/${caraWhatsAppNumber.replace(/\+/g, '')}?text=Hi%20Cara,%20I%20need%20help%20finding%20a%20caregiver`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span>Or text Cara on WhatsApp</span>
                                <ArrowRight className="w-4 h-4" />
                            </a>
                            <span className="text-slate-500 hidden sm:inline">|</span>
                            <button 
                                onClick={() => {
                                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                            >
                                <span>See How It Works</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Objection Handling - Trust Bullets */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <p className="text-sm text-slate-400 mb-4 uppercase tracking-wider font-medium">Common Questions</p>
                            <div className="grid sm:grid-cols-3 gap-4 text-left">
                                <div className="space-y-2">
                                    <p className="font-medium text-white flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-teal-400" />
                                        What if my caregiver cancels?
                                    </p>
                                    <p className="text-sm text-slate-400">Backup caregiver matched in 30 minutes</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-white flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                                        Is this safe?
                                    </p>
                                    <p className="text-sm text-slate-400">$5M insurance + background checks</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-white flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-teal-400" />
                                        How do I pay?
                                    </p>
                                    <p className="text-sm text-slate-400">Direct to caregiver. No markups.</p>
                                </div>
                            </div>
                        </div>

                    </div>

<<<<<<< HEAD
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
=======
                    {/* Right Content - Hero Image */}
                    <div className="flex-1 w-full max-w-lg lg:max-w-none">
                        <div className="relative">
                            {/* Main Hero Image */}
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                                <img 
                                    src="/assets/caregiver-senior-hero.jpg" 
                                    alt="Warm moment between caregiver and senior - compassionate in-home care"
                                    className="w-full h-[500px] lg:h-[600px] object-cover"
                                />
                                {/* Subtle gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent"></div>
                            </div>

                            {/* Verified Badge */}
                            <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-900">Verified Caregivers</p>
                                        <p className="text-xs text-slate-500">Background checked</p>
                                    </div>
>>>>>>> ff94ff7 (Sync CareConnex updates - 2026-03-01)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cities Bar */}
                <div className="py-8 border-t border-white/10">
                    <p className="text-center text-slate-400 text-sm">
                        Serving: <span className="text-slate-300">San Jose</span> • <span className="text-slate-300">Santa Clara</span> • <span className="text-slate-300">Sunnyvale</span> • <span className="text-slate-300">Mountain View</span> • <span className="text-slate-300">Palo Alto</span> • <span className="text-slate-300">Cupertino</span> • <span className="text-slate-300">Los Gatos</span> • <span className="text-slate-300">Campbell</span> • <span className="text-slate-300">Milpitas</span>
                    </p>
                </div>
            </div>
        </section>
    );
};
