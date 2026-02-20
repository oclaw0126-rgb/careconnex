import React from 'react';
import { ViewType } from '../../types';
import { Button } from '../ui/Button';

interface MobileStickyCTAProps {
    onNavigate: (view: ViewType) => void;
}

export const MobileStickyCTA: React.FC<MobileStickyCTAProps> = ({ onNavigate }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50 shadow-lg">
            <div className="flex gap-3">
                <Button 
                    variant="secondary"
                    onClick={() => window.location.href = '/book-now'}
                    className="rounded-xl flex-1"
                >
                    ⚡ Quick Book
                </Button>
                <Button 
                    fullWidth 
                    onClick={() => onNavigate('client-signup')}
                    className="rounded-xl flex-[2]"
                >
                    Find Care Now
                </Button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
                Free to post • No commitment • Express booking available
            </p>
        </div>
    );
};
