import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Heart, 
  PiggyBank, 
  Calendar, 
  GraduationCap, 
  Brain,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { authService } from '../../services/api';

interface BenefitsEnrollment {
  healthInsurance: {
    enrolled: boolean;
    eligible: boolean;
    monthlyStipend: number;
    pendingReimbursement: number;
    totalReimbursed: number;
    lastReimbursementDate?: string;
    documents: InsuranceDocument[];
  };
  retirement401k: {
    enrolled: boolean;
    contributionRate: number; // percentage
    companyMatch: number; // 3% fixed
    currentBalance: number;
    ytdContribution: number;
    ytdMatch: number;
  };
  pto: {
    accruedDays: number;
    usedDays: number;
    pendingDays: number;
    accrualRate: number; // days per month
  };
  educationFund: {
    annualLimit: number;
    used: number;
    available: number;
    pendingApplications: number;
  };
  mentalHealth: {
    sessionsUsed: number;
    sessionsTotal: number;
    provider: string;
  };
}

interface InsuranceDocument {
  id: string;
  type: 'policy' | 'receipt' | 'proof';
  url: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  amount?: number;
}

interface BenefitsDashboardProps {
  caregiverId: string;
}

export const BenefitsDashboard: React.FC<BenefitsDashboardProps> = ({ caregiverId }) => {
  const [benefits, setBenefits] = useState<BenefitsEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'retirement' | 'pto' | 'education' | 'mental'>('overview');

  useEffect(() => {
    loadBenefits();
  }, [caregiverId]);

  const loadBenefits = async () => {
    try {
      // In production: call Cloud Function getBenefitsEnrollment
      // Mock data for now
      const mockBenefits: BenefitsEnrollment = {
        healthInsurance: {
          enrolled: true,
          eligible: true,
          monthlyStipend: 200,
          pendingReimbursement: 0,
          totalReimbursed: 1200,
          lastReimbursementDate: '2026-01-15',
          documents: []
        },
        retirement401k: {
          enrolled: true,
          contributionRate: 5,
          companyMatch: 3,
          currentBalance: 2847.50,
          ytdContribution: 840.00,
          ytdMatch: 504.00
        },
        pto: {
          accruedDays: 4.5,
          usedDays: 2,
          pendingDays: 1,
          accrualRate: 1
        },
        educationFund: {
          annualLimit: 500,
          used: 250,
          available: 250,
          pendingApplications: 0
        },
        mentalHealth: {
          sessionsUsed: 2,
          sessionsTotal: 4,
          provider: 'Spring Health'
        }
      };
      setBenefits(mockBenefits);
    } catch (error) {
      console.error('Failed to load benefits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!benefits) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Unable to load benefits information.</p>
      </div>
    );
  }

  const totalBenefitsValue = 
    benefits.healthInsurance.monthlyStipend +
    (benefits.retirement401k.ytdMatch / 12) +
    (benefits.educationFund.annualLimit / 12) +
    (benefits.mentalHealth.sessionsTotal * 100 / 12); // Estimated value per session

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Benefits</h2>
          <p className="text-slate-500">CareConnex takes care of you</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Monthly Value</p>
          <p className="text-3xl font-bold text-teal-600">{formatCurrency(totalBenefitsValue)}</p>
        </div>
      </div>

      {/* Benefits Overview Cards */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Health Insurance */}
          <BenefitCard
            icon={Heart}
            title="Health Insurance"
            amount={benefits.healthInsurance.monthlyStipend}
            frequency="monthly stipend"
            enrolled={benefits.healthInsurance.enrolled}
            eligible={benefits.healthInsurance.eligible}
            onClick={() => setActiveTab('health')}
            highlight={benefits.healthInsurance.pendingReimbursement > 0}
          />

          {/* 401k Retirement */}
          <BenefitCard
            icon={PiggyBank}
            title="401k Retirement"
            amount={benefits.retirement401k.currentBalance}
            frequency="current balance"
            enrolled={benefits.retirement401k.enrolled}
            eligible={true}
            onClick={() => setActiveTab('retirement')}
            meta={`${benefits.retirement401k.companyMatch}% company match`}
          />

          {/* Paid Time Off */}
          <BenefitCard
            icon={Calendar}
            title="Paid Time Off"
            amount={benefits.pto.accruedDays}
            frequency="days available"
            enrolled={true}
            eligible={true}
            onClick={() => setActiveTab('pto')}
            meta={`${benefits.pto.usedDays} used this year`}
          />

          {/* Education Fund */}
          <BenefitCard
            icon={GraduationCap}
            title="Education Fund"
            amount={benefits.educationFund.available}
            frequency="available"
            enrolled={true}
            eligible={true}
            onClick={() => setActiveTab('education')}
            meta={`${formatCurrency(benefits.educationFund.annualLimit)} annual limit`}
          />

          {/* Mental Health */}
          <BenefitCard
            icon={Brain}
            title="Mental Health"
            amount={benefits.mentalHealth.sessionsTotal - benefits.mentalHealth.sessionsUsed}
            frequency="sessions left"
            enrolled={true}
            eligible={true}
            onClick={() => setActiveTab('mental')}
            meta={`${benefits.mentalHealth.sessionsUsed} used this year`}
          />

          {/* Total Value Card */}
          <Card className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium mb-1">Annual Benefits Value</p>
                <p className="text-3xl font-bold">{formatCurrency(totalBenefitsValue * 12)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-teal-100">
                Industry-leading benefits for caregivers
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Health Insurance Detail */}
      {activeTab === 'health' && (
        <HealthInsuranceDetail 
          benefits={benefits.healthInsurance}
          onBack={() => setActiveTab('overview')}
        />
      )}

      {/* 401k Detail */}
      {activeTab === 'retirement' && (
        <RetirementDetail 
          benefits={benefits.retirement401k}
          onBack={() => setActiveTab('overview')}
        />
      )}

      {/* PTO Detail */}
      {activeTab === 'pto' && (
        <PTODetail 
          benefits={benefits.pto}
          onBack={() => setActiveTab('overview')}
        />
      )}

      {/* Education Detail */}
      {activeTab === 'education' && (
        <EducationDetail 
          benefits={benefits.educationFund}
          onBack={() => setActiveTab('overview')}
        />
      )}

      {/* Mental Health Detail */}
      {activeTab === 'mental' && (
        <MentalHealthDetail 
          benefits={benefits.mentalHealth}
          onBack={() => setActiveTab('overview')}
        />
      )}
    </div>
  );
};

// Benefit Card Component
interface BenefitCardProps {
  icon: React.ElementType;
  title: string;
  amount: number;
  frequency: string;
  enrolled: boolean;
  eligible: boolean;
  onClick: () => void;
  meta?: string;
  highlight?: boolean;
}

const BenefitCard: React.FC<BenefitCardProps> = ({
  icon: Icon,
  title,
  amount,
  frequency,
  enrolled,
  eligible,
  onClick,
  meta,
  highlight
}) => {
  const formatAmount = (val: number) => {
    if (val >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(val);
    }
    return val.toString();
  };

  return (
    <Card 
      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
        highlight ? 'ring-2 ring-orange-400' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          enrolled ? 'bg-teal-100' : 'bg-slate-100'
        }`}>
          <Icon className={`w-6 h-6 ${enrolled ? 'text-teal-600' : 'text-slate-400'}`} />
        </div>
        {enrolled && <CheckCircle className="w-5 h-5 text-green-500" />}
      </div>
      
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      
      {eligible ? (
        <>
          <p className="text-2xl font-bold text-slate-900">{formatAmount(amount)}</p>
          <p className="text-sm text-slate-500">{frequency}</p>
          {meta && <p className="text-xs text-slate-400 mt-2">{meta}</p>}
        </>
      ) : (
        <div className="flex items-center text-amber-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          <span className="text-sm">Not yet eligible</span>
        </div>
      )}
      
      <div className="mt-4 flex items-center text-teal-600 text-sm font-medium">
        <span>Manage</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </Card>
  );
};

// Detail Components
const HealthInsuranceDetail: React.FC<{
  benefits: BenefitsEnrollment['healthInsurance'];
  onBack: () => void;
}> = ({ benefits, onBack }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="text-teal-600 font-medium flex items-center">
      ← Back to Benefits
    </button>
    
    <Card className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Health Insurance Stipend</h3>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Monthly Stipend</p>
          <p className="text-2xl font-bold text-teal-600">${benefits.monthlyStipend}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Total Reimbursed</p>
          <p className="text-2xl font-bold text-green-600">${benefits.totalReimbursed}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-slate-700">${benefits.pendingReimbursement}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-slate-900">How It Works</h4>
        <ul className="space-y-2 text-slate-600">
          <li className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            Purchase your own health insurance plan
          </li>
          <li className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            Upload proof of coverage (policy document or receipt)
          </li>
          <li className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            Receive ${benefits.monthlyStipend}/month reimbursement
          </li>
        </ul>
      </div>

      <div className="mt-8 flex gap-4">
        <Button>Upload Documents</Button>
        <Button variant="secondary">View History</Button>
      </div>
    </Card>
  </div>
);

const RetirementDetail: React.FC<{
  benefits: BenefitsEnrollment['retirement401k'];
  onBack: () => void;
}> = ({ benefits, onBack }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="text-teal-600 font-medium flex items-center">
      ← Back to Benefits
    </button>
    
    <Card className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">401k Retirement Plan</h3>
      
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Current Balance</p>
          <p className="text-xl font-bold text-teal-600">${benefits.currentBalance.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Your Contribution</p>
          <p className="text-xl font-bold text-blue-600">{benefits.contributionRate}%</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Company Match</p>
          <p className="text-xl font-bold text-green-600">{benefits.companyMatch}%</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">YTD Contributions</p>
          <p className="text-xl font-bold text-purple-600">${benefits.ytdContribution.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <h4 className="font-semibold text-slate-900 mb-4">How the Match Works</h4>
        <p className="text-slate-600 mb-4">
          CareConnex matches {benefits.companyMatch}% of your contributions, dollar-for-dollar. 
          Contribute at least {benefits.companyMatch}% to get the full match - it's free money!
        </p>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Your contribution</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Company match</span>
          </div>
        </div>
      </div>

      <Button>Adjust Contribution</Button>
    </Card>
  </div>
);

const PTODetail: React.FC<{
  benefits: BenefitsEnrollment['pto'];
  onBack: () => void;
}> = ({ benefits, onBack }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="text-teal-600 font-medium flex items-center">
      ← Back to Benefits
    </button>
    
    <Card className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Paid Time Off</h3>
      
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Available</p>
          <p className="text-3xl font-bold text-green-600">{benefits.accruedDays}</p>
          <p className="text-xs text-slate-500">days</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Used This Year</p>
          <p className="text-3xl font-bold text-blue-600">{benefits.usedDays}</p>
          <p className="text-xs text-slate-500">days</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-amber-600">{benefits.pendingDays}</p>
          <p className="text-xs text-slate-500">days</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Accrual Rate</p>
          <p className="text-3xl font-bold text-teal-600">{benefits.accrualRate}</p>
          <p className="text-xs text-slate-500">day/month</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6">
        <h4 className="font-semibold text-slate-900 mb-2">How PTO Works</h4>
        <ul className="space-y-2 text-slate-600 text-sm">
          <li>• Earn 1 day per month worked (approximately)</li>
          <li>• Based on hours worked: 160+ hours = 1 day</li>
          <li>• Use it or cash out unused days at 80% value</li>
          <li>• Request at least 2 weeks in advance when possible</li>
        </ul>
      </div>

      <div className="mt-6 flex gap-4">
        <Button>Request Time Off</Button>
        <Button variant="secondary">Cash Out PTO</Button>
      </div>
    </Card>
  </div>
);

const EducationDetail: React.FC<{
  benefits: BenefitsEnrollment['educationFund'];
  onBack: () => void;
}> = ({ benefits, onBack }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="text-teal-600 font-medium flex items-center">
      ← Back to Benefits
    </button>
    
    <Card className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Continuing Education Fund</h3>
      
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Available</p>
          <p className="text-2xl font-bold text-green-600">${benefits.available}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Used This Year</p>
          <p className="text-2xl font-bold text-blue-600">${benefits.used}</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Annual Limit</p>
          <p className="text-2xl font-bold text-teal-600">${benefits.annualLimit}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <h4 className="font-semibold text-slate-900 mb-4">Eligible Certifications</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {['CNA License', 'Dementia Care Certification', 'First Aid/CPR', 'Medication Management', 'Hospice Care', 'Parkinsons Care'].map((cert) => (
            <div key={cert} className="flex items-center text-slate-700">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              {cert}
            </div>
          ))}
        </div>
      </div>

      <Button>Apply for Reimbursement</Button>
    </Card>
  </div>
);

const MentalHealthDetail: React.FC<{
  benefits: BenefitsEnrollment['mentalHealth'];
  onBack: () => void;
}> = ({ benefits, onBack }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="text-teal-600 font-medium flex items-center">
      ← Back to Benefits
    </button>
    
    <Card className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Mental Health Support</h3>
      
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Sessions Available</p>
          <p className="text-3xl font-bold text-teal-600">{benefits.sessionsTotal - benefits.sessionsUsed}</p>
          <p className="text-xs text-slate-500">of {benefits.sessionsTotal} annual sessions</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 mb-1">Provider</p>
          <p className="text-xl font-bold text-blue-600">{benefits.provider}</p>
          <p className="text-xs text-slate-500">Licensed therapists</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <h4 className="font-semibold text-slate-900 mb-2">What's Included</h4>
        <ul className="space-y-2 text-slate-600 text-sm">
          <li>• 4 free counseling sessions per year</li>
          <li>• Caregiver-specialized therapists who understand burnout</li>
          <li>• Video, phone, or in-person sessions</li>
          <li>• Completely confidential</li>
          <li>• Additional sessions at discounted rate</li>
        </ul>
      </div>

      <Button>Book a Session</Button>
    </Card>
  </div>
);

export default BenefitsDashboard;
