import React from 'react';
import { Wind, Droplets, Cloud, CloudRain, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

// Evaluates pollutant concentration against standard health thresholds
function getPollutantStatus(name, value) {
    if (value === "N/A" || typeof value !== 'number' || isNaN(value)) {
        return { label: 'No Data', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-700/50', badge: 'bg-slate-800 text-slate-400' };
    }

    let isSafe = false;
    let isModerate = false;
    let isWarning = false;

    switch (name) {
        case 'PM2.5':
            isSafe = value <= 30;
            isModerate = value <= 60;
            isWarning = value <= 120;
            break;
        case 'PM10':
            isSafe = value <= 50;
            isModerate = value <= 100;
            isWarning = value <= 250;
            break;
        case 'NO2':
            isSafe = value <= 40;
            isModerate = value <= 80;
            isWarning = value <= 180;
            break;
        case 'SO2':
            isSafe = value <= 40;
            isModerate = value <= 80;
            isWarning = value <= 380;
            break;
        case 'CO':
            isSafe = value <= 1000;
            isModerate = value <= 2000;
            isWarning = value <= 10000;
            break;
        case 'O3':
            isSafe = value <= 50;
            isModerate = value <= 100;
            isWarning = value <= 168;
            break;
        default:
            isSafe = true;
    }

    if (isSafe) {
        return { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300' };
    } else if (isModerate) {
        return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', badge: 'bg-amber-500/20 text-amber-300' };
    } else if (isWarning) {
        return { label: 'Unhealthy', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-300' };
    } else {
        return { label: 'Hazardous', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-300' };
    }
}

export default function PollutantGrid({ data, loading }) {
    if (loading || !data) {
        return (
            <div className="mb-8 animate-pulse" aria-busy="true" aria-label="Loading pollutant concentrations">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50"></div>
                    ))}
                </div>
            </div>
        );
    }

    const { pm2_5, pm10, carbon_monoxide, nitrogen_dioxide, sulphur_dioxide, ozone } = data.current || {};

    const pollutants = [
        { name: 'PM2.5', rawValue: pm2_5, unit: 'µg/m³', icon: Wind, desc: 'Fine particles' },
        { name: 'PM10', rawValue: pm10, unit: 'µg/m³', icon: Wind, desc: 'Respirable dust' },
        { name: 'NO2', rawValue: nitrogen_dioxide, unit: 'µg/m³', icon: Zap, desc: 'Nitrogen Dioxide' },
        { name: 'SO2', rawValue: sulphur_dioxide, unit: 'µg/m³', icon: CloudRain, desc: 'Sulphur Dioxide' },
        { name: 'CO', rawValue: carbon_monoxide, unit: 'µg/m³', icon: Cloud, desc: 'Carbon Monoxide' },
        { name: 'O3', rawValue: ozone, unit: 'µg/m³', icon: Droplets, desc: 'Ground Ozone' },
    ];

    return (
        <section className="mb-8" aria-labelledby="pollutants-heading">
            <div className="flex items-center justify-between mb-4">
                <h2 id="pollutants-heading" className="text-xl font-bold text-slate-900 dark:text-white">
                    Major Air Pollutants
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    Live readings calibrated against WHO safety thresholds
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {pollutants.map((item) => {
                    const validVal = (typeof item.rawValue === 'number' && item.rawValue >= 0) ? Math.round(item.rawValue) : "N/A";
                    const status = getPollutantStatus(item.name, item.rawValue);

                    return (
                        <div
                            key={item.name}
                            className={`bg-white dark:bg-[#1e293b]/60 backdrop-blur-md border ${status.border} rounded-2xl p-4 hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.name}</span>
                                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${status.bg} ${status.color} group-hover:scale-110 transition-transform`} aria-hidden="true">
                                    <item.icon className="w-4 h-4" />
                                </div>
                            </div>

                            <div className="mt-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{validVal}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.unit}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.badge}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
