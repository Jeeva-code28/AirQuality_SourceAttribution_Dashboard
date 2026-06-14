import React, { useState } from 'react';
import { ClipboardList, Plus, History } from 'lucide-react';
import { useHealthProfile } from '../../../context/HealthProfileContext';

export default function SymptomTracker() {
    const { logSymptom, symptoms } = useHealthProfile();
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [intensity, setIntensity] = useState('Mild');

    const symptomsList = ['Breathlessness', 'Cough', 'Eye Irritation', 'Headache', 'Fatigue', 'Wheezing'];

    const toggleSymptom = (s) => {
        setSelectedSymptoms(prev =>
            prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
        );
    };

    const handleLog = () => {
        if (selectedSymptoms.length === 0) return;

        logSymptom({
            date: new Date().toISOString(),
            symptoms: selectedSymptoms,
            intensity
        });

        setSelectedSymptoms([]);
        setIntensity('Mild');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 h-full">
            <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Symptom Tracker</h3>
            </div>

            {/* Input Section */}
            <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {symptomsList.map(s => (
                        <button
                            key={s}
                            onClick={() => toggleSymptom(s)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedSymptoms.includes(s)
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <select
                        value={intensity}
                        onChange={(e) => setIntensity(e.target.value)}
                        className="text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {['Mild', 'Moderate', 'Severe'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>

                    <button
                        onClick={handleLog}
                        disabled={selectedSymptoms.length === 0}
                        className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                    >
                        <Plus className="w-3 h-3" /> Log
                    </button>
                </div>
            </div>

            {/* History Section */}
            <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <History className="w-3 h-3" /> Recent Logs
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    {symptoms.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No symptoms logged yet.</p>
                    ) : (
                        symptoms.slice(0, 5).map((log, i) => (
                            <div key={i} className="text-xs p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between mb-1">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {new Date(log.date).toLocaleDateString()}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.intensity === 'Severe' ? 'bg-red-100 text-red-600' :
                                            log.intensity === 'Moderate' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        {log.intensity}
                                    </span>
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {log.symptoms.join(', ')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
