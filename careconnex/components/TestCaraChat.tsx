import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';
import { Button } from './ui/Button';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface TestCaraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simple agent responses for testing
const getAgentResponse = (userMessage: string, step: number): string => {
  const text = userMessage.toLowerCase();
  
  if (step === 0) {
    return "👋 Hi! I'm Cara, your CareConnex care coordinator. I'll help you find the perfect caregiver.\n\nWhat type of care do you need?";
  }
  
  if (text.includes('mom') || text.includes('mother')) {
    return "Got it - care for your mom. What type of care does she need?\n\n• Companionship\n• Personal care\n• Dementia care\n• Medication management";
  }
  
  if (text.includes('dementia') || text.includes('alzheimer')) {
    return "I understand. Dementia care requires special expertise. I'll find certified caregivers.\n\nWhat days do you need care? (e.g., Mon, Wed, Fri)";
  }
  
  if (text.includes('mon') || text.includes('wed') || text.includes('fri')) {
    return "Perfect! I found 3 excellent caregivers in your area:\n\n1. Maria - $28/hr, 5★, dementia specialist\n2. David - $30/hr, 4.9★, 10 years exp\n3. Jennifer - $26/hr, 5★, RN background\n\nWhich would you like to interview? (Reply 1, 2, or 3)";
  }
  
  if (text.includes('1') || text.includes('2') || text.includes('3')) {
    return "Excellent choice! I'll schedule a video interview.\n\nWhen works best?\n• Tomorrow 2pm\n• Thursday 10am\n• Friday 3pm";
  }
  
  if (text.includes('tomorrow') || text.includes('thursday') || text.includes('friday')) {
    return "✅ Interview scheduled! You'll receive a Zoom link 15 minutes before.\n\nAfter the interview, just let me know if you want to book them.\n\nAnything else I can help with?";
  }
  
  return "Thanks for that! To give you the best matches, could you also tell me:\n\n• Your zip code?\n• Preferred schedule?\n• Budget range?";
};

export const TestCaraChat: React.FC<TestCaraChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStep, setConversationStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        const greeting: Message = {
          id: '1',
          text: getAgentResponse('', 0),
          sender: 'agent',
          timestamp: new Date()
        };
        setMessages([greeting]);
        setConversationStep(1);
      }, 500);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate agent typing delay
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAgentResponse(inputText, conversationStep),
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
      setConversationStep(prev => prev + 1);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Cara</h3>
              <p className="text-xs text-teal-100">AI Care Coordinator</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'user' ? 'bg-teal-600' : 'bg-cyan-600'
              }`}>
                {msg.sender === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-full focus:outline-none focus:border-teal-500 text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            Test mode - Simulating agent responses
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestCaraChat;
