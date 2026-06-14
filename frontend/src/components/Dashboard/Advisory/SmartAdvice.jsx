import React from 'react';
import { AlertCircle, Activity, HeartPulse, Quote } from 'lucide-react';

export default function SmartAdvice({ advice }) {
    // advice = [{ type, text }]

    const getIcon = (type) => {
        switch (type) {
            case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'medical': return <HeartPulse className="w-5 h-5 text-blue-500" />;
            case 'activity': return <Activity className="w-5 h-5 text-purple-500" />;
            default: return <Quote className="w-5 h-5 text-emerald-500" />;
        }
    };

    const getBg = (type) => {
        switch (type) {
            case 'critical': return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30';
            case 'warning': return 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30';
            case 'medical': return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30';
            case 'activity': return 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30';
            default: return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30';
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Smart Recommendations</h3>
            {advice.map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border flex gap-3 items-start ${getBg(item.type)}`}>
                    <div className="shrink-0 mt-0.5">{getIcon(item.type)}</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {item.text}
                    </p>
                </div>
            ))}
        </div>
    );
}
