import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, PieChart, Download, Loader2, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConnectBankButton } from '../ui/ConnectBankButton';
import { Appointment, AddToastFunction, ViewType } from '../../types';
import { InstantPayoutModal } from './InstantPayoutModal';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

interface EarningsPanelProps {
    appointments: Appointment[];
    onShowToast: AddToastFunction;
    onNavigate: (view: ViewType, data?: any) => void;
}

export const EarningsPanel: React.FC<EarningsPanelProps> = ({ appointments, onShowToast, onNavigate }) => {
    const [balance, setBalance] = useState(0.00); // Mock balance for demo
    const [isCashingOut, setIsCashingOut] = useState(false);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [availableBalance, setAvailableBalance] = useState(0);

    const currentYear = new Date().getFullYear();
    const paidAppointments = appointments.filter(a => a.paymentStatus === 'paid' && a.isoDate.startsWith(currentYear.toString()));
    const earningsYTD = paidAppointments.reduce((sum, a) => sum + a.cost, 0);
    const taxThreshold = 600;
    const isEligible1099 = earningsYTD >= taxThreshold;
    const thresholdProgress = Math.min((earningsYTD / taxThreshold) * 100, 100);

    // Calculate available balance from completed but unpaid appointments
    useEffect(() => {
        const unpaidAppointments = appointments.filter(
            a => a.status === 'completed' && a.paymentStatus === 'pending'
        );
        const balance = unpaidAppointments.reduce((sum, a) => sum + a.cost, 0);
        setAvailableBalance(balance);
    }, [appointments]);

    const handleCashOut = () => {
        if (balance <= 0) return;
        setIsCashingOut(true);
        setTimeout(() => {
            setBalance(0);
            setIsCashingOut(false);
            onShowToast("Funds transferred to your bank account successfully!", 'success');
        }, 1500);
    };

    const handleInstantPayout = async () => {
        try {
            const requestInstantPayout = httpsCallable(functions, 'requestInstantPayout');
            const result = await requestInstantPayout({});
            const data = result.data as any;

            if (data.success) {
                onShowToast(`Instant payout of $${data.amount.toFixed(2)} initiated!`, 'success');
                // Refresh appointments to update balance
                setAvailableBalance(0);
            }
        } catch (error: any) {
            console.error('Instant payout error:', error);
            onShowToast(error.message || 'Payout failed. Please try again.', 'error');
            throw error;
        }
    };

    return (
        <div className="animate-slide-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-slate-900 p-2 rounded-xl text-white">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Tax & Compliance</h2>
                    <p className="text-slate-500 text-sm">Track your earnings and documents</p>
                </div>
            </div>

            {/* Earnings Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white mb-8 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 p-4">
                    <TrendingUp size={120} />
                </div>
                <div className="relative z-10">
                    <p className="text-slate-400 font-medium mb-1">Gross Earnings ({currentYear})</p>
                    <h1 className="text-4xl font-bold mb-4">${earningsYTD.toFixed(2)}</h1>

                    {/* Available Balance & Instant Payout */}
                    {availableBalance > 0 && (
                        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-4 mb-4 border border-purple-400/30">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <p className="text-xs text-purple-200 mb-1">Available for Instant Payout</p>
                                    <p className="text-2xl font-bold text-white">${availableBalance.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={() => setShowPayoutModal(true)}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 shadow-lg shadow-purple-500/30 transition-all"
                                >
                                    <Zap className="w-4 h-4" />
                                    <span>Instant Payout</span>
                                </button>
                            </div>
                            <p className="text-xs text-purple-200">
                                💡 Get paid in 30 minutes (1.5% fee) or wait 2-3 days for free
                            </p>
                        </div>
                    )}

                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold flex items-center">
                                <PieChart className="w-4 h-4 mr-2" /> 1099-K Eligibility
                            </span>
                            <span className="text-xs px-2 py-1 bg-white/20 rounded font-bold">
                                {isEligible1099 ? 'ELIGIBLE' : 'NOT YET ELIGIBLE'}
                            </span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${isEligible1099 ? 'bg-green-400' : 'bg-orange-400'}`}
                                style={{ width: `${thresholdProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-300">
                            ${earningsYTD.toFixed(0)} / ${taxThreshold} required for IRS reporting
                        </p>
                    </div>
                </div>
            </div>

            {/* Cash Out Action specific for Earnings view as well? 
           Original dashboard had Balance card in overview. 
           Let's reuse balance card concepts here or just tax docs.
           Original 'Overview' had the balance/cashout. 'Taxes' had earnings.
           I'll keep this strictly to the original 'Taxes' tab content plus ensuring 
           reuse of logic if needed. 
       */}

            {/* Documents List */}
            <div className="space-y-4">
                <h3 className="font-bold text-slate-900 mb-2">Tax Documents</h3>

                {isEligible1099 ? (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Form 1099-K ({currentYear - 1})</h4>
                                <p className="text-xs text-slate-500">Available Jan 31</p>
                            </div>
                        </div>
                        <button className="text-slate-400 hover:text-teal-600 transition-colors">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500">No tax forms generated yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Forms appear once you cross the $600 earnings threshold.</p>
                    </div>
                )}

                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Monthly Statement</h4>
                            <p className="text-xs text-slate-500">Last Month</p>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-teal-600 transition-colors" onClick={() => onShowToast("Downloading Statement...", "info")}>
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Instant Payout Modal */}
            {showPayoutModal && (
                <InstantPayoutModal
                    availableBalance={availableBalance}
                    onClose={() => setShowPayoutModal(false)}
                    onConfirm={handleInstantPayout}
                    onShowToast={onShowToast}
                />
            )}
        </div>
    );
};
