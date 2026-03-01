
import React, { useState, useEffect } from 'react';
import { ViewType, Thread, DirectMessage } from '../types';
import { ChevronLeft, Send, Search, MoreVertical, Phone, Video } from 'lucide-react';
import { Button } from './ui/Button';
import { dbService, authService } from '../services/api';

interface InboxViewProps {
  userType: 'client' | 'caregiver';
  onNavigate: (view: ViewType) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onScheduleVideoCall?: (caregiverId: string, caregiverName: string) => void;
  onViewProfile?: (caregiverId: string) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({ userType, onNavigate, onShowToast, onScheduleVideoCall, onViewProfile }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const isClient = userType === 'client';
  const themeColor = isClient ? 'teal' : 'orange';
  const currentUser = authService.getCurrentUser();
  const currentUid = currentUser ? currentUser.uid : 'me'; 

  // 1. Subscribe to Threads
  useEffect(() => {
    const unsubscribe = dbService.subscribeToThreads(userType, (fetchedThreads) => {
        setThreads(fetchedThreads);
    });
    return () => unsubscribe();
  }, [userType]);

  // 2. Subscribe to Messages when thread selected
  useEffect(() => {
      if (selectedThreadId) {
          const unsubscribe = dbService.subscribeToMessages(selectedThreadId, (msgs) => {
              setMessages(msgs);
          });
          return () => unsubscribe();
      } else {
          setMessages([]);
      }
  }, [selectedThreadId]);

  const activeThread = threads.find(t => t.id === selectedThreadId);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedThreadId) return;

    const textToSend = inputText;
    setInputText(''); // Optimistic UI - clear immediately

    try {
        await dbService.sendMessage(selectedThreadId, textToSend, currentUid);
    } catch (e) {
        console.error("Message send failed", e);
        setInputText(textToSend); // Restore message so user can retry
        onShowToast?.("Failed to send message. Please try again.", 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-screen flex flex-col md:flex-row bg-white md:overflow-hidden animate-slide-in pb-24 md:pb-0">
      
      {/* Thread List */}
      <div className={`w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center">
                <button 
                  onClick={() => onNavigate(isClient ? 'client' : 'caregiver')}
                  className="mr-2 p-1 text-slate-400 hover:bg-slate-100 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-slate-900">Messages</h1>
             </div>
             {/* Unread Badge Logic Here if needed */}
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-100 rounded-xl text-sm transition-all outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto">
          {threads.length > 0 ? threads.map(thread => (
            <div 
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-100 ${selectedThreadId === thread.id ? 'bg-white border-l-4 border-teal-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                 <div className="flex items-center gap-3">
                   <div className="relative">
                     <img src={thread.contactAvatar} alt={thread.contactName} className="w-10 h-10 rounded-full object-cover" />
                     {thread.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                   </div>
                   <div>
                     <h3 className={`font-bold text-sm ${thread.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>{thread.contactName}</h3>
                     <p className={`text-xs truncate max-w-[140px] ${thread.unreadCount > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{thread.lastMessage}</p>
                   </div>
                 </div>
                 <span className="text-[10px] text-slate-400 font-medium">{thread.lastMessageTime}</span>
              </div>
            </div>
          )) : (
              <div className="p-4 text-center text-slate-400 text-sm">No conversations yet.</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`w-full md:w-2/3 flex flex-col bg-slate-50 md:bg-white h-full ${!selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
        {activeThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm z-10">
               <div className="flex items-center gap-3">
                 <button onClick={() => setSelectedThreadId(null)} className="md:hidden p-1 text-slate-400">
                   <ChevronLeft className="w-6 h-6" />
                 </button>
                 <img src={activeThread.contactAvatar} alt={activeThread.contactName} className="w-10 h-10 rounded-full" />
                 <div>
                   <h2 className="font-bold text-slate-900">{activeThread.contactName}</h2>
                   <p className="text-xs text-green-600 flex items-center">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> Active now
                   </p>
                 </div>
               </div>
               <div className="flex gap-2 relative">
                 <button 
                   onClick={() => onShowToast?.('Voice calls coming soon!', 'info')}
                   className="p-2 text-slate-400 hover:bg-slate-100 hover:text-teal-600 rounded-full transition-colors"
                   title="Voice Call"
                 >
                   <Phone className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={() => {
                     if (activeThread?.contactId && onScheduleVideoCall) {
                       onScheduleVideoCall(activeThread.contactId, activeThread.contactName);
                     } else {
                       onShowToast?.('Video call feature requires scheduling', 'info');
                     }
                   }}
                   className="p-2 text-slate-400 hover:bg-slate-100 hover:text-purple-600 rounded-full transition-colors"
                   title="Video Call"
                 >
                   <Video className="w-5 h-5" />
                 </button>
                 <div className="relative">
                   <button 
                     onClick={() => setShowMenu(!showMenu)}
                     className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                     title="More Options"
                   >
                     <MoreVertical className="w-5 h-5" />
                   </button>
                   {showMenu && (
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                       <button
                         onClick={() => {
                           setShowMenu(false);
                           if (activeThread?.contactId && onViewProfile) {
                             onViewProfile(activeThread.contactId);
                           } else {
                             onShowToast?.('View profile feature coming soon', 'info');
                           }
                         }}
                         className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                       >
                         View Profile
                       </button>
                       <button
                         onClick={() => {
                           setShowMenu(false);
                           onShowToast?.('Block feature coming soon', 'info');
                         }}
                         className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                       >
                         Block User
                       </button>
                       <button
                         onClick={() => {
                           setShowMenu(false);
                           onShowToast?.('Report feature coming soon', 'info');
                         }}
                         className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                       >
                         Report
                       </button>
                     </div>
                   )}
                 </div>
               </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUid || msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                     msg.senderId === currentUid || msg.senderId === 'me'
                       ? `${isClient ? 'bg-teal-600' : 'bg-orange-500'} text-white rounded-br-none` 
                       : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                   }`}>
                     {msg.text}
                     <div className={`text-[10px] mt-1 text-right ${msg.senderId === currentUid || msg.senderId === 'me' ? 'text-white/70' : 'text-slate-400'}`}>
                       {msg.timestamp}
                     </div>
                   </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 pb-8 md:pb-4 bg-white border-t border-slate-100 safe-area-bottom">
               <div className="flex gap-2">
                 <input 
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                   placeholder="Type a message..."
                   className="flex-grow px-4 py-3 bg-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
                 />
                 <Button onClick={handleSendMessage} variant={isClient ? 'primary' : 'accent'} className="px-3">
                   <Send className="w-5 h-5" />
                 </Button>
               </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-400">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
               <Send className="w-8 h-8 text-slate-300 ml-1" />
             </div>
             <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};
