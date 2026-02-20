
import React, { useState } from 'react';
import { ShieldCheck, Heart, Briefcase, CheckCircle, ChevronDown, ChevronUp, ArrowRight, Activity, X } from 'lucide-react';
import { ViewType } from '../types';
import { Button } from './ui/Button';
import { SEO } from './SEO';

interface InsuranceProps {
   onNavigate: (view: ViewType) => void;
}

export const Insurance: React.FC<InsuranceProps> = ({ onNavigate }) => {
   const [openFaq, setOpenFaq] = useState<number | null>(null);

   const toggleFaq = (index: number) => {
      setOpenFaq(openFaq === index ? null : index);
   };

   const faqs = [
      {
         q: "Does this cover theft?",
         a: "Yes. Our CareShield Guarantee includes bonding which protects against theft and property damage during the shift."
      },
      {
         q: "Who pays for it?",
         a: "The insurance fee is added as a small usage-based fee ($2.00) to the booking total, typically paid by the Client to ensure peace of mind, though Caregivers can also opt-in for their own profile boost."
      },
      {
         q: "Is this Workers Comp?",
         a: "No. This provides General Professional Liability and Occupational Accident coverage. It protects against lawsuits, property damage, and injury to the caregiver, but it is not a Workers Compensation policy required for employees."
      }
   ];

   return (
      <div className="min-h-screen bg-white font-sans">
         <SEO
            title="CareShield Guarantee | Insured & Bonded Senior Care"
            description="Hire with confidence. CareConnex provides on-demand liability insurance and theft protection for every shift. Bonded caregivers for your peace of mind."
            keywords="bonded caregiver, senior care liability insurance, caregiver theft protection, safe home care, insured caregivers, CareShield Guarantee"
            canonicalUrl="https://careconnex-d4c8b.web.app/insurance"
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
                     <button onClick={() => onNavigate('how-it-works')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">How it Works</button>
                     <button onClick={() => onNavigate('subscription')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Pricing</button>
                     <button onClick={() => onNavigate('insurance')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">Insurance</button>
                  </nav>

                  <div className="flex items-center space-x-4">
                     <Button variant="secondary" size="sm" onClick={() => onNavigate('client-login')}>Sign In</Button>
                     <Button size="sm" onClick={() => onNavigate('client-signup')}>Get Started</Button>
                  </div>
               </div>
            </div>
         </header>

         {/* A. Hero Section */}
         <section className="bg-slate-50 pt-20 pb-24 border-b border-slate-100">
            <div className="max-w-4xl mx-auto px-4 text-center">
               <div className="inline-flex p-4 bg-teal-100 rounded-full mb-6 shadow-sm animate-slide-in">
                  <ShieldCheck className="w-12 h-12 text-teal-600" />
               </div>
               <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight animate-slide-in">
                  Peace of Mind is <br className="hidden md:block" /> Part of the Plan.
               </h1>
               <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed animate-slide-in">
                  We’ve partnered with <span className="font-bold text-slate-800">Bunker</span> to offer industry-leading liability and theft protection for every shift.
               </p>
            </div>
         </section>

         {/* B. Two-Lane Value Prop */}
         <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="grid md:grid-cols-2 gap-8 lg:gap-16">

                  {/* Left Column: Families */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 transform hover:-translate-y-1 transition-transform">
                     <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                        <Heart className="w-7 h-7 text-teal-600" />
                     </div>
                     <h2 className="text-2xl font-bold text-slate-900 mb-2">Protecting Your Home</h2>
                     <p className="text-slate-500 mb-8 font-medium">For Families & Seniors</p>

                     <ul className="space-y-4">
                        {[
                           "General Liability up to $1M (Slip & Fall)",
                           "Theft & Crime Protection (Bonding)",
                           "Professional Malpractice Coverage",
                           "Bodily Injury Protection"
                        ].map((item, i) => (
                           <li key={i} className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-teal-500 mr-3 mt-0.5 flex-shrink-0" />
                              <span className="text-slate-700 font-medium">{item}</span>
                           </li>
                        ))}
                     </ul>
                  </div>

                  {/* Right Column: Caregivers */}
                  <div className="bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-900/20 text-white relative overflow-hidden transform hover:-translate-y-1 transition-transform">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={200} />
                     </div>
                     <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                           <Briefcase className="w-7 h-7 text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Protecting Your Career</h2>
                        <p className="text-slate-400 mb-8 font-medium">For Caregivers</p>

                        <ul className="space-y-4">
                           {[
                              "Get hired 3x faster with the 'Insured' Badge",
                              "No monthly premiums—pay only when you work",
                              "Portable coverage that follows you",
                              "Occupational Accident Insurance (OAI)"
                           ].map((item, i) => (
                              <li key={i} className="flex items-start">
                                 <CheckCircle className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                                 <span className="text-slate-200 font-medium">{item}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>

               </div>
            </div>
         </section>

         {/* C. How It Works */}
         <section className="py-20 bg-slate-50 border-y border-slate-100">
            <div className="max-w-4xl mx-auto px-4 text-center">
               <h2 className="text-3xl font-bold text-slate-900 mb-12">How it works</h2>
               <div className="grid md:grid-cols-3 gap-8">
                  {[
                     { title: "1. Book", desc: "Select 'Add CareShield' at checkout for just $2.00." },
                     { title: "2. Covered", desc: "The policy activates automatically the moment the caregiver clocks in via GPS." },
                     { title: "3. Relax", desc: "You are fully protected against liability and theft until the shift ends." }
                  ].map((step, i) => (
                     <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-teal-50 text-teal-600 font-bold w-8 h-8 rounded-full flex items-center justify-center border border-teal-100">{i + 1}</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3 mt-2">{step.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* D. Trust Indicators */}
         <section className="py-16 bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 text-center">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Insurance Infrastructure Provided By</p>
               <div className="flex justify-center items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                  {/* Mock Bunker Logo */}
                  <div className="flex items-center gap-2 text-2xl font-black text-slate-800">
                     <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-sans">B</div>
                     BUNKER
                  </div>
               </div>
               <p className="text-xs text-slate-400 mt-8 max-w-lg mx-auto">
                  Insurance provided by Bunker Protect, Inc., a licensed insurance broker. Policies are underwritten by A-rated carriers. Terms and exclusions apply.
               </p>
            </div>
         </section>

         {/* E. FAQ */}
         <section className="py-20 bg-slate-50 pb-32">
            <div className="max-w-3xl mx-auto px-4">
               <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Common Questions</h2>
               <div className="space-y-4">
                  {faqs.map((faq, i) => (
                     <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button
                           onClick={() => toggleFaq(i)}
                           className="w-full flex justify-between items-center p-5 text-left font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                           {faq.q}
                           {openFaq === i ? <ChevronUp className="w-5 h-5 text-teal-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>
                        {openFaq === i && (
                           <div className="px-5 pb-5 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-50 mt-2">
                              <div className="pt-4">{faq.a}</div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Sticky CTA */}
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
               <div className="hidden md:block">
                  <p className="font-bold text-slate-900">Ready to hire safely?</p>
                  <p className="text-xs text-slate-500">Get matched with bonded caregivers today.</p>
               </div>
               <Button
                  onClick={() => onNavigate('client-signup')}
                  size="lg"
                  className="w-full md:w-auto shadow-xl shadow-teal-200"
               >
                  Find an Insured Caregiver Now <ArrowRight className="w-5 h-5 ml-2" />
               </Button>
            </div>
         </div>
      </div>
   );
};
