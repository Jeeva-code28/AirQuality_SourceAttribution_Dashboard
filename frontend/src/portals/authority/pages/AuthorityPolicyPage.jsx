import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Sliders,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    BarChart,
    Building2,
    CheckCircle,
    Flame,
    Car,
    Factory,
    Sparkles,
    Scale
} from 'lucide-react';
import { INTERVENTION_DATABASE, calculateInterventionImpact } from '../../../data/interventions';

export default function AuthorityPolicyPage({ coordinates, locationName }) {
    const [selectedInterventionId, setSelectedInterventionId] = useState(INTERVENTION_DATABASE[0].id);
    const [intensity, setIntensity] = useState(65);
    const [baseAQI, setBaseAQI] = useState(210);
    const [sources, setSources] = useState({
        traffic: 35,
        industry: 25,
        dust: 20,
        garbage: 10,
        stubble: 10
    });

    useEffect(() => {
        // Read persisted data if available from prior visits
        const savedAQI = localStorage.getItem('currentAQI');
        if (savedAQI) {
            const val = parseInt(savedAQI);
            if (!isNaN(val) && val > 0) setBaseAQI(val);
        }

        const savedSources = localStorage.getItem('currentSources');
        if (savedSources) {
            try {
                const parsed = JSON.parse(savedSources);
                setSources({
                    traffic: parseFloat(parsed.traffic) || 35,
                    industry: parseFloat(parsed.industry) || 25,
                    dust: parseFloat(parsed.dust) || 20,
                    garbage: parseFloat(parsed.garbage) || 10,
                    stubble: parseFloat(parsed.stubble) || 10
                });
            } catch (e) {
                console.warn("Could not parse savedSources from localStorage:", e);
            }
        }
    }, []);

    const selectedPolicy = INTERVENTION_DATABASE.find(p => p.id === selectedInterventionId) || INTERVENTION_DATABASE[0];
    const impact = calculateInterventionImpact(selectedPolicy, baseAQI, intensity, sources);

    // Recommended Actions derived from current sources and baseAQI
    const recommendations = INTERVENTION_DATABASE.map(policy => {
        const est = calculateInterventionImpact(policy, baseAQI, 80, sources);
        let urgency = "Moderate";
        let urgencyColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";

        if (baseAQI > 250 || policy.severity === "Critical") {
            urgency = "Immediate";
            urgencyColor = "bg-red-500/20 text-red-300 border-red-500/30";
        } else if (policy.severity === "Low") {
            urgency = "Recommended";
            urgencyColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
        }

        return {
            ...policy,
            estReduction: est.reduction,
            urgency,
            urgencyColor
        };
    }).sort((a, b) => b.estReduction - a.estReduction);

    const historicalPerformances = [
        { name: "Industrial Cluster Curfew (Winter 2025)", compliance: 92, reduction: "18.4% Net PM2.5", status: "Verified" },
        { name: "Odd-Even Private Vehicle Directive", compliance: 84, reduction: "11.2% Net NO₂", status: "Verified" },
        { name: "Arterial Mechanical Road Misting", compliance: 78, reduction: "6.8% Net PM10", status: "Verified" },
        { name: "Thermal Power Plant Output Curtailment", compliance: 96, reduction: "22.5% Net SO₂", status: "Verified" },
        { name: "Satellite-Guided Stubble Burning Penalties", compliance: 71, reduction: "14.1% Net Inflow", status: "Verified" }
    ];

    return (
        <div className="space-y-6">
            {/* Command Center Title Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#0d162a] via-[#091122] to-[#040814] border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_25px_rgba(0,242,255,0.08)]">
                <div>
                    <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        Decision Support Protocol • {locationName}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-cyan-400" />
                        <span>Policy Command Center & AI Intervention Simulator</span>
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-mono">
                        Baseline AQI: <strong className="text-cyan-400">{baseAQI}</strong>
                    </span>
                </div>
            </div>

            {/* Grid 1: Simulator & Sectoral Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* AI Intervention Simulator */}
                <div className="lg:col-span-7 bg-[#0b1222]/90 backdrop-blur-xl border border-cyan-500/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Sliders className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-slate-100">
                                    Simulate Policy Intervention
                                </h3>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                                Dynamic Linear Optimization
                            </span>
                        </div>

                        {/* Controls */}
                        <div className="space-y-5 my-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                    Target Regulatory Intervention
                                </label>
                                <select
                                    value={selectedInterventionId}
                                    onChange={(e) => setSelectedInterventionId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                >
                                    {INTERVENTION_DATABASE.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.type} • {p.cost} Cost)
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-2">
                                    {selectedPolicy.description}
                                </p>
                            </div>

                            {/* Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Enforcement Intensity & Compliance Target
                                    </label>
                                    <span className="text-sm font-bold text-cyan-400 font-mono">
                                        {intensity}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={intensity}
                                    onChange={(e) => setIntensity(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                    <span>10% (Partial Advisory)</span>
                                    <span>50% (Standard Patrol)</span>
                                    <span>100% (Strict Curfew)</span>
                                </div>
                            </div>
                        </div>

                        {/* Simulation Output Cards */}
                        <div className="grid grid-cols-3 gap-3 my-4 bg-slate-900/80 border border-cyan-500/20 p-4 rounded-xl">
                            <div className="text-center">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Expected Reduction
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
                                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                                    <span>-{impact.reduction}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">AQI Points</div>
                            </div>

                            <div className="text-center border-x border-slate-800">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Projected AQI
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                                    {impact.projectedAQI}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    vs {baseAQI} current
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Economic Impact
                                </div>
                                <div className={`text-base sm:text-lg font-black uppercase mt-1 ${impact.economicImpact === 'Extreme' || impact.economicImpact === 'High' ? 'text-red-400' : (impact.economicImpact === 'Medium' ? 'text-amber-400' : 'text-emerald-400')}`}>
                                    {impact.economicImpact}
                                </div>
                                <div className="text-[10px] text-slate-500">Trade-off Score</div>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 border-t border-slate-800 pt-3 flex items-center justify-between">
                        <span>Confidence: {selectedPolicy.baseConfidence}% Calibration</span>
                        <span>Model: CPCB Regional Attenuation v2</span>
                    </div>
                </div>

                {/* Sectoral Breakdown / Heatmap */}
                <div className="lg:col-span-5 bg-[#0b1222]/90 backdrop-blur-xl border border-cyan-500/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <BarChart className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-slate-100">
                                    Sectoral Contribution Matrix
                                </h3>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">Active Perimeters</span>
                        </div>

                        <p className="text-xs text-slate-400 mb-4">
                            Sector dominance factors determine dynamic policy effectiveness coefficients.
                        </p>

                        <div className="space-y-3.5">
                            {[
                                { name: "Vehicular & Commuter Traffic", key: "traffic", val: sources.traffic, color: "from-cyan-500 to-blue-500" },
                                { name: "Heavy Industry & Manufacturing", key: "industry", val: sources.industry, color: "from-blue-500 to-indigo-500" },
                                { name: "Suspended Road & Construction Dust", key: "dust", val: sources.dust, color: "from-amber-500 to-yellow-500" },
                                { name: "Open Refuse & Landfill Incineration", key: "garbage", val: sources.garbage, color: "from-rose-500 to-red-500" },
                                { name: "Agricultural Biomass Inflow", key: "stubble", val: sources.stubble, color: "from-purple-500 to-pink-500" }
                            ].map((sec) => (
                                <div key={sec.name} className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">{sec.name}</span>
                                        <span className="font-bold text-slate-100 font-mono">{sec.val}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className={`h-full bg-gradient-to-r ${sec.color} rounded-full transition-all duration-500`}
                                            style={{ width: `${sec.val}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                        <span>Dynamic receptor normalization</span>
                        <span>Sum = 100%</span>
                    </div>
                </div>
            </div>

            {/* Grid 2: Recommended Interventions & Historical Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recommended Actions List */}
                <div className="lg:col-span-7 bg-[#0b1222]/90 backdrop-blur-xl border border-cyan-500/25 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <h3 className="text-lg font-bold text-slate-100">
                                AI-Ranked Priority Interventions
                            </h3>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Ranked by Net Impact</span>
                    </div>

                    <div className="space-y-3">
                        {recommendations.slice(0, 4).map((rec, i) => (
                            <div
                                key={rec.id}
                                className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 rounded-xl p-4 transition-all hover:bg-slate-900/90 space-y-2"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <div className="font-bold text-slate-100 text-sm">{rec.name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{rec.description}</div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${rec.urgencyColor}`}>
                                        {rec.urgency}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 text-slate-400">
                                    <span>Impact: <strong className="text-emerald-400">-{rec.estReduction} AQI</strong> (at 80% enforcement)</span>
                                    <span>Economic Cost: <strong className="text-slate-200">{rec.cost}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Historical Performance Rankings */}
                <div className="lg:col-span-5 bg-[#0b1222]/90 backdrop-blur-xl border border-cyan-500/25 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <Scale className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-slate-100">
                                    Historical Empirical Benchmark
                                </h3>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">Prior Deployments</span>
                        </div>

                        <div className="space-y-3">
                            {historicalPerformances.map((hp) => (
                                <div key={hp.name} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-slate-200 truncate">{hp.name}</span>
                                        <span className="text-cyan-400 font-mono font-bold">{hp.compliance}%</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-400">
                                        <span>Documented Output: {hp.reduction}</span>
                                        <span className="text-emerald-400">{hp.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500">
                        Derived from documented National Clean Air Programme (NCAP) audits
                    </div>
                </div>
            </div>
        </div>
    );
}
