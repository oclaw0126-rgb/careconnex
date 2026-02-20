import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { Badge } from '../ui/Badge';

interface CaregiverScheduleProps {
   appointments: Appointment[];
}

export const CaregiverSchedule: React.FC<CaregiverScheduleProps> = ({ appointments }) => {
   const [currentDate, setCurrentDate] = useState(new Date());
   const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);

   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

   const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      return { days, firstDay };
   };

   const { days, firstDay } = getDaysInMonth(currentDate);
   const daysArray = Array.from({ length: days }, (_, i) => i + 1);
   const blanksArray = Array.from({ length: firstDay }, (_, i) => i);

   const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
   const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

   // Filter for confirmed appointments only for the calendar visualization
   const confirmedAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed' || a.status === 'in-progress');

   const getAppointmentsForDate = (dateStr: string) => {
      return confirmedAppointments.filter(a => a.isoDate === dateStr);
   };

   const selectedDateAppointments = getAppointmentsForDate(selectedDay);

   return (
      <div className="grid md:grid-cols-3 gap-8 mb-24 animate-slide-in">
         {/* Calendar Widget */}
         <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-teal-600" /> My Schedule
               </h3>
               <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                  <div className="flex gap-1">
                     <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                     <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-slate-400">{d}</div>
               ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
               {blanksArray.map(b => <div key={`b-${b}`} className="h-10"></div>)}
               {daysArray.map(d => {
                  const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toISOString().split('T')[0];
                  const hasAppt = confirmedAppointments.some(a => a.isoDate === dateStr);
                  const isSelected = selectedDay === dateStr;

                  return (
                     <button
                        key={d}
                        onClick={() => setSelectedDay(dateStr)}
                        className={`
                         h-10 rounded-xl flex items-center justify-center text-sm font-medium relative transition-all
                         ${isSelected ? 'bg-orange-500 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'}
                      `}
                     >
                        {d}
                        {hasAppt && (
                           <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-teal-500'}`}></span>
                        )}
                     </button>
                  );
               })}
            </div>
         </div>

         {/* Daily Agenda */}
         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 h-fit">
            <h4 className="font-bold text-slate-900 mb-4">
               {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>

            {selectedDateAppointments.length > 0 ? (
               <div className="space-y-3">
                  {selectedDateAppointments.map(appt => (
                     <div key={appt.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                           <span className="font-bold text-slate-900">{appt.time}</span>
                           <Badge variant={appt.status === 'completed' ? 'neutral' : 'success'}>
                              {appt.status}
                           </Badge>
                        </div>
                        <div className="mb-2">
                           <p className="font-bold text-sm text-slate-800">{appt.clientName}</p>
                           <p className="text-xs text-slate-500">Personal Care Assistance</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-50 pt-2 mt-2">
                           <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> 3 hrs</span>
                           <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> 2.5 mi</span>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No shifts scheduled.</p>
               </div>
            )}
         </div>
      </div>
   );
};