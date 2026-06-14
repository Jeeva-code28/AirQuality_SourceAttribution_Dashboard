import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../../context/ThemeContext';

// Helper to get color based on AQI value (matching api.js logic)
const getBarColor = (value) => {
    if (value <= 50) return '#00ddd0'; // Good
    if (value <= 100) return '#fdd64b'; // Moderate
    if (value <= 150) return '#ff9b57'; // Unhealthy for Sensitive
    if (value <= 200) return '#fe6a69'; // Unhealthy
    if (value <= 300) return '#a155b9'; // Very Unhealthy
    return '#b91c1c'; // Hazardous
};

export default function AnnualTrendChart({ data, loading }) {
    if (loading || !data) {
        return (
            <div className="col-span-12 lg:col-span-6 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-xl animate-pulse h-[350px]">
                <div className="h-8 bg-slate-800 rounded w-1/3 mb-6"></div>
                <div className="h-full bg-slate-800 rounded"></div>
            </div>
        );
    }

    // Process daily data to get monthly averages
    const daily = data.daily || {};
    const monthlyData = {};

    try {
        if (daily.time && daily.us_aqi_max) {
            daily.time.forEach((dateStr, index) => {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return;

                const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g., "Feb 2026"

                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = { sum: 0, count: 0 };
                }
                const val = daily.us_aqi_max[index];
                // Only count valid non-null values
                if (val !== null && val !== undefined) {
                    monthlyData[monthYear].sum += val;
                    monthlyData[monthYear].count += 1;
                }
            });
        }
    } catch (err) {
        console.error("Error processing AnnualTrendChart data:", err);
    }

    // Generate last 6 months keys explicitly (e.g., "Feb 2026", "Jan 2026"...)
    const last6Months = [];
    const today = new Date();
    // Start from current month
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        last6Months.push(key);
    }

    const finalChartData = last6Months.map(key => {
        const entry = monthlyData[key];
        const val = (entry && entry.count > 0) ? Math.round(entry.sum / entry.count) : 0;
        return {
            year: key, // Keep 'year' as dataKey for XAxis
            value: val
        };
    });

    const { theme } = useTheme();
    const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';

    return (
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl transition-colors duration-300">
            <div className="mb-6">
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">AQI Trends (Last 6 Months)</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Monthly average air quality index</p>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finalChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="year"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <YAxis
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                                color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                            }}
                            cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                            {finalChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center gap-4 justify-center mt-4">
                {/* Legend Items */}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#00ddd0]"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Good</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#fdd64b]"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff9b57]"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Sensitive</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#fe6a69]"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Unhealthy</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#a155b9]"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Very Unhealthy</span>
                </div>
            </div>
        </div>
    );
}
