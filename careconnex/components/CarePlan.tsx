
import React, { useState, useEffect } from 'react';
import { Pill, Phone, Clock, FileText, ChevronLeft, Plus, Trash2, Save, Loader2, AlertCircle, CheckSquare, Square, User } from 'lucide-react';
import { Button } from './ui/Button';
import { ViewType, AddToastFunction, CarePlan as CarePlanType, Medication, EmergencyContact, RoutineTask } from '../types';
import { dbService, authService } from '../services/api';

interface CarePlanProps {
  onNavigate: (view: ViewType) => void;
  onShowToast: AddToastFunction;
  targetUserId?: string | null; // If provided, we are viewing another user (e.g. Caregiver viewing Client)
}

export const CarePlan: React.FC<CarePlanProps> = ({ onNavigate, onShowToast, targetUserId }) => {
  const [activeTab, setActiveTab] = useState<'meds' | 'contacts' | 'routine'>('meds');
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<CarePlanType>({
    medications: [],
    emergencyContacts: [],
    dailyRoutine: []
  });

  const currentUser = authService.getCurrentUser();
  const isReadOnly = !!targetUserId && targetUserId !== currentUser?.uid; // If viewing someone else, it's read-only (mostly)
  const currentPlanId = targetUserId || currentUser?.uid || 'mock-user';

  // Use Real-time Subscription
  useEffect(() => {
    const unsubscribe = dbService.subscribeToCarePlan(currentPlanId, (updatedPlan) => {
        setPlan(updatedPlan);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [currentPlanId]);

  const handleSave = async () => {
    if (isReadOnly) return;
    if (currentPlanId) {
        await dbService.updateCarePlan(currentPlanId, plan);
        onShowToast("Care Binder updated successfully", 'success');
    } else {
        onShowToast("Changes simulated (Demo Mode)", 'success');
    }
  };

  const handleTaskToggle = async (index: number) => {
      // Caregivers can toggle tasks
      const newPlan = await dbService.toggleRoutineTask(currentPlanId, index, plan);
      // Local state update handled by subscription usually, but optimistic update is good UX
      setPlan(newPlan);
      onShowToast(newPlan.dailyRoutine[index].isCompleted ? "Task completed" : "Task unchecked", "info");
  };

  const addMedication = () => {
      const newMed: Medication = { id: Date.now().toString(), name: 'New Med', dosage: '', frequency: 'Morning' };
      setPlan(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
  };

  const addContact = () => {
      const newContact: EmergencyContact = { id: Date.now().toString(), name: 'New Contact', relation: '', phone: '', isPrimary: false };
      setPlan(prev => ({ ...prev, emergencyContacts: [...prev.emergencyContacts, newContact] }));
  };

  const updateItem = (section: keyof CarePlanType, index: number, field: string, value: any) => {
      if (isReadOnly) return;
      setPlan(prev => {
          const list = [...(prev[section] as any[])];
          list[index] = { ...list[index], [field]: value };
          return { ...prev, [section]: list };
      });
  };

  const deleteItem = (section: keyof CarePlanType, index: number) => {
      if (isReadOnly) return;
      setPlan(prev => {
          const list = [...(prev[section] as any[])];
          list.splice(index, 1);
          return { ...prev, [section]: list };
      });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-teal-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 animate-slide-in">
       {/* Header */}
       <div className="flex items-center justify-between mb-6">
         <div className="flex items-center">
            <button 
                onClick={() => onNavigate('client')} // Navigates back to generic dashboard, App.tsx handles correct routing context
                className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
               <h1 className="text-2xl font-bold text-slate-900 ml-2">Digital Care Binder</h1>
               {isReadOnly && (
                   <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center w-fit mt-1">
                       <User className="w-3 h-3 mr-1" /> Client View Mode
                   </span>
               )}
            </div>
         </div>
         {!isReadOnly && (
            <Button size="sm" onClick={handleSave} className="flex items-center">
                <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
         )}
       </div>

       {/* Tabs */}
       <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('meds')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'meds' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Medications
          </button>
          <button 
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'contacts' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Contacts
          </button>
          <button 
            onClick={() => setActiveTab('routine')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'routine' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Daily Routine
          </button>
       </div>

       {/* Content */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
          
          {/* MEDICATIONS TAB */}
          {activeTab === 'meds' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 flex items-center">
                          <Pill className="w-5 h-5 mr-2 text-blue-500" /> Medication List
                      </h3>
                      {!isReadOnly && (
                        <button onClick={addMedication} className="text-sm text-teal-600 font-medium hover:underline flex items-center">
                            <Plus className="w-4 h-4 mr-1" /> Add Med
                        </button>
                      )}
                  </div>
                  {plan.medications.map((med, idx) => (
                      <div key={med.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative group">
                          <div className="grid grid-cols-2 gap-3 mb-2">
                              <input 
                                  disabled={isReadOnly}
                                  className={`bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold ${isReadOnly ? 'text-slate-700' : ''}`}
                                  value={med.name}
                                  onChange={(e) => updateItem('medications', idx, 'name', e.target.value)}
                                  placeholder="Medication Name"
                              />
                              <input 
                                  disabled={isReadOnly}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                                  value={med.dosage}
                                  onChange={(e) => updateItem('medications', idx, 'dosage', e.target.value)}
                                  placeholder="Dosage"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <select 
                                  disabled={isReadOnly}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-600"
                                  value={med.frequency}
                                  onChange={(e) => updateItem('medications', idx, 'frequency', e.target.value)}
                              >
                                  <option>Morning</option>
                                  <option>Afternoon</option>
                                  <option>Evening</option>
                                  <option>Before Bed</option>
                                  <option>As Needed</option>
                              </select>
                              <input 
                                  disabled={isReadOnly}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                                  value={med.notes || ''}
                                  onChange={(e) => updateItem('medications', idx, 'notes', e.target.value)}
                                  placeholder="Notes"
                              />
                          </div>
                          {!isReadOnly && (
                            <button 
                                onClick={() => deleteItem('medications', idx)}
                                className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                          )}
                      </div>
                  ))}
                  {plan.medications.length === 0 && (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                          No medications listed.
                      </div>
                  )}
              </div>
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 flex items-center">
                          <Phone className="w-5 h-5 mr-2 text-green-500" /> Emergency Contacts
                      </h3>
                      {!isReadOnly && (
                        <button onClick={addContact} className="text-sm text-teal-600 font-medium hover:underline flex items-center">
                            <Plus className="w-4 h-4 mr-1" /> Add Contact
                        </button>
                      )}
                  </div>
                  {plan.emergencyContacts.map((contact, idx) => (
                      <div key={contact.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative group">
                          <div className="flex items-center gap-3 mb-2">
                              <input 
                                  disabled={isReadOnly}
                                  className="flex-grow bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold"
                                  value={contact.name}
                                  onChange={(e) => updateItem('emergencyContacts', idx, 'name', e.target.value)}
                                  placeholder="Contact Name"
                              />
                              <label className="flex items-center text-xs text-slate-500 cursor-pointer">
                                  <input 
                                      disabled={isReadOnly}
                                      type="checkbox" 
                                      checked={contact.isPrimary}
                                      onChange={(e) => updateItem('emergencyContacts', idx, 'isPrimary', e.target.checked)}
                                      className="mr-1 text-teal-600 rounded"
                                  /> Primary
                              </label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <input 
                                  disabled={isReadOnly}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                                  value={contact.relation}
                                  onChange={(e) => updateItem('emergencyContacts', idx, 'relation', e.target.value)}
                                  placeholder="Relation"
                              />
                              <input 
                                  disabled={isReadOnly}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-sm"
                                  value={contact.phone}
                                  onChange={(e) => updateItem('emergencyContacts', idx, 'phone', e.target.value)}
                                  placeholder="Phone Number"
                              />
                          </div>
                          {!isReadOnly && (
                            <button 
                                onClick={() => deleteItem('emergencyContacts', idx)}
                                className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                          )}
                      </div>
                  ))}
              </div>
          )}

          {/* ROUTINE TAB */}
          {activeTab === 'routine' && (
              <div className="space-y-4">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 flex items-center">
                          <Clock className="w-5 h-5 mr-2 text-orange-500" /> Daily Routine
                      </h3>
                      {isReadOnly ? (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded font-bold">Interactive Checklist</span>
                      ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Edit Mode</span>
                      )}
                  </div>
                  {plan.dailyRoutine.map((task, idx) => (
                      <div key={task.id} className={`flex items-start p-3 rounded-xl border transition-all ${
                          task.isCompleted ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'
                      }`}>
                          <div className="bg-white border border-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-600 mr-3 min-w-[60px] text-center mt-1">
                              {task.time}
                          </div>
                          <div className="flex-grow">
                              <p className={`text-sm font-medium ${task.isCompleted ? 'text-green-800 line-through' : 'text-slate-800'}`}>
                                  {task.description}
                              </p>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400">{task.category}</span>
                          </div>
                          
                          {/* Interactive Checkbox */}
                          <button 
                             onClick={() => handleTaskToggle(idx)}
                             className={`ml-2 p-1 rounded transition-colors ${
                                 task.isCompleted ? 'text-green-600 hover:text-green-700' : 'text-slate-300 hover:text-slate-400'
                             }`}
                          >
                              {task.isCompleted ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                          </button>
                      </div>
                  ))}
                  {plan.dailyRoutine.length === 0 && (
                      <div className="flex items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-xl">
                          <AlertCircle className="w-4 h-4 mr-2" /> No routine tasks configured.
                      </div>
                  )}
              </div>
          )}

       </div>
    </div>
  );
};
