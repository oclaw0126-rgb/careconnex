import React, { useState } from 'react';
import { DollarSign, Clock, AlertCircle, Check } from 'lucide-react';

interface InstantPayoutModalProps {
    availableBalance: number;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const InstantPayoutModal: React.FC<InstantPayoutModalProps> = ({
    availableBalance,
    onClose,
    onConfirm,
    onShowToast
}) => {
    const [processing, setProcessing] = useState(false);

    // Calculate instant payout fee (1.5% or $0.50, whichever is greater)
    const feePercentage = availableBalance * 0.015;
    const fee = Math.max(feePercentage, 0.50);
    const netAmount = availableBalance - fee;

    const handleConfirm = async () => {
        if (availableBalance < 1) {
            onShowToast('Minimum payout amount is $1.00', 'error');
            return;
        }

        setProcessing(true);
        try {
            await onConfirm();
            onShowToast('Instant payout initiated! Funds will arrive in 30 minutes.', 'success');
            onClose();
        } catch (error: any) {
            console.error('Payout error:', error);
            onShowToast(error.message || 'Payout failed. Please try again.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-3 rounded-xl">
                            <DollarSign className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Instant Payout</h2>
                            <p className="text-sm text-gray-500">Get paid in 30 minutes</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Amount Breakdown */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Available Balance</span>
                            <span className="text-2xl font-bold text-gray-900">${availableBalance.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-600">Instant Payout Fee (1.5%)</span>
                                <span className="text-gray-900 font-medium">-${fee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-900 font-semibold">You'll Receive</span>
                                <span className="text-3xl font-bold text-green-600">${netAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-start space-x-3 bg-blue-50 p-3 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-blue-900">Arrives in 30 minutes</p>
                            <p className="text-xs text-blue-700">Funds will be sent to your connected bank account</p>
                        </div>
                    </div>

                    {availableBalance < 1 && (
                        <div className="flex items-start space-x-3 bg-red-50 p-3 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-red-900">Minimum amount not met</p>
                                <p className="text-xs text-red-700">You need at least $1.00 to request an instant payout</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start space-x-3 bg-green-50 p-3 rounded-lg">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-green-900">Secure & Verified</p>
                            <p className="text-xs text-green-700">Powered by Stripe instant payouts</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={processing || availableBalance < 1}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30"
                    >
                        {processing ? (
                            <span className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Processing...
                            </span>
                        ) : (
                            'Confirm Payout'
                        )}
                    </button>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-gray-500 text-center mt-4">
                    Standard payouts (2-3 business days) are always free. Instant payout fees help cover processing costs.
                </p>
            </div>
        </div>
    );
};
