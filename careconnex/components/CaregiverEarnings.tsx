import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Calendar,
  MapPin,
  Star,
  ArrowUpRight,
  Wallet,
  Target
} from 'lucide-react';

interface EarningsData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  ytd: number;
  pendingPayout: number;
  totalHours: number;
  avgHourlyRate: number;
  upcomingShifts: number;
}

interface Shift {
  id: string;
  date: string;
  clientName: string;
  hours: number;
  rate: number;
  earnings: number;
  status: 'completed' | 'pending' | 'cancelled';
  distance?: number;
  rating?: number;
}

interface CaregiverEarningsProps {
  caregiverId: string;
}

export const CaregiverEarnings: React.FC<CaregiverEarningsProps> = ({ caregiverId }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(false);

  // Mock data - replace with Firestore query
  const earnings: EarningsData = {
    today: 140,
    thisWeek: 840,
    thisMonth: 3360,
    ytd: 18480,
    pendingPayout: 420,
    totalHours: 32,
    avgHourlyRate: 26.25,
    upcomingShifts: 5,
  };

  const recentShifts: Shift[] = [
    { id: '1', date: 'Today, 2:00 PM', clientName: 'Mrs. Johnson', hours: 4, rate: 28, earnings: 112, status: 'completed', rating: 5 },
    { id: '2', date: 'Today, 9:00 AM', clientName: 'Mr. Smith', hours: 3, rate: 26, earnings: 78, status: 'completed', rating: 5 },
    { id: '3', date: 'Yesterday', clientName: 'Ms. Davis', hours: 5, rate: 30, earnings: 150, status: 'completed', rating: 4 },
    { id: '4', date: 'Feb 13', clientName: 'Mr. Wilson', hours: 4, rate: 25, earnings: 100, status: 'completed' },
  ];

  const milestones = [
    { label: 'This Week Goal', current: earnings.thisWeek, target: 1000, icon: Target },
    { label: 'Monthly Goal', current: earnings.thisMonth, target: 4000, icon: Calendar },
    { label: 'Hours This Week', current: earnings.totalHours, target: 40, icon: Clock },
  ];

  const handleInstantPayout = async () => {
    setLoading(true);
    // Call instant payout function
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
    }
  };

  const getPeriodValue = () => {
    switch (period) {
      case 'week': return earnings.thisWeek;
      case 'month': return earnings.thisMonth;
      case 'year': return earnings.ytd;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Earnings Card */}
      <Card className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-teal-100 text-sm mb-1">{getPeriodLabel()} Earnings</p>
            <h2 className="text-4xl font-bold">${getPeriodValue().toLocaleString()}</h2>
          </div>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  period === p 
                    ? 'bg-white text-teal-700' 
                    : 'bg-teal-500/50 text-white hover:bg-teal-500'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-teal-100 text-xs mb-1">Total Hours</p>
            <p className="text-2xl font-bold">{earnings.totalHours}h</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-teal-100 text-xs mb-1">Avg Rate</p>
            <p className="text-2xl font-bold">${earnings.avgHourlyRate}/hr</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-teal-100 text-xs mb-1">Upcoming</p>
            <p className="text-2xl font-bold">{earnings.upcomingShifts}</p>
          </div>
        </div>

        {/* Instant Payout */}
        <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Available for Instant Payout</p>
              <p className="text-teal-100 text-sm">Get paid in minutes, not days</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold">${earnings.pendingPayout}</span>
            <Button 
              onClick={handleInstantPayout}
              disabled={loading || earnings.pendingPayout === 0}
              className="bg-white text-teal-700 hover:bg-teal-50"
            >
              {loading ? 'Processing...' : 'Cash Out'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Milestones */}
      <div className="grid md:grid-cols-3 gap-4">
        {milestones.map((milestone) => {
          const Icon = milestone.icon;
          const progress = Math.min((milestone.current / milestone.target) * 100, 100);
          
          return (
            <Card key={milestone.label} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-sm text-slate-500">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-1">{milestone.label}</p>
              <p className="text-xl font-bold text-slate-900">
                {typeof milestone.current === 'number' && milestone.current > 100 
                  ? `$${milestone.current.toLocaleString()}` 
                  : milestone.current}
                <span className="text-sm font-normal text-slate-500"> / {milestone.target}</span>
              </p>
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Shifts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Recent Shifts</h3>
          <Button variant="ghost" size="sm" className="text-teal-600">
            View All
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {recentShifts.map((shift) => (
            <div 
              key={shift.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{shift.clientName}</p>
                  <p className="text-sm text-slate-500">{shift.date} • {shift.hours} hours</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-slate-900">+${shift.earnings}</p>
                <div className="flex items-center justify-end gap-2 text-sm">
                  {shift.rating && (
                    <span className="flex items-center text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      {shift.rating}
                    </span>
                  )}
                  <span className="text-slate-400">${shift.rate}/hr</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tips to Earn More */}
      <Card className="p-6 bg-amber-50 border-amber-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 mb-2">Tips to Earn More</h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Accept last-minute shifts (+$5/hr bonus)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Maintain 4.9+ rating for preferred status
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Get certified in dementia care (+$3/hr)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Refer other caregivers ($200 bonus)
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CaregiverEarnings;
