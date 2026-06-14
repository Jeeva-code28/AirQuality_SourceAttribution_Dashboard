import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg shadow-lg">
                <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">{`${label}`}</p>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    AQI: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

export default function HistoricalAQIChart({ data, loading }) {
    const { theme } = useTheme();
    const [timeRange, setTimeRange] = useState('Today');

    if (loading || !data) {
        return (
            <div className="col-span-12 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-xl mb-8 animate-pulse h-[400px]">
                <div className="h-8 bg-slate-800 rounded w-1/4 mb-6"></div>
                <div className="h-full bg-slate-800 rounded"></div>
            </div>
        );
    }

    // Process data based on timeRange
    let chartData = [];
    const now = new Date();

    // Helper to format date
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    if (timeRange === '7d' || timeRange === '30d') {
        // Use DAILY data
        const daily = data.daily || {};
        if (daily.time && daily.us_aqi_max) {
            const daysToList = timeRange === '7d' ? 7 : 30;

            const combined = daily.time.map((t, i) => ({
                time: t,
                value: daily.us_aqi_max[i]
            })).filter(item => item.value !== null);

            // Strict Filter: Remove any future dates (predictions)
            // We only want up to TODAY.
            const todayStr = new Date().toISOString().split('T')[0];
            const pastOnly = combined.filter(item => item.time <= todayStr);

            // Sort by date descending to get latest past dates
            pastOnly.sort((a, b) => new Date(b.time) - new Date(a.time));

            // Deduplicate by time string
            const unique = [];
            const seen = new Set();
            for (const item of pastOnly) {
                if (!seen.has(item.time)) {
                    seen.add(item.time);
                    unique.push(item);
                }
            }

            // Take required days and reverse back to chronological
            const selected = unique.slice(0, daysToList).reverse();

            chartData = selected.map(item => ({
                time: formatDate(item.time),
                fullDate: item.time,
                value: item.value
            }));
        }
    } else {
        // Use HOURLY data for Today / 24h
        const hourly = data.hourly || {};
        if (hourly.time && hourly.us_aqi) {
            let combinedHourly = hourly.time.map((t, i) => ({
                time: t,
                value: hourly.us_aqi[i]
            })).filter(item => item.value !== null);

            // Sort chronologically
            combinedHourly.sort((a, b) => new Date(a.time) - new Date(b.time));

            // Deduplicate hourly
            const uniqueHourly = [];
            const seenHourly = new Set();
            for (const item of combinedHourly) {
                if (!seenHourly.has(item.time)) {
                    seenHourly.add(item.time);
                    uniqueHourly.push(item);
                }
            }

            let startTime;
            let endTime;

            if (timeRange === 'Today') {
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 00:00 today
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // End of today
            } else { // 24h
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                endTime = now;
            }

            // Filter by time range
            chartData = uniqueHourly.filter(item => {
                const t = new Date(item.time);
                return t >= startTime && t <= endTime;
            }).map(item => ({
                time: formatTime(item.time),
                fullDate: item.time,
                value: item.value
            }));
        }
    }

    const subtitleMap = {
        'Today': "Today's air quality (Hourly)",
        '24h': "Past 24 hours (Hourly)",
        '7d': "Past 7 days (Daily Average)",
        '30d': "Past 30 days (Daily Average)"
    };

    const displayedData = chartData;

    // Calculate min/max for Y-axis scaling
    const values = chartData.map(d => d.value).filter(v => v > 0);
    const maxAQI = values.length > 0 ? Math.max(...values) : 0;
    const minAQI = values.length > 0 ? Math.min(...values) : 0;

    const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';

    return (
        <div className="col-span-12 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl mb-8 transition-colors duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Historical AQI Data</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitleMap[timeRange]}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Max: {maxAQI}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        Min: {minAQI}
                    </span>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 cursor-pointer transition-colors"
                    >
                        <option value="Today">Today</option>
                        <option value="24h">Last 24h</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barCategoryGap={4}>
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                                fill: axisColor,
                                fontSize: 10,
                                angle: (timeRange === '30d' || timeRange === '7d') ? -45 : 0,
                                textAnchor: (timeRange === '30d' || timeRange === '7d') ? 'end' : 'middle',
                                dy: (timeRange === '30d' || timeRange === '7d') ? 5 : 0
                            }}
                            interval={(timeRange === '7d' || timeRange === '30d') ? 0 : 'preserveStartEnd'}
                            minTickGap={0} // Allow dense ticks for 30d
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 10 }}
                            domain={[0, 'auto']}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                            {displayedData.map((entry, index) => {
                                let color = '#10b981'; // Good
                                if (entry.value > 50) color = '#fdd64b'; // Moderate
                                if (entry.value > 100) color = '#f97316'; // Poor
                                if (entry.value > 150) color = '#ef4444'; // Unhealthy
                                if (entry.value > 200) color = '#a855f7'; // Severe
                                if (entry.value > 300) color = '#7f1d1d'; // Hazardous
                                return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
