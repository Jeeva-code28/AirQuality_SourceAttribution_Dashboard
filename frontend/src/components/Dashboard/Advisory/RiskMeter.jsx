import React from 'react';
import { Gauge } from 'lucide-react';

export default function RiskMeter({ risk }) {
    // risk = { score, level, color, bg, baseRisk, addedRisk }

    // Calculate percentage for gauge (Max score ~10)
    const percentage = Math.min((risk.score / 10) * 100, 100);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${risk.bg}`}></div>

            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Personal Health Risk</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Based on AQI & Profile</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${risk.bg} text-white`}>
                    {risk.level} Risk
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Visual Gauge */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-slate-200 dark:text-slate-700"
                        />
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                            className={`${risk.color} transition-all duration-1000 ease-out`}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-2xl font-bold ${risk.color}`}>{risk.score}</span>
                        <span className="text-[10px] text-slate-400">/ 10</span>
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">AQI Contribution</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">+{risk.baseRisk}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(risk.baseRisk / 10) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Profile Contribution</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">+{risk.addedRisk}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: `${(risk.addedRisk / 10) * 100}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
