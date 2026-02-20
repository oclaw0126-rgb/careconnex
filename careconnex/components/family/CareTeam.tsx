import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Users, 
  Star, 
  Calendar, 
  MessageCircle, 
  Video,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  UserCheck,
  Shield
} from 'lucide-react';
import { authService } from '../../services/api';

interface CareTeamMember {
  id: string;
  caregiverId: string;
  name: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  role: 'primary' | 'backup';
  specialties: string[];
  shiftCount: number;
  lastShiftDate?: string;
  nextShiftDate?: string;
  continuityScore: number; // percentage of shifts with this team
  phoneNumber?: string;
  bio: string;
}

interface CareTeamData {
  clientId: string;
  seniorId: string;
  seniorName: string;
  primaryCaregiver: CareTeamMember;
  backupCaregivers: CareTeamMember[];
  assignmentDate: string;
  teamContinuityScore: number;
  totalShifts: number;
  shiftsWithTeam: number;
  familySatisfaction: number;
}

interface CareTeamProps {
  clientId: string;
}

export const CareTeam: React.FC<CareTeamProps> = ({ clientId }) => {
  const [careTeam, setCareTeam] = useState<CareTeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<CareTeamMember | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    loadCareTeam();
  }, [clientId]);

  const loadCareTeam = async () => {
    try {
      // In production: call Cloud Function getCareTeam
      // Mock data for now
      const mockTeam: CareTeamData = {
        clientId: 'client-1',
        seniorId: 'senior-1',
        seniorName: 'Mom',
        primaryCaregiver: {
          id: 'caregiver-1',
          caregiverId: 'cg-1',
          name: 'Maria Rodriguez',
          imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
          rating: 4.9,
          reviewCount: 47,
          role: 'primary',
          specialties: ['Dementia Care', 'Meal Prep', 'Companionship'],
          shiftCount: 23,
          lastShiftDate: '2026-02-14',
          nextShiftDate: '2026-02-16',
          continuityScore: 94,
          phoneNumber: '+1 (555) 123-4567',
          bio: 'Maria has 8 years of experience in senior care with special training in dementia care. She speaks English and Spanish.'
        },
        backupCaregivers: [
          {
            id: 'caregiver-2',
            caregiverId: 'cg-2',
            name: 'Jennifer Chen',
            imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
            rating: 4.8,
            reviewCount: 32,
            role: 'backup',
            specialties: ['Medication Reminders', 'Mobility Assistance', 'Light Housekeeping'],
            shiftCount: 5,
            lastShiftDate: '2026-02-10',
            continuityScore: 88,
            bio: 'Jennifer is a certified nursing assistant with 5 years of experience. She specializes in medication management and mobility support.'
          },
          {
            id: 'caregiver-3',
            caregiverId: 'cg-3',
            name: 'David Thompson',
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
            rating: 4.9,
            reviewCount: 28,
            role: 'backup',
            specialties: ['Companionship', 'Transportation', 'Exercise'],
            shiftCount: 3,
            continuityScore: 92,
            bio: 'David has a background in physical therapy and loves helping seniors stay active. He has excellent reviews for his patience and kindness.'
          }
        ],
        assignmentDate: '2026-01-15',
        teamContinuityScore: 91,
        totalShifts: 31,
        shiftsWithTeam: 28,
        familySatisfaction: 4.8
      };
      setCareTeam(mockTeam);
    } catch (error) {
      console.error('Failed to load care team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleIntro = () => {
    setShowScheduleModal(true);
  };

  const handleMessageCaregiver = (caregiverId: string) => {
    // Navigate to messaging
    console.log('Message caregiver:', caregiverId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!careTeam) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">No care team assigned yet.</p>
        <Button className="mt-4">Request Care Team Assignment</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Care Team</h2>
          <p className="text-slate-500">Dedicated caregivers for {careTeam.seniorName}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{careTeam.teamContinuityScore}%</p>
              <p className="text-xs text-slate-500">Continuity Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Caregiver */}
      <Card className="p-6 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Primary Caregiver</h3>
              <p className="text-sm text-slate-500">Your main caregiver</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-full">
            Primary
          </span>
        </div>

        <div className="flex items-start gap-4">
          <img
            src={careTeam.primaryCaregiver.imageUrl}
            alt={careTeam.primaryCaregiver.name}
            className="w-20 h-20 rounded-2xl object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-xl font-bold text-slate-900">{careTeam.primaryCaregiver.name}</h4>
              <div className="flex items-center text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold ml-1">{careTeam.primaryCaregiver.rating}</span>
              </div>
            </div>
            
            <p className="text-slate-600 text-sm mb-3">{careTeam.primaryCaregiver.bio}</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {careTeam.primaryCaregiver.specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Shifts</p>
                <p className="font-semibold text-slate-900">{careTeam.primaryCaregiver.shiftCount}</p>
              </div>
              <div>
                <p className="text-slate-400">Continuity</p>
                <p className="font-semibold text-green-600">{careTeam.primaryCaregiver.continuityScore}%</p>
              </div>
              <div>
                <p className="text-slate-400">Next Shift</p>
                <p className="font-semibold text-slate-900">
                  {careTeam.primaryCaregiver.nextShiftDate 
                    ? new Date(careTeam.primaryCaregiver.nextShiftDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Not scheduled'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button variant="secondary" size="sm">
            <Video className="w-4 h-4 mr-2" />
            Video Call
          </Button>
          <Button variant="secondary" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            View Schedule
          </Button>
        </div>
      </Card>

      {/* Backup Caregivers */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-600" />
          Backup Team
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {careTeam.backupCaregivers.map((caregiver) => (
            <Card 
              key={caregiver.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedMember(caregiver)}
            >
              <div className="flex items-start gap-3">
                <img
                  src={caregiver.imageUrl}
                  alt={caregiver.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 truncate">{caregiver.name}</h4>
                    <div className="flex items-center text-amber-500 text-sm">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="ml-1">{caregiver.rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{caregiver.bio}</p>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {caregiver.specialties.slice(0, 2).map((specialty) => (
                      <span
                        key={specialty}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-slate-500">{caregiver.shiftCount} shifts</span>
                    <span className="text-green-600 font-medium">{caregiver.continuityScore}% continuity</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Team Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Team Performance</h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-600">{careTeam.totalShifts}</p>
            <p className="text-sm text-slate-500">Total Shifts</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{careTeam.shiftsWithTeam}</p>
            <p className="text-sm text-slate-500">With Your Team</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{careTeam.teamContinuityScore}%</p>
            <p className="text-sm text-slate-500">Continuity Score</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500">{careTeam.familySatisfaction}</p>
            <p className="text-sm text-slate-500">Your Rating</p>
          </div>
        </div>
        
        <div className="mt-6 bg-slate-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900">Why Continuity Matters</p>
              <p className="text-sm text-slate-600 mt-1">
                Having the same caregivers leads to better care quality, stronger relationships, 
                and more comfort for {careTeam.seniorName}. Your {careTeam.teamContinuityScore}% score is excellent!
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Team Intro Session */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 mb-1">Schedule Team Introduction</h3>
            <p className="text-slate-600 text-sm mb-4">
              Meet all your caregivers together in a 30-minute video call. Walk through {careTeam.seniorName}'s 
              care plan, preferences, and get to know the team.
            </p>
            <Button onClick={handleScheduleIntro}>
              Schedule Intro Session
            </Button>
          </div>
        </div>
      </Card>

      {/* Caregiver Detail Modal */}
      {selectedMember && (
        <CaregiverDetailModal
          caregiver={selectedMember}
          onClose={() => setSelectedMember(null)}
          onMessage={handleMessageCaregiver}
        />
      )}
    </div>
  );
};

// Caregiver Detail Modal Component
interface CaregiverDetailModalProps {
  caregiver: CareTeamMember;
  onClose: () => void;
  onMessage: (caregiverId: string) => void;
}

const CaregiverDetailModal: React.FC<CaregiverDetailModalProps> = ({ 
  caregiver, 
  onClose,
  onMessage 
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <img
              src={caregiver.imageUrl}
              alt={caregiver.name}
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <div>
              <h3 className="text-xl font-bold text-slate-900">{caregiver.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold ml-1">{caregiver.rating}</span>
                </div>
                <span className="text-slate-400">({caregiver.reviewCount} reviews)</span>
              </div>
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-2 ${
                caregiver.role === 'primary' 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {caregiver.role === 'primary' ? 'Primary Caregiver' : 'Backup Caregiver'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <p className="text-slate-600 mb-4">{caregiver.bio}</p>

        <div className="mb-4">
          <h4 className="font-semibold text-slate-900 mb-2">Specialties</h4>
          <div className="flex flex-wrap gap-2">
            {caregiver.specialties.map((specialty) => (
              <span
                key={specialty}
                className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Shifts</p>
            <p className="text-2xl font-bold text-slate-900">{caregiver.shiftCount}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Continuity Score</p>
            <p className="text-2xl font-bold text-green-600">{caregiver.continuityScore}%</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            fullWidth
            onClick={() => onMessage(caregiver.caregiverId)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Send Message
          </Button>
          <Button 
            variant="secondary"
            fullWidth
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Schedule
          </Button>
        </div>
      </div>
    </Card>
  </div>
);

export default CareTeam;
