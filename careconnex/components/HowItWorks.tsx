
import React, { useState } from 'react';
import { ViewType } from '../types';
import { ArrowLeft, Search, MessageSquare, Heart, ShieldCheck, DollarSign, Calendar, Activity, X, Users, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { SEO } from './SEO';
import { LegalDocs } from './LegalDocs';

interface HowItWorksProps {
   onNavigate: (view: ViewType) => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onNavigate }) => {
   const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
   const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

   return (
      <div className="min-h-screen bg-white">
         <SEO
            title="How CareConnex Works - Find Caregivers in 3 Easy Steps"
            description="Learn how CareConnex connects families with verified caregivers. Search, message, and hire trusted in-home care professionals."
            keywords="how it works, find caregivers, hire caregivers, senior care process, caregiver matching"
            canonicalUrl="https://careconnex-d4c8b.web.app/how-it-works"
         />

         {/* Navigation Header */}
         <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex justify-between items-center h-20">
                  <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('landing')}>
                     <div className="bg-teal-600 p-2 rounded-xl shadow-lg shadow-teal-200/50">
                        <Activity className="text-white w-6 h-6" />
                     </div>
                     <span className="text-2xl font-bold text-slate-900 tracking-tight">CareConnex</span>
                  </div>

                  {/* Desktop Nav */}
                  <nav className="hidden md:flex items-center space-x-8">
                     <button onClick={() => onNavigate('client-signup')} className="text-slate-600 hover:text-teal-600 font-medium transition-colors">Find Care</button>
                     <button onClick={() => onNavigate('caregiver-signup')} className="text-slate-600 hover:text-orange-500 font-medium transition-colors">Find Jobs</button>
                     <button onClick={() => onNavigate('how-it-works')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">How it Works</button>
                     <button onClick={() => onNavigate('subscription')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Pricing</button>
                     <button onClick={() => onNavigate('insurance')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Insurance</button>
                  </nav>

                  <div className="flex items-center space-x-4">
                     <button onClick={() => setIsLoginModalOpen(true)} className="text-slate-600 hover:text-teal-600 font-medium">Log In</button>
                     <Button onClick={() => onNavigate('client-signup')}>Get Started</Button>
                  </div>
               </div>
            </div>
         </header>

         <main>
            {/* Hero Section */}
            <section className="py-20 bg-slate-50 border-b border-slate-100">
               <div className="max-w-4xl mx-auto px-4 text-center">
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Care made simple.</h1>
                  <p className="text-xl text-slate-600 leading-relaxed mb-8">
                     Whether you need help or want to help, CareSync streamlines the entire process using AI-driven matching and secure, direct payments.
                  </p>
                  <div className="flex justify-center gap-4">
                     <button
                        onClick={() => document.getElementById('for-families')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-6 py-3 bg-white text-teal-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:border-teal-300 transition-all"
                     >
                        For Families
                     </button>
                     <button
                        onClick={() => document.getElementById('for-caregivers')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-6 py-3 bg-white text-orange-600 font-bold rounded-xl shadow-sm border border-slate-200 hover:border-orange-300 transition-all"
                     >
                        For Caregivers
                     </button>
                  </div>
               </div>
            </section>

            {/* For Families */}
            <section id="for-families" className="py-24">
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col md:flex-row gap-12 items-center mb-16">
                     <div className="md:w-1/2">
                        <span className="text-teal-600 font-bold tracking-wider uppercase text-sm mb-2 block">Families</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Find your perfect match in minutes.</h2>
                        <p className="text-lg text-slate-600">
                           Forget the agencies with high markups and rigid contracts. CareSync puts you in control.
                        </p>
                     </div>
                     <div className="md:w-1/2 flex justify-center">
                        <img
                           src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                           alt="Caregiver walking with senior in kitchen"
                           className="rounded-3xl shadow-xl w-full max-w-md object-cover"
                        />
                     </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                     {[
                        {
                           icon: <Search className="w-8 h-8 text-white" />,
                           color: "bg-teal-500",
                           title: "1. Create Profile & Search",
                           desc: "Tell us about your loved one's needs. Our Smart Match AI instantly recommends verified caregivers nearby who fit your specific medical and personality requirements."
                        },
                        {
                           icon: <MessageSquare className="w-8 h-8 text-white" />,
                           color: "bg-blue-500",
                           title: "2. Chat & Interview",
                           desc: "Message candidates directly. Schedule a video call or a meet-and-greet. You decide who comes into your home."
                        },
                        {
                           icon: <ShieldCheck className="w-8 h-8 text-white" />,
                           color: "bg-green-500",
                           title: "3. Book & Relax",
                           desc: "Secure the booking. We handle the background checks, liability insurance, and time-tracking automatically."
                        }
                     ].map((step, i) => (
                        <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                           <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-200`}>
                              {step.icon}
                           </div>
                           <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                           <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                        </div>
                     ))}
                  </div>

                  <div className="mt-12 text-center">
                     <Button onClick={() => onNavigate('client-signup')} size="lg">Find Care Now</Button>
                  </div>
               </div>
            </section>

            {/* For Caregivers */}
            <section id="for-caregivers" className="py-24 bg-slate-900 text-white">
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col md:flex-row gap-12 items-center mb-16">
                     <div className="md:w-1/2 order-2 md:order-1 flex justify-center">
                        <img
                           src="https://plus.unsplash.com/premium_photo-1661281350976-59b9514e5364?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                           alt="Caregiver helping senior with personal care"
                           className="rounded-3xl shadow-xl shadow-orange-900/20 w-full max-w-md object-cover"
                        />
                     </div>
                     <div className="md:w-1/2 order-1 md:order-2">
                        <span className="text-orange-500 font-bold tracking-wider uppercase text-sm mb-2 block">Caregivers</span>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Earn more. Work on your terms.</h2>
                        <p className="text-lg text-slate-300">
                           Build your own business without the overhead. Keep 100% of your hourly rate (clients pay the platform fee).
                        </p>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                     {[
                        {
                           icon: <ShieldCheck className="w-8 h-8 text-white" />,
                           color: "bg-purple-600",
                           title: "1. Get Verified",
                           desc: "Complete our secure background check and upload your certifications. Verified Pros get 3x more job offers."
                        },
                        {
                           icon: <Calendar className="w-8 h-8 text-white" />,
                           color: "bg-orange-500",
                           title: "2. Accept Jobs",
                           desc: "Browse local gigs that match your skills. Accept the ones that fit your schedule instantly."
                        },
                        {
                           icon: <DollarSign className="w-8 h-8 text-white" />,
                           color: "bg-green-600",
                           title: "3. Instant Pay",
                           desc: "Clock in/out with GPS verification. As soon as the shift ends, funds are transferred to your bank via Stripe."
                        }
                     ].map((step, i) => (
                        <div key={i} className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                           <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6`}>
                              {step.icon}
                           </div>
                           <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                           <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                        </div>
                     ))}
                  </div>

                  <div className="mt-12 text-center">
                     <Button variant="accent" onClick={() => onNavigate('caregiver-signup')} size="lg">Join as Caregiver</Button>
                  </div>
               </div>
            </section>

            {/* Trust & Safety */}
            <section className="py-24 bg-white">
               <div className="max-w-4xl mx-auto px-4 text-center">
                  <div className="inline-flex p-4 bg-teal-50 rounded-full mb-6">
                     <ShieldCheck className="w-8 h-8 text-teal-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Safety is our obsession.</h2>
                  <div className="grid md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                     <ul className="space-y-4">
                        <li className="flex items-start">
                           <Heart className="w-5 h-5 text-teal-500 mr-3 mt-1 flex-shrink-0" />
                           <span className="text-slate-600"><strong>Identity Verification:</strong> Every user is verified via Stripe & Checkr.</span>
                        </li>
                        <li className="flex items-start">
                           <Heart className="w-5 h-5 text-teal-500 mr-3 mt-1 flex-shrink-0" />
                           <span className="text-slate-600"><strong>Liability Insurance:</strong> $5M coverage for every booked shift.</span>
                        </li>
                     </ul>
                     <ul className="space-y-4">
                        <li className="flex items-start">
                           <Heart className="w-5 h-5 text-teal-500 mr-3 mt-1 flex-shrink-0" />
                           <span className="text-slate-600"><strong>Secure Payments:</strong> No cash exchanges. Everything is tracked.</span>
                        </li>
                        <li className="flex items-start">
                           <Heart className="w-5 h-5 text-teal-500 mr-3 mt-1 flex-shrink-0" />
                           <span className="text-slate-600"><strong>GPS Monitoring:</strong> Real-time check-ins ensure caregivers are on site.</span>
                        </li>
                     </ul>
                  </div>
               </div>
            </section>

            <footer className="bg-slate-50 py-12 border-t border-slate-100 text-center">
               <p className="text-slate-500 mb-4">Ready to experience better care?</p>
               <div className="flex justify-center gap-4">
                  <button onClick={() => onNavigate('client-signup')} className="text-teal-600 font-bold hover:underline">Sign up as Family</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => onNavigate('caregiver-signup')} className="text-orange-500 font-bold hover:underline">Sign up as Caregiver</button>
               </div>

               <div className="flex gap-6 justify-center mt-8 text-sm text-slate-400">
                  <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-600">Privacy Policy</button>
                  <button onClick={() => setLegalModal('terms')} className="hover:text-slate-600">Terms of Service</button>
               </div>
            </footer>

            {legalModal && <LegalDocs type={legalModal} onClose={() => setLegalModal(null)} />}

            {isLoginModalOpen && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLoginModalOpen(false)} />
                  <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-slide-in">
                     <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24} /></button>
                     <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Welcome Back</h2>
                     <p className="text-slate-500 text-center mb-8">Please choose your account type</p>

                     <div className="space-y-4">
                        <button
                           onClick={() => onNavigate('client-login')}
                           className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center group"
                        >
                           <div className="bg-teal-100 p-3 rounded-full text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                              <Users className="w-6 h-6" />
                           </div>
                           <div className="ml-4 text-left">
                              <h3 className="font-bold text-slate-900 group-hover:text-teal-700">Family / Client</h3>
                              <p className="text-xs text-slate-500">Find and manage care</p>
                           </div>
                           <ChevronRight className="ml-auto text-slate-300 group-hover:text-teal-500" />
                        </button>

                        <button
                           onClick={() => onNavigate('caregiver-login')}
                           className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center group"
                        >
                           <div className="bg-orange-100 p-3 rounded-full text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                              <Heart className="w-6 h-6" />
                           </div>
                           <div className="ml-4 text-left">
                              <h3 className="font-bold text-slate-900 group-hover:text-orange-700">Caregiver</h3>
                              <p className="text-xs text-slate-500">Manage jobs and payouts</p>
                           </div>
                           <ChevronRight className="ml-auto text-slate-300 group-hover:text-orange-500" />
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </main>
      </div>
   );
};
