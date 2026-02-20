import React from 'react';
import { X, Users, Heart, ChevronRight } from 'lucide-react';
import { ViewType } from '../../types';

interface LoginModalProps {
    onNavigate: (view: ViewType) => void;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onNavigate, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-slide-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24} /></button>
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
    );
};
