import React, { useState } from 'react';
import { Activity, Menu, X } from 'lucide-react';
import { ViewType } from '../types';
import { Button } from './ui/Button';
import { SEO, generateOrganizationSchema, generateServiceSchema } from './SEO';

// Sub-components
import { HeroSection } from './landing/HeroSection';
import { PartnerLogos } from './landing/PartnerLogos';
import { AgencyComparison } from './landing/AgencyComparison';
import { ServiceAreaMap } from './landing/ServiceAreaMap';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { CaregiverSection } from './landing/CaregiverSection';
import { Footer } from './landing/Footer';
import { LoginModal } from './landing/LoginModal';
import { TestimonialsSection } from './landing/TestimonialsSection';
import { FAQSection } from './landing/FAQSection';
import { MobileStickyCTA } from './landing/MobileStickyCTA';

interface LandingViewProps {
   onNavigate: (view: ViewType) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

   return (
      <div className="flex flex-col min-h-screen bg-white font-sans pb-20 md:pb-0">
         <SEO
            title="Find Trusted Senior Caregivers Near You"
            description="CareConnex connects families with verified local caregivers using AI matching. Find in-home care, respite care, and dementia care for your loved ones."
            keywords="senior care, caregiver, elderly care, home health aide, respite care, dementia care, in-home care, find caregivers"
            schema={{
              '@context': 'https://schema.org',
              '@graph': [
                generateOrganizationSchema(),
                generateServiceSchema(),
                {
                  '@context': 'https://schema.org',
                  '@type': 'WebPage',
                  name: 'CareConnex - Senior Care Marketplace',
                  description: 'Connect with verified caregivers instantly. AI-powered matching for senior care.',
                  url: 'https://careconnex-d4c8b.web.app/'
                }
              ]
            }}
         />

         {/* Navigation Bar */}
         <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex justify-between items-center h-20">
                  {/* Logo */}
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
                     <button onClick={() => onNavigate('insurance')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Insurance</button>
                  </nav>

                  {/* Auth Buttons */}
                  <div className="hidden md:flex items-center space-x-4">
                     <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="text-slate-600 hover:text-teal-600 font-medium px-4 py-2"
                     >
                        Log In
                     </button>
                     <Button
                        onClick={() => onNavigate('client-signup')}
                        variant="primary"
                        className="shadow-lg shadow-teal-200"
                     >
                        Get Started
                     </Button>
                  </div>

                  {/* Mobile Menu Button */}
                  <div className="md:hidden">
                     <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2">
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                     </button>
                  </div>
               </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
               <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl animate-slide-in">
                  <div className="px-4 pt-2 pb-6 space-y-2">
                     <button onClick={() => onNavigate('client-signup')} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Find Care</button>
                     <button onClick={() => onNavigate('caregiver-signup')} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Find Jobs</button>
                     <button onClick={() => onNavigate('how-it-works')} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">How it Works</button>
                     <button onClick={() => onNavigate('subscription')} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Pricing</button>
                     <button onClick={() => onNavigate('insurance')} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Insurance</button>
                     <div className="border-t border-slate-100 my-2"></div>
                     <button onClick={() => { setIsMobileMenuOpen(false); setIsLoginModalOpen(true); }} className="block w-full text-left px-3 py-3 text-base font-medium text-teal-600 hover:bg-teal-50 rounded-lg">Log In</button>
                     <Button fullWidth onClick={() => onNavigate('client-signup')}>Sign Up</Button>
                  </div>
               </div>
            )}
         </header>

         <main className="flex-grow">
            <HeroSection onNavigate={onNavigate} />
            <PartnerLogos />
            <AgencyComparison onNavigate={onNavigate} />
            <ServiceAreaMap />
            <HowItWorksSection onNavigate={onNavigate} />
            <FeaturesSection onNavigate={onNavigate} />
            <TestimonialsSection onNavigate={onNavigate} />
            <FAQSection onNavigate={onNavigate} />
            <CaregiverSection onNavigate={onNavigate} />
            <Footer onNavigate={onNavigate} />

            {isLoginModalOpen && (
               <LoginModal onNavigate={onNavigate} onClose={() => setIsLoginModalOpen(false)} />
            )}
         </main>

         {/* Mobile Sticky CTA */}
         <MobileStickyCTA onNavigate={onNavigate} />
      </div>
   );
};
