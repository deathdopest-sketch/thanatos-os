import { useState } from 'react';
import {
  format as dateFmt,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export function CalendarApp() {
  const [view, setView] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(view)), end: endOfWeek(endOfMonth(view)) });
  return (
    <div className="calendar-app">
      <div className="cal-header">
        <button type="button" onClick={() => setView((d) => subMonths(d, 1))}><ChevronLeft size={16} /></button>
        <strong>{dateFmt(view, 'MMMM yyyy')}</strong>
        <button type="button" onClick={() => setView((d) => addMonths(d, 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="cal-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {days.map((day) => <div key={day.toISOString()} className={clsx('cal-day', !isSameMonth(day, view) && 'other-month', isToday(day) && 'today')}>{dateFmt(day, 'd')}</div>)}
      </div>
    </div>
  );
}
