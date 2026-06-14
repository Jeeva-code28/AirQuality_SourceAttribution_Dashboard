import React from 'react';
import { Wind, Droplets, Cloud, CloudRain, Zap } from 'lucide-react';

export default function PollutantGrid({ data, loading }) {
    if (loading || !data) {
        return (
            <div className="mb-8 animate-pulse">
                <h2 className="text-xl font-bold text-white mb-4">Major Air Pollutants</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-800 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const { pm2_5, pm10, carbon_monoxide, nitrogen_dioxide, sulphur_dioxide, ozone } = data.current;

    const pollutants = [
        { name: 'PM2.5', value: pm2_5 > 0 ? pm2_5 : "N/A", unit: 'µg/m³', icon: Wind, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { name: 'PM10', value: pm10 > 0 ? pm10 : "N/A", unit: 'µg/m³', icon: Wind, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { name: 'CO', value: carbon_monoxide > 0 ? carbon_monoxide : "N/A", unit: 'µg/m³', icon: Cloud, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { name: 'SO2', value: sulphur_dioxide > 0 ? sulphur_dioxide : "N/A", unit: 'µg/m³', icon: CloudRain, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { name: 'NO2', value: nitrogen_dioxide > 0 ? nitrogen_dioxide : "N/A", unit: 'µg/m³', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { name: 'O3', value: ozone > 0 ? ozone : "N/A", unit: 'µg/m³', icon: Droplets, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    ];

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Major Air Pollutants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {pollutants.map((item) => (
                    <div key={item.name} className="bg-white dark:bg-[#1e293b]/50 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group shadow-sm dark:shadow-none">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">{item.name}</span>
                            <div className={`p-2 rounded-lg ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{item.value}</div>
                            <div className="text-xs text-slate-500">{item.unit}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
