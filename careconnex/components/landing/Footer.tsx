import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { ViewType } from '../../types';
import { LegalDocs } from '../LegalDocs';

interface FooterProps {
    onNavigate: (view: ViewType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

    return (
        <>
            <footer className="bg-white border-t border-slate-100 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <Activity className="text-teal-600 w-6 h-6" />
                                <span className="text-xl font-bold text-slate-900">CareSync AI</span>
                            </div>
                            <p className="text-slate-500 max-w-xs">
                                Modernizing senior care with direct connections, instant payments, and AI-powered matching.
                            </p>
                            <div className="flex gap-4 mt-6">
                                {/* Social Mockups */}
                                <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-teal-100 transition-colors cursor-pointer"></div>
                                <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-teal-100 transition-colors cursor-pointer"></div>
                                <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-teal-100 transition-colors cursor-pointer"></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">For Families</h4>
                            <ul className="space-y-2 text-slate-500 text-sm">
                                <li><button onClick={() => onNavigate('client-signup')} className="hover:text-teal-600">Find Care</button></li>
                                <li><button onClick={() => onNavigate('client-login')} className="hover:text-teal-600">Log In</button></li>
                                <li><button onClick={() => onNavigate('landing')} className="hover:text-teal-600">Pricing</button></li>
                                <li><button onClick={() => onNavigate('landing')} className="hover:text-teal-600">Quality Guarantee</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">For Caregivers</h4>
                            <ul className="space-y-2 text-slate-500 text-sm">
                                <li><button onClick={() => onNavigate('caregiver-signup')} className="hover:text-teal-600">Find Jobs</button></li>
                                <li><button onClick={() => onNavigate('caregiver-login')} className="hover:text-teal-600">Log In</button></li>
                                <li><button onClick={() => onNavigate('insurance')} className="hover:text-teal-600">Insurance</button></li>
                                <li><button onClick={() => onNavigate('admin')} className="hover:text-teal-600">Trust & Safety</button></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 mt-12 pt-8 text-center text-slate-400 text-sm flex flex-col md:flex-row justify-between items-center">
                        <span>&copy; 2024 CareSync AI. All rights reserved.</span>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <button onClick={() => setLegalModal('privacy')} className="cursor-pointer hover:text-slate-600">Privacy Policy</button>
                            <button onClick={() => setLegalModal('terms')} className="cursor-pointer hover:text-slate-600">Terms of Service</button>
                            <button onClick={() => onNavigate('admin')} className="cursor-pointer hover:text-purple-600 transition-colors" title="Admin Panel">Admin</button>
                        </div>
                    </div>
                </div>
            </footer>

            {legalModal && <LegalDocs type={legalModal} onClose={() => setLegalModal(null)} />}
        </>
    );
};
