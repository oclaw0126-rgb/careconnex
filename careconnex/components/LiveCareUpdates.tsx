import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  Clock, 
  CheckCircle, 
  Camera, 
  Pill, 
  Utensils, 
  Activity,
  MessageCircle,
  AlertCircle
} from 'lucide-react';

interface CareUpdate {
  id: string;
  type: 'arrival' | 'photo' | 'medication' | 'meal' | 'activity' | 'mood' | 'departure';
  timestamp: Date;
  data?: {
    photoUrl?: string;
    note?: string;
    mood?: 'great' | 'good' | 'okay' | 'needs_attention';
    activity?: string;
  };
}

interface LiveCareUpdatesProps {
  appointmentId: string;
  clientId: string;
}

export const LiveCareUpdates: React.FC<LiveCareUpdatesProps> = ({ appointmentId, clientId }) => {
  const [updates, setUpdates] = useState<CareUpdate[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Simulate real-time updates (replace with Firestore listener)
  useEffect(() => {
    // In production: listen to appointments/{id}/updates collection
    const mockUpdates: CareUpdate[] = [
      {
        id: '1',
        type: 'arrival',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: '2',
        type: 'mood',
        timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
        data: { mood: 'great', note: 'Mom was singing this morning!' }
      },
      {
        id: '3',
        type: 'medication',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        data: { note: 'Morning medications taken with breakfast' }
      },
      {
        id: '4',
        type: 'meal',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        data: { note: 'Oatmeal with berries and tea' }
      },
      {
        id: '5',
        type: 'activity',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        data: { activity: 'Walk in the garden' }
      }
    ];
    setUpdates(mockUpdates);
    setIsLive(true);
  }, [appointmentId]);

  const getUpdateIcon = (type: CareUpdate['type']) => {
    switch (type) {
      case 'arrival': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'photo': return <Camera className="w-5 h-5 text-blue-500" />;
      case 'medication': return <Pill className="w-5 h-5 text-purple-500" />;
      case 'meal': return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'activity': return <Activity className="w-5 h-5 text-teal-500" />;
      case 'mood': return <MessageCircle className="w-5 h-5 text-pink-500" />;
      case 'departure': return <Clock className="w-5 h-5 text-slate-500" />;
      default: return <CheckCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getUpdateText = (update: CareUpdate) => {
    switch (update.type) {
      case 'arrival': return 'Caregiver arrived';
      case 'photo': return 'Photo update shared';
      case 'medication': return `Medication taken${update.data?.note ? ': ' + update.data.note : ''}`;
      case 'meal': return `Meal served${update.data?.note ? ': ' + update.data.note : ''}`;
      case 'activity': return `Activity: ${update.data?.activity || 'General care'}`;
      case 'mood': return `Mood check: ${update.data?.mood === 'great' ? 'Doing great!' : update.data?.mood}`;
      case 'departure': return 'Caregiver departed';
      default: return 'Update';
    }
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'great': return '😊';
      case 'good': return '🙂';
      case 'okay': return '😐';
      case 'needs_attention': return '😟';
      default: return '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Today's Care Updates</h3>
          <p className="text-sm text-slate-500">Real-time updates from the caregiver</p>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-700">Live</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {updates.map((update, index) => (
          <div 
            key={update.id}
            className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              {getUpdateIcon(update.type)}
            </div>
            
            <div className="flex-grow min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-900">
                  {getUpdateText(update)}
                  {update.data?.mood && (
                    <span className="ml-2">{getMoodEmoji(update.data.mood)}</span>
                  )}
                </p>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {formatTime(update.timestamp)}
                </span>
              </div>
              
              {update.data?.note && update.type !== 'medication' && update.type !== 'meal' && (
                <p className="text-sm text-slate-600 mt-1">{update.data.note}</p>
              )}
              
              {update.data?.photoUrl && (
                <div className="mt-2">
                  <img 
                    src={update.data.photoUrl} 
                    alt="Care update" 
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {updates.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No updates yet today</p>
            <p className="text-sm mt-1">Updates will appear here during the care visit</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Next Check-in</p>
            <p className="text-xs text-slate-500">Expected by 2:00 PM</p>
          </div>
          <Button variant="secondary" size="sm">
            Message Caregiver
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default LiveCareUpdates;
