import React from 'react';
import { useHealthProfile } from '../../../context/HealthProfileContext';
import ProfileSetup from './ProfileSetup';
import RiskMeter from './RiskMeter';
import SmartAdvice from './SmartAdvice';
import SymptomTracker from './SymptomTracker';
import { calculatePHRI, generateAdvice, getMaskRecommendation, calculateExposureBudget } from '../../../utils/HealthLogic';
import { RefreshCcw, Settings, LogOut } from 'lucide-react';

export default function HealthHub({ data }) {
    const { profile, clearData } = useHealthProfile();

    if (!profile) {
        return <ProfileSetup />;
    }

    const aqi = data?.current?.us_aqi || 0;

    // Calculate Logic
    const risk = calculatePHRI(aqi, profile);
    console.log("HealthHub Data:", data?.current); // DEBUG
    const advice = generateAdvice(aqi, profile, data?.current);
    console.log("Generated Advice:", advice); // DEBUG
    const mask = getMaskRecommendation(aqi);
    const exposureLimit = calculateExposureBudget(risk.level);

    return (
        <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl mb-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Health Intelligence</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        tailored for <span className="font-semibold text-emerald-600 dark:text-emerald-400">{profile.age}yo {profile.gender} • {profile.activityType}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={clearData}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        title="Reset Profile"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => window.location.href = '/index.html'}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-100 dark:border-red-900/30 font-semibold text-sm"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Col: Risk Meter & Masks */}
                <div className="lg:col-span-4 space-y-6">
                    <RiskMeter risk={risk} />

                    {/* Exposure Budget Card */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Exposure Budget</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Safe Outdoor Time</span>
                            <span className={`text-lg font-bold ${risk.level === 'High' ? 'text-red-500' : 'text-emerald-500'}`}>
                                {exposureLimit}
                            </span>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <span className="text-2xl">{mask.icon}</span>
                            <div>
                                <div className="text-xs text-slate-500">Recommended Mask</div>
                                <div className="font-bold text-slate-900 dark:text-white">{mask.type}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Col: Smart Advice */}
                <div className="lg:col-span-4">
                    <SmartAdvice advice={advice} />
                </div>

                {/* Right Col: Symptom Tracker */}
                <div className="lg:col-span-4">
                    <SymptomTracker />
                </div>
            </div>
        </div>
    );
}
