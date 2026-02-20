

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Database, ChevronLeft, Check, AlertCircle, Users, Calendar, DollarSign, Activity, Server, CloudLightning, MessageSquare, Shield, Ban, Search, User, BrainCircuit, Briefcase, Trash2, MapPin } from 'lucide-react';
import { INITIAL_LOGS } from '../constants';
import { SystemLog, SupportTicket, AdminUser, JobPost, Caregiver } from '../types';
import { dbService, stripeService } from '../services/api';
import { runTrainingSimulation } from '../services/trainingSimulation';
import { TicketManager } from './admin/TicketManager';

interface AdminViewProps {
  onBack: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState({ users: 0, caregivers: 0, appointments: 0, revenue: 0 });
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [pendingCaregivers, setPendingCaregivers] = useState<Caregiver[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'tickets'>('users');
  const [filterUserType, setFilterUserType] = useState<'all' | 'client' | 'caregiver'>('all');

  // Connection States
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'mock'>('checking');

  // AI Training State
  const [isTraining, setIsTraining] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Simulate incoming live logs
  useEffect(() => {
    const interval = setInterval(() => {
      const newLog: SystemLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: Math.random() > 0.5
          ? "AI analyzing care patterns for User #442..."
          : "Payment gateway latency: 24ms (Optimal)",
        type: 'info'
      };
      setLogs(prev => [newLog, ...prev].slice(0, 10));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Check Connections & Stats on Mount
  useEffect(() => {
    const checkSystems = async () => {
      // 1. Check Database
      const isDbConnected = await dbService.verifyConnection();
      setDbStatus(isDbConnected ? 'connected' : 'disconnected');

      // 2. Check Stats (Only if DB connected)
      if (isDbConnected) {
        const s = await dbService.getSystemStats();
        setStats(s);

        // Fetch Data
        const fetchedUsers = await dbService.getAllUsers();
        setUsers(fetchedUsers);
        const fetchedJobs = await dbService.getAllJobs();
        setJobs(fetchedJobs);
        // Fetch pending caregivers (verificationStatus = 'submitted')
        const fetchedPendingCaregivers = await dbService.getCaregiversForVerification('submitted');
        setPendingCaregivers(fetchedPendingCaregivers as Caregiver[]);
      }

      // 3. Check Cloud Functions (Stripe)
      try {
        const { url } = await stripeService.initiateOnboarding();
        if (url.includes('stripe.com')) {
          setApiStatus('connected');
        } else {
          setApiStatus('mock');
        }
      } catch (e) {
        setApiStatus('mock');
      }
    };

    checkSystems();
  }, []);

  // Listen for tickets
  useEffect(() => {
    const unsubscribe = dbService.subscribeToTickets((fetchedTickets) => {
      setTickets(fetchedTickets);
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll training terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [trainingLogs]);

  const [seedDataExists, setSeedDataExists] = useState(false);

  // Check if seed data exists on mount
  useEffect(() => {
    dbService.hasSeedData().then(exists => setSeedDataExists(exists));
  }, []);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedStatus('idle');
    try {
      const result = await dbService.seedDatabase({
        caregivers: 12,
        clients: 6,
        jobs: 10,
        appointments: 20,
        reviews: 25,
        tickets: 8,
        notifications: 15
      });
      setSeedStatus('success');
      setSeedDataExists(true);
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: `✅ ${result.message} Created: ${Object.entries(result.created).map(([k, v]) => `${v} ${k}`).join(', ')}`,
        type: 'success'
      }, ...prev]);
      // Refresh stats
      const s = await dbService.getSystemStats();
      setStats(s);
      const u = await dbService.getAllUsers();
      setUsers(u);
      const j = await dbService.getAllJobs();
      setJobs(j);
    } catch (error: any) {
      console.error('Seed error details:', error);
      setSeedStatus('error');
      let errorMsg = error.message || 'Unknown error';
      
      if (errorMsg.includes('permission') || errorMsg.includes('Permission')) {
        errorMsg = 'Permission denied. Your account may not have admin privileges. Try logging out and back in, or check Firestore rules in Firebase Console.';
      }
      
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: `❌ Database seed failed: ${errorMsg}`,
        type: 'warning'
      }, ...prev]);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearSeedData = async () => {
    if (!confirm("⚠️ This will remove ALL dummy data (caregivers, clients, jobs, appointments, reviews, tickets, notifications).\n\nAre you sure?")) {
      return;
    }
    setIsSeeding(true);
    try {
      const result = await dbService.clearSeedData();
      setSeedDataExists(false);
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: `🗑️ ${result.message} Removed: ${Object.entries(result.deleted).map(([k, v]) => `${v} ${k}`).join(', ')}`,
        type: 'info'
      }, ...prev]);
      // Refresh stats
      const s = await dbService.getSystemStats();
      setStats(s);
      const u = await dbService.getAllUsers();
      setUsers(u);
      const j = await dbService.getAllJobs();
      setJobs(j);
    } catch (error: any) {
      console.error(error);
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: `❌ Failed to clear seed data: ${error.message}`,
        type: 'warning'
      }, ...prev]);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRunTraining = async () => {
    setIsTraining(true);
    setTrainingLogs([]);
    await runTrainingSimulation((msg) => {
      setTrainingLogs(prev => [...prev, msg]);
    });
    setIsTraining(false);
  };

  const handleVerifyUser = async (uid: string) => {
    // Admin override for Caregivers only
    await dbService.updateUser('caregivers', uid, { 
      verified: true, 
      verificationStatus: 'approved',
      backgroundCheckStatus: 'clear',
      approvedAt: new Date().toISOString()
    });
    await dbService.updateUser('users', uid, { verified: true });

    setUsers(prev => prev.map(u => (u.uid === uid) ? { ...u, verified: true } : u));
    // Remove from pending caregivers list
    setPendingCaregivers(prev => prev.filter(cg => cg.uid !== uid));
    setLogs(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      event: `Admin approved caregiver ${uid}`,
      type: 'success'
    }, ...prev]);
  };

  const handleBanUser = async (uid: string) => {
    if (confirm("Are you sure you want to ban this user? They will lose access immediately.")) {
      await dbService.banUser(uid);
      setUsers(prev => prev.map(u => (u.uid === uid) ? { ...u, isBanned: true } : u));
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: `User ${uid} banned by Admin`,
        type: 'warning'
      }, ...prev]);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (confirm("Delete this job post?")) {
      await dbService.deleteJobPost(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        event: `Job ${jobId} deleted by Admin`,
        type: 'info'
      }, ...prev]);
    }
  };

  const filteredUsers = filterUserType === 'all'
    ? users
    : users.filter(u => u.userType === filterUserType);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-mono p-4 md:p-8 animate-slide-in">
      <button
        onClick={onBack}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 mr-1" /> Back to App
      </button>

      {/* System Health Monitor */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Database Status */}
        <div className={`p-6 rounded-xl border ${dbStatus === 'connected' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className={`w-6 h-6 ${dbStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`} />
              <h3 className="font-bold text-white text-lg">Google Firestore</h3>
            </div>
            {dbStatus === 'checking' ? (
              <span className="text-slate-400 text-sm">Checking...</span>
            ) : dbStatus === 'connected' ? (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-bold uppercase">Online</span>
            ) : (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-bold uppercase">Offline</span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {dbStatus === 'connected'
              ? "Read/Write operations are live. User data is persisting to Google Cloud."
              : "Using local memory. Data will reset on refresh. Check API keys."}
          </p>
          {dbStatus === 'connected' && (
            <div className="flex gap-4 text-xs font-mono text-slate-300">
              <span>Reads: <span className="text-green-400">OK</span></span>
              <span>Writes: <span className="text-green-400">OK</span></span>
              <span>Latency: <span className="text-green-400">24ms</span></span>
            </div>
          )}
        </div>

        {/* API / Cloud Functions Status */}
        <div className={`p-6 rounded-xl border ${apiStatus === 'connected' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CloudLightning className={`w-6 h-6 ${apiStatus === 'connected' ? 'text-purple-400' : 'text-orange-400'}`} />
              <h3 className="font-bold text-white text-lg">Cloud Functions</h3>
            </div>
            {apiStatus === 'checking' ? (
              <span className="text-slate-400 text-sm">Checking...</span>
            ) : apiStatus === 'connected' ? (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded font-bold uppercase">Deployed</span>
            ) : (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded font-bold uppercase">Simulated</span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {apiStatus === 'connected'
              ? "Stripe payment logic is running on Google Servers."
              : "Backend logic is running in Browser Simulation Mode. Payments are mocked."}
          </p>
          {apiStatus === 'mock' && (
            <div className="bg-orange-900/30 p-2 rounded text-xs text-orange-200 border border-orange-500/20">
              To go live: Run <code>firebase deploy --only functions</code>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center text-slate-400 mb-2">
            <Users className="w-4 h-4 mr-2" /> Users
          </div>
          <div className="text-2xl font-bold text-white">{stats.users}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center text-slate-400 mb-2">
            <Activity className="w-4 h-4 mr-2" /> Caregivers
          </div>
          <div className="text-2xl font-bold text-white">{stats.caregivers}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center text-slate-400 mb-2">
            <Calendar className="w-4 h-4 mr-2" /> Appts
          </div>
          <div className="text-2xl font-bold text-white">{stats.appointments}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center text-slate-400 mb-2">
            <DollarSign className="w-4 h-4 mr-2" /> Volume
          </div>
          <div className="text-2xl font-bold text-green-400">${stats.revenue}</div>
        </div>
      </div>

      {/* AI TRAINING TERMINAL */}
      <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-white">AI Learning Simulator</h2>
              <p className="text-xs text-slate-400">Test the "Self-Learning" Matching Algorithm</p>
            </div>
          </div>
          <button
            onClick={handleRunTraining}
            disabled={isTraining}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isTraining ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/50'
              }`}
          >
            {isTraining ? 'Running Simulation...' : 'Train Algorithm'}
          </button>
        </div>

        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs md:text-sm h-64 overflow-y-auto border border-slate-900 shadow-inner">
          {trainingLogs.length === 0 ? (
            <div className="text-slate-600 h-full flex items-center justify-center italic">
              Ready to train. Click button to start simulation script.
            </div>
          ) : (
            <div className="space-y-1">
              {trainingLogs.map((log, i) => (
                <div key={i} className={`
                        ${log.includes('SUCCESS') ? 'text-green-400 font-bold' : ''}
                        ${log.includes('FAIL') ? 'text-red-400 font-bold' : ''}
                        ${log.includes('PHASE') ? 'text-blue-300 pt-2 font-bold' : 'text-slate-300'}
                     `}>
                  {log}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Management Tabs */}
      <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white">Master Registry</h2>
          </div>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'users' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}
            >Users</button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'jobs' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}
            >Marketplace Jobs</button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === 'tickets' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}
            >Support Tickets</button>
          </div>
        </div>

        {activeTab === 'users' && (
          <div>
            {/* ... existing user table ... */}
            <div className="mb-8 p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
              <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" /> Pending Verification Queue ({pendingCaregivers.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-orange-900/40 text-orange-200 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Submitted Info</th>
                      <th className="px-4 py-2">SSN (Last 4)</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-500/20">
                    {pendingCaregivers.length > 0 ? (
                      pendingCaregivers.map(cg => (
                        <tr key={cg.uid}>
                          <td className="px-4 py-3 font-bold">{cg.name}</td>
                          <td className="px-4 py-3 text-xs font-mono">
                            DOB: {cg.backgroundCheckData?.dob || 'N/A'}<br />
                            Zip: {cg.backgroundCheckData?.zip || 'N/A'}
                          </td>
                          <td className="px-4 py-3 font-mono">***-**-{cg.backgroundCheckData?.ssnLastFour || '****'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleVerifyUser(cg.uid!)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold shadow-lg shadow-green-900/20"
                            >
                              Approve & Unlock
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="p-4 text-center text-slate-500 italic">No pending verifications. Caregivers who submit their background check will appear here.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 mb-4 justify-end">
              <span className="text-xs text-slate-400 self-center mr-2">Filter by Role:</span>
              <button onClick={() => setFilterUserType('all')} className={`px-2 py-1 rounded text-xs ${filterUserType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>All</button>
              <button onClick={() => setFilterUserType('client')} className={`px-2 py-1 rounded text-xs ${filterUserType === 'client' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Clients</button>
              <button onClick={() => setFilterUserType('caregiver')} className={`px-2 py-1 rounded text-xs ${filterUserType === 'caregiver' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Caregivers</button>
            </div>
            <div className="overflow-x-auto max-h-[400px] border border-slate-700 rounded-lg">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-700 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">User Details</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-800">
                  {filteredUsers.length > 0 ? filteredUsers.map(user => (
                    <tr key={user.uid} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${user.userType === 'caregiver' ? 'bg-orange-500/20 text-orange-400' : 'bg-teal-500/20 text-teal-400'
                          }`}>
                          {user.userType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-1">{user.uid.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        {user.userType === 'caregiver' ? (
                          user.verified ? (
                            <span className="text-green-400 flex items-center text-xs font-bold"><Check className="w-3 h-3 mr-1" /> Verified</span>
                          ) : (
                            <span className="text-slate-500 text-xs flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Pending</span>
                          )
                        ) : (
                          <span className="text-slate-600 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.isBanned ? (
                          <span className="text-red-500 font-bold text-xs uppercase">BANNED</span>
                        ) : (
                          <span className="text-green-500 text-xs uppercase">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2 justify-end">
                        {user.userType === 'caregiver' && !user.verified && !user.isBanned && (
                          <button
                            onClick={() => handleVerifyUser(user.uid)}
                            className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs hover:bg-green-900 border border-green-800 transition-colors"
                          >
                            Force Verify
                          </button>
                        )}
                        {!user.isBanned && (
                          <button
                            onClick={() => handleBanUser(user.uid)}
                            className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs hover:bg-red-900 border border-red-800 flex items-center transition-colors"
                          >
                            <Ban className="w-3 h-3 mr-1" /> Ban
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No users found. Try seeding the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="overflow-x-auto max-h-[400px] border border-slate-700 rounded-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-700 text-slate-400 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-800">
                {jobs.length > 0 ? jobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-bold text-white">{job.title}</td>
                    <td className="px-4 py-3">{job.clientName}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {job.location}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${job.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'
                        }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">No jobs posted.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="bg-slate-900">
            <TicketManager onShowToast={(msg, type) => {
              setLogs(prev => [{
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                event: msg,
                type: type === 'success' ? 'success' : type === 'error' ? 'warning' : 'info'
              }, ...prev]);
            }} />
          </div>
        )}
      </div>

      {/* Backend Control Panel */}
      <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Backend Controls</h2>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Manage your Google Cloud Firestore instance directly from here.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className={`
                flex items-center px-4 py-2 rounded-lg font-medium transition-all
                ${seedStatus === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/50'
                }
                ${isSeeding ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSeeding && !seedDataExists ? (
                <span className="flex items-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Deploying...</span>
              ) : seedStatus === 'success' ? (
                <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> Data Deployed</span>
              ) : (
                <span className="flex items-center"><Database className="w-4 h-4 mr-2" /> Deploy Seed Data</span>
              )}
            </button>

            {seedDataExists && (
              <button
                onClick={handleClearSeedData}
                disabled={isSeeding}
                className="flex items-center px-4 py-2 rounded-lg font-medium transition-all bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30"
              >
                {isSeeding ? (
                  <span className="flex items-center"><div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-2"></div> Clearing...</span>
                ) : (
                  <span className="flex items-center"><Trash2 className="w-4 h-4 mr-2" /> Clear All Seed Data</span>
                )}
              </button>
            )}

            {seedStatus === 'error' && (
              <span className="text-red-400 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" /> Deployment Failed
              </span>
            )}
          </div>
          
          <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded border border-slate-700">
            <p className="mb-1"><strong>What gets created:</strong></p>
            <p>12 Caregivers • 6 Clients • 10 Job Posts • 20 Appointments • 25 Reviews • 8 Support Tickets • 15 Notifications</p>
            <p className="mt-2 text-slate-500">All dummy data is tagged and can be completely removed with the "Clear All Seed Data" button.</p>
          </div>
        </div>
      </div>

      {/* Logs Terminal */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-lg">
            <Terminal className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">System Events</h1>
            <p className="text-xs text-slate-500">Live AI Logic Stream</p>
          </div>
        </div>
        <div className="flex items-center text-xs text-green-400">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live
        </div>
      </div>

      <div className="space-y-2 font-mono text-sm">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 p-3 rounded hover:bg-slate-800 transition-colors border-l-2 border-transparent hover:border-slate-600">
            <span className="text-slate-500 whitespace-nowrap">{log.timestamp}</span>
            <span className={`
               ${log.type === 'warning' ? 'text-orange-400' :
                log.type === 'success' ? 'text-green-400' : 'text-slate-300'}
             `}>
              {log.type === 'warning' && '[WARN] '}
              {log.type === 'success' && '[OK] '}
              {log.event}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
