import React, { useState } from 'react';
import { Search, Mic, Sparkles, Plus, Loader2 } from 'lucide-react';
import { SlideUp } from '../ui/Motion';
import { aiService } from '../../services/ai';
import { AddToastFunction } from '../../types';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionType {
  new (): {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    start(): void;
  };
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionType;
    webkitSpeechRecognition?: SpeechRecognitionType;
  }
}

interface AiCommandCenterProps {
    onPostJob: () => void;
    onSearch: (query: string) => void;
    onShowToast: AddToastFunction;
}

export const AiCommandCenter: React.FC<AiCommandCenterProps> = ({ onPostJob, onSearch, onShowToast }) => {
    const [isListening, setIsListening] = useState(false);
    const [aiNote, setAiNote] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleMicClick = async () => {
        if (isListening || isProcessing) return;
        setIsListening(true);
        setAiNote(null);

        // Check for browser support with runtime validation
        const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

        if (typeof SpeechRecognition === 'function') {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onresult = async (event: SpeechRecognitionEvent) => {
                // Runtime validation for event structure
                if (!event.results?.[0]?.[0]?.transcript) {
                    console.error('Invalid speech recognition event structure');
                    setIsListening(false);
                    fallbackToText();
                    return;
                }
                
                const transcript = event.results[0][0].transcript;
                setIsListening(false);
                setIsProcessing(true);
                onShowToast("Processing audio...", 'info');

                try {
                    const professionalNote = await aiService.generateShiftNote(transcript);
                    setAiNote(professionalNote);
                    onShowToast("AI Note Generated!", 'success');
                } catch (error) {
                    console.error("AI Note generation failed", error);
                    onShowToast("Failed to generate note", 'error');
                } finally {
                    setIsProcessing(false);
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                setIsListening(false);
                console.error("Speech recognition error", event.error);
                onShowToast("Could not hear audio. Please try text input.", 'error');
                fallbackToText();
            };

            recognition.start();
        } else {
            setIsListening(false);
            fallbackToText();
        }
    };

    const fallbackToText = async () => {
        const text = prompt("Enter your care note (AI will format it):");
        if (text && typeof text === 'string') {
            setIsProcessing(true);
            onShowToast("Processing note...", 'info');
            try {
                const professionalNote = await aiService.generateShiftNote(text);
                setAiNote(professionalNote);
                onShowToast("AI Note Generated!", 'success');
            } catch (e) {
                onShowToast("Failed to generate note", 'error');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <SlideUp>
            <div className="bg-gradient-to-br from-[var(--color-primary-600)] via-[var(--color-primary-500)] to-[var(--color-info-500)] rounded-3xl p-8 md:p-10 text-white shadow-2xl mb-8 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--color-info-400)]/10 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-2">Find Your Perfect Caregiver</h2>
                            <p className="text-[var(--color-primary-50)] text-lg">Simple, fast, and personalized for you</p>
                        </div>
                        <button
                            onClick={onPostJob}
                            className="bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white px-5 py-3 rounded-xl font-bold text-base flex items-center backdrop-blur-sm transition-all hover:scale-105 shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Post a Job
                        </button>
                    </div>

                    {/* Main Search Box - Redesigned */}
                    <div
                        onClick={() => !isProcessing && onSearch('')}
                        className={`bg-white rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all cursor-pointer group mb-6 hover:scale-[1.02] transform ${isProcessing ? 'opacity-70' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-info-500)] p-4 rounded-xl group-hover:scale-110 transition-transform">
                                {isProcessing ? (
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                ) : (
                                    <Search className="h-8 w-8 text-white" />
                                )}
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-1">
                                    {isProcessing ? 'Processing...' : 'Click here to find a caregiver'}
                                </h3>
                                <p className="text-[var(--color-neutral-500)] text-base">
                                    Answer 3 simple questions and we'll find the perfect match
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <div className="bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-info-500)] text-white px-6 py-3 rounded-xl font-bold text-lg group-hover:from-[var(--color-primary-600)] group-hover:to-[var(--color-info-600)] transition-all">
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start →'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <span className="text-[var(--color-primary-50)] font-medium text-sm self-center mr-2">Quick search:</span>
                        {["Find a driver", "Medical help", "Meal prep", "Overnight care"].map(action => (
                            <button
                                key={action}
                                onClick={() => !isProcessing && onSearch(action)}
                                disabled={isProcessing}
                                className="px-5 py-2.5 bg-white/15 hover:bg-white text-white hover:text-[var(--color-primary-600)] rounded-xl text-base font-semibold transition-all border-2 border-white/20 hover:border-white shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {action}
                            </button>
                        ))}
                        <button
                            onClick={handleMicClick}
                            disabled={isListening || isProcessing}
                            className={`flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg border-2 disabled:opacity-50 disabled:cursor-not-allowed ${isListening ? 'bg-[var(--color-accent-500)] border-[var(--color-accent-400)] text-white animate-pulse' : 'bg-white/15 hover:bg-white border-white/20 hover:border-white text-white hover:text-[var(--color-primary-600)]'}`}
                        >
                            <Mic className={`w-5 h-5 mr-2 ${isListening ? 'animate-bounce' : ''}`} />
                            {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Voice Note'}
                        </button>
                    </div>

                    {/* AI Note Display */}
                    {aiNote && (
                        <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <h4 className="font-semibold text-white mb-2 flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" /> AI Generated Note
                            </h4>
                            <p className="text-white/90 text-sm">{aiNote}</p>
                        </div>
                    )}
                </div>
            </div>
        </SlideUp>
    );
};
