import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download } from "lucide-react";
import moment from "moment";

export default function PrintableCalendar({ 
  events, 
  viewMode, 
  currentDate, 
  organization,
  trigger 
}) {
  const [showPreview, setShowPreview] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const generateMonthView = () => {
    const daysInMonth = moment(currentDate).daysInMonth();
    const firstDay = moment(currentDate).startOf('month').day();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const getEventsForDay = (day) => {
      if (!day) return [];
      const dateStr = moment(currentDate).date(day).format('YYYY-MM-DD');
      return events.filter(event => {
        const eventDate = moment(event.start_date).format('YYYY-MM-DD');
        return eventDate === dateStr;
      });
    };

    return (
      <div className="grid grid-cols-7 border">
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
          <div key={day} className="p-2 text-center font-bold border-b bg-gray-100">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          return (
            <div key={index} className="min-h-[100px] border-r border-b p-2">
              {day && (
                <>
                  <div className="font-bold text-sm mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayEvents.map((event, idx) => (
                      <div key={idx} className="text-xs bg-gray-100 p-1 rounded">
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-gray-600">
                          {moment(event.start_date).format('h:mm A')}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const generateAgendaView = () => {
    const sortedEvents = [...events]
      .filter(event => moment(event.start_date).isSameOrAfter(moment(), 'day'))
      .sort((a, b) => moment(a.start_date).unix() - moment(b.start_date).unix());

    const groupedEvents = sortedEvents.reduce((acc, event) => {
      const dateKey = moment(event.start_date).format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
          <div key={dateKey} className="border-b pb-4">
            <h3 className="font-bold text-lg mb-2">
              {moment(dateKey).format('dddd, MMMM D, YYYY')}
            </h3>
            <div className="space-y-2">
              {dayEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 bg-gray-50 p-3 rounded">
                  <div className="text-sm font-bold text-gray-600 w-20 flex-shrink-0">
                    {moment(event.start_date).format('h:mm A')}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{event.title}</div>
                    {event.description && (
                      <div className="text-xs text-gray-600 mt-1">{event.description}</div>
                    )}
                    {event.location && (
                      <div className="text-xs text-gray-600 mt-1">📍 {event.location}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const PrintContent = () => (
    <div className="print-content">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6 pb-4 border-b-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {organization?.organization_name || 'ProposalIQ.ai'}
              </h1>
              <p className="text-gray-600 mt-1">
                {viewMode === 'month' && moment(currentDate).format('MMMM YYYY')}
                {viewMode === 'agenda' && 'Upcoming Events'}
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Generated: {moment().format('MMM D, YYYY h:mm A')}</p>
              <p>Total Events: {events.length}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'month' && generateMonthView()}
        {viewMode === 'agenda' && generateAgendaView()}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
          <p>ProposalIQ.ai - AI-Powered Proposal Management</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {React.cloneElement(trigger, {
        onClick: () => setShowPreview(true)
      })}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Print Preview</span>
              <div className="flex gap-2 no-print">
                <Button onClick={handlePrint} size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[70vh] border rounded-lg bg-white">
            <PrintContent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}