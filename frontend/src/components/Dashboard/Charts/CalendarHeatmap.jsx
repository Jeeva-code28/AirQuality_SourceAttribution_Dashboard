import React from 'react';
import { getAQILevel } from '../../../services/api';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarHeatmap({ data, loading }) {
    if (loading || !data) {
        return (
            <div className="col-span-12 lg:col-span-6 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-xl animate-pulse h-[350px]">
                <div className="h-8 bg-slate-800 rounded w-1/3 mb-6"></div>
                <div className="h-full bg-slate-800 rounded"></div>
            </div>
        );
    }

    const daily = data.daily || {};

    // Logic: Show exactly 4 weeks (rows), ending with the current week.
    // Alignment: Mon - Sun.

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Monday of the current week
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() - daysSinceMonday);

    // Start date = 3 weeks before current week's Monday
    const startDate = new Date(currentWeekMonday);
    startDate.setDate(currentWeekMonday.getDate() - 21); // 21 days ago was 3 weeks ago

    const weeks = [];
    const weekCount = 4;

    for (let w = 0; w < weekCount; w++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (w * 7));

        const currentWeek = [];

        for (let d = 0; d < 7; d++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + d);

            const isFuture = dayDate > today;
            const dateStr = dayDate.toISOString().split('T')[0];

            // Find AQI based on date string
            let aqi = null;
            if (daily.time && daily.us_aqi_max) {
                const idx = daily.time.indexOf(dateStr);
                if (idx !== -1) aqi = daily.us_aqi_max[idx];
            }

            let hexColor = '#e2e8f0'; // Default
            if (!isFuture) {
                if (aqi === null) hexColor = '#cbd5e1'; // No data
                else if (aqi <= 50) hexColor = '#10b981';
                else if (aqi <= 100) hexColor = '#fdd64b';
                else if (aqi <= 150) hexColor = '#f97316';
                else if (aqi <= 200) hexColor = '#ef4444';
                else if (aqi <= 300) hexColor = '#a855f7';
                else hexColor = '#7f1d1d';
            } else {
                hexColor = 'transparent';
            }

            currentWeek.push({
                date: dateStr,
                aqi: aqi,
                color: hexColor,
                empty: isFuture,
                dayLabel: days[d] // Mon, Tue...
            });
        }
        weeks.push(currentWeek);
    }

    // Ensure we have at least some weeks to display
    if (weeks.length === 0) return null;

    return (
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl transition-colors duration-300">
            <div className="mb-6">
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Air Quality Calendar</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Daily AQI heatmap (Last 4 Weeks)</p>
            </div>

            <div className="flex flex-col gap-2">
                {/* Days Header */}
                <div className="grid grid-cols-8 gap-2 mb-2">
                    <div></div> {/* Empty for Week label */}
                    {days.map(day => (
                        <div key={day} className="text-xs text-slate-500 dark:text-slate-500 text-center font-medium">{day}</div>
                    ))}
                </div>

                {/* Weeks Rows */}
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-8 gap-3">
                        <div className="text-xs text-slate-500 dark:text-slate-500 flex items-center">Week {weekIndex + 1}</div>
                        {week.map((day, dayIndex) => (
                            <div
                                key={dayIndex}
                                className={`aspect-square rounded-lg shadow-sm relative group ${day.empty ? 'opacity-0' : 'hover:opacity-80 cursor-pointer'}`}
                                style={{ backgroundColor: day.color }}
                            >
                                {!day.empty && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                        {new Date(day.date).toLocaleDateString()} - AQI: {day.aqi}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
                <span className="text-xs text-slate-500">Less</span>

                <div className="flex gap-1.5">
                    <div className="w-6 h-6 rounded bg-[#10b981]" title="Good"></div>
                    <div className="w-6 h-6 rounded bg-[#fdd64b]" title="Moderate"></div>
                    <div className="w-6 h-6 rounded bg-[#f97316]" title="Poor"></div>
                    <div className="w-6 h-6 rounded bg-[#ef4444]" title="Unhealthy"></div>
                    <div className="w-6 h-6 rounded bg-[#a855f7]" title="Severe"></div>
                    <div className="w-6 h-6 rounded bg-[#7f1d1d]" title="Hazardous"></div>
                </div>

                <span className="text-xs text-slate-500">More</span>
            </div>
        </div>
    );
}
