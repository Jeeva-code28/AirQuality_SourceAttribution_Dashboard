import React, { useState } from 'react';
import {
    Activity,
    Heart,
    Shield,
    AlertCircle,
    Info,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    BookOpen,
    Wind,
    UserCheck
} from 'lucide-react';
import { getAQILevel } from '../../../services/api';
import { HealthProfileProvider } from '../../../context/HealthProfileContext';
import HealthHub from './HealthHub';

export default function HealthAdvisory({ data, loading }) {
    const [showPersonalProfile, setShowPersonalProfile] = useState(false);
    const [activeEducationTab, setActiveEducationTab] = useState('PM2.5');

    if (loading || !data || !data.current) {
        return (
            <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl mb-8 animate-pulse min-h-[300px]">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const { us_aqi, pm2_5, pm10, nitrogen_dioxide, sulphur_dioxide, ozone, carbon_monoxide } = data.current;
    const aqiLevel = getAQILevel(us_aqi);

    // Proportionate, evidence-based recommendations
    let exerciseAdvice = "";
    let exerciseStatus = "Permissible";
    let exerciseColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

    let sensitiveAdvice = "";
    let maskAdvice = "";

    if (us_aqi <= 50) {
        exerciseStatus = "Ideal";
        exerciseAdvice = "Conditions are pristine for outdoor runs, cycling, school sports, and prolonged exercise.";
        sensitiveAdvice = "Air quality is favorable. No restrictions for individuals with asthma or respiratory history.";
        maskAdvice = "No respiratory protection required for outdoor activities.";
    } else if (us_aqi <= 100) {
        exerciseStatus = "Permissible";
        exerciseAdvice = "Normal outdoor exercise is safe for healthy adults. Schedule intense workouts during early morning.";
        sensitiveAdvice = "Individuals with acute asthma should keep rescue inhalers accessible during prolonged workouts.";
        maskAdvice = "Optional for general public; sensitive groups may consider lightweight masks along heavy traffic corridors.";
    } else if (us_aqi <= 150) {
        exerciseStatus = "Moderate Caution";
        exerciseColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
        exerciseAdvice = "Limit high-intensity outdoor running. Transition strenuous training indoors if throat scratchiness occurs.";
        sensitiveAdvice = "Children, elderly individuals, and pregnant women should avoid prolonged heavy outdoor exertion.";
        maskAdvice = "Recommended: Well-fitted N95/FFP2 mask when commuting near arterial roads.";
    } else if (us_aqi <= 200) {
        exerciseStatus = "Avoid Heavy Exertion";
        exerciseColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
        exerciseAdvice = "Avoid outdoor jogging or cycling. Healthy individuals should shift aerobic sessions indoors.";
        sensitiveAdvice = "High risk for asthma and COPD patients. Remain indoors with air filtration activated.";
        maskAdvice = "Essential: N95/KN95 respirator required for any essential outdoor transit.";
    } else {
        exerciseStatus = "Strictly Avoid";
        exerciseColor = "text-red-500 bg-red-500/10 border-red-500/20";
        exerciseAdvice = "All outdoor physical activity should be suspended. Keep windows tightly sealed.";
        sensitiveAdvice = "Severe health warning. Sensitive groups should stay in HEPA-purified indoor environments.";
        maskAdvice = "Critical: High-efficiency respirator (N99/FFP3) mandatory if outdoors.";
    }

    // Explanations of why the advisory is displayed
    const dominantPollutant = (pm2_5 && pm2_5 > 25) ? "PM2.5" : "PM10";
    const thresholdReason = `This advisory is active because current AQI is ${us_aqi} (${aqiLevel.label}), primarily influenced by fine particulate concentration (${dominantPollutant}: ${Math.round(pm2_5 || 28)} µg/m³) against WHO 24-hour guidelines.`;

    const pollutantEducation = {
        'PM2.5': {
            title: "Fine Particulate Matter (PM2.5)",
            size: "Diameter < 2.5 micrometers (~30x smaller than human hair)",
            sources: "Combustion engine exhaust, power plants, biomass burning, industrial smoke",
            impact: "Can penetrate deep into the alveolar sacs of lungs and enter the bloodstream, triggering vascular and pulmonary strain.",
            current: `${Math.round(pm2_5 || 28)} µg/m³`,
            whoLimit: "15 µg/m³ (24h standard)"
        },
        'PM10': {
            title: "Coarse Dust Particles (PM10)",
            size: "Diameter < 10 micrometers",
            sources: "Road dust suspension, construction sites, unpaved surfaces, windblown soil",
            impact: "Irritates upper respiratory tract, eyes, and nasal passages, exacerbating asthma and allergic rhinitis.",
            current: `${Math.round(pm10 || 29)} µg/m³`,
            whoLimit: "45 µg/m³ (24h standard)"
        },
        'NO2': {
            title: "Nitrogen Dioxide (NO2)",
            size: "Combustion gas",
            sources: "High-temperature vehicular combustion (diesel & petrol), thermal generation",
            impact: "Corrosive to airway epithelium, increases bronchial reactivity and susceptibility to viral infections.",
            current: `${Math.round(nitrogen_dioxide || 24)} µg/m³`,
            whoLimit: "25 µg/m³ (24h standard)"
        },
        'SO2': {
            title: "Sulphur Dioxide (SO2)",
            size: "Acid precursor gas",
            sources: "Industrial fuel burning, coal plants, diesel heavy haulers",
            impact: "Triggers bronchoconstriction in asthmatics within 10 minutes of exposure.",
            current: `${Math.round(sulphur_dioxide || 14)} µg/m³`,
            whoLimit: "40 µg/m³ (24h standard)"
        },
        'O3': {
            title: "Ground-Level Ozone (O3)",
            size: "Secondary photochemical gas",
            sources: "Sunlight reaction between vehicular NOx and VOC vapors",
            impact: "Causes chest tightness, reduces lung capacity, and damages lung tissue during sunny afternoons.",
            current: `${Math.round(ozone || 35)} µg/m³`,
            whoLimit: "100 µg/m³ (8h standard)"
        },
        'CO': {
            title: "Carbon Monoxide (CO)",
            size: "Colorless toxic gas",
            sources: "Incomplete vehicular fuel combustion, congested slow traffic",
            impact: "Binds strongly to hemoglobin, reducing systemic oxygen transport to the brain and heart.",
            current: `${Math.round(carbon_monoxide || 420)} µg/m³`,
            whoLimit: "4000 µg/m³ (24h standard)"
        }
    };

    return (
        <section className="bg-white dark:bg-[#1e293b]/70 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 shadow-xl mb-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <Activity className="w-4 h-4" />
                        <span>Public Health Guidance & Action Plan</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                        Evidence-Based Daily Recommendations
                    </h2>
                </div>

                <button
                    onClick={() => setShowPersonalProfile(!showPersonalProfile)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
                >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{showPersonalProfile ? "Hide Personal Profile" : "Personalize for My Health"}</span>
                </button>
            </div>

            {/* Optional Personalized Health Intelligence Form/Hub */}
            {showPersonalProfile && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <HealthProfileProvider>
                        <HealthHub data={data} />
                    </HealthProfileProvider>
                </div>
            )}

            {/* 3 Pillar Daily Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Outdoor Exercise */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outdoor Exercise</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${exerciseColor}`}>
                                {exerciseStatus}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {exerciseAdvice}
                        </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        🏃 Best hours: 06:00 - 08:30 AM before road traffic peaks.
                    </div>
                </div>

                {/* 2. Sensitive Groups */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sensitive Groups</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                Precautionary
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {sensitiveAdvice}
                        </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        👶 Prioritize children, elderly, and respiratory patients.
                    </div>
                </div>

                {/* 3. Masks & Indoor Air */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Protective Measures</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                Action
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {maskAdvice}
                        </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        🪟 Keep street-facing windows shut during rush hours.
                    </div>
                </div>
            </div>

            {/* Why This Advisory is Displayed */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <Info className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-100">Why this guidance is displayed: </strong>
                    {thresholdReason}
                </div>
            </div>

            {/* Interactive Pollutant Educational Guide */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                        Educational Guide: Understanding Individual Pollutants
                    </h3>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.keys(pollutantEducation).map((pollutant) => (
                        <button
                            key={pollutant}
                            onClick={() => setActiveEducationTab(pollutant)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeEducationTab === pollutant
                                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {pollutant}
                        </button>
                    ))}
                </div>

                {/* Educational Content Card */}
                {pollutantEducation[activeEducationTab] && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                {pollutantEducation[activeEducationTab].title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs">
                                <div>
                                    <span className="text-slate-400">Current Level: </span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {pollutantEducation[activeEducationTab].current}
                                    </span>
                                </div>
                                <div className="text-slate-400">
                                    WHO Benchmark: {pollutantEducation[activeEducationTab].whoLimit}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Physical Scale</span>
                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                    {pollutantEducation[activeEducationTab].size}
                                </span>
                            </div>
                            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Primary Sources</span>
                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                    {pollutantEducation[activeEducationTab].sources}
                                </span>
                            </div>
                            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Health Exposure</span>
                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                    {pollutantEducation[activeEducationTab].impact}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Public Health Links & Medical Disclaimer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                    <a
                        href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors"
                    >
                        <span>WHO Global Air Guidelines</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                        href="https://cpcb.nic.in/air-pollution/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors"
                    >
                        <span>CPCB National Standards</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    ⚠️ Guidance is evidence-based and educational; does not constitute medical diagnosis.
                </div>
            </div>
        </section>
    );
}
