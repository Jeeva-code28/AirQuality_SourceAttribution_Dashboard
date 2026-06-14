import React, { useState } from 'react';
import { User, Activity, Heart, Shield } from 'lucide-react';
import { useHealthProfile } from '../../../context/HealthProfileContext';

export default function ProfileSetup() {
    const { saveProfile } = useHealthProfile();
    const [formData, setFormData] = useState({
        age: '',
        gender: 'Male',
        activityType: 'Indoor',
        sensitivity: 'Moderate',
        conditions: []
    });

    const conditionsList = ['Asthma', 'COPD', 'Heart Disease', 'Pregnancy', 'None'];

    const toggleCondition = (condition) => {
        setFormData(prev => {
            if (condition === 'None') return { ...prev, conditions: ['None'] };
            const newConditions = prev.conditions.includes(condition)
                ? prev.conditions.filter(c => c !== condition)
                : [...prev.conditions.filter(c => c !== 'None'), condition];
            return { ...prev, conditions: newConditions };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveProfile(formData);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl max-w-2xl mx-auto border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
                Review Your Health Profile
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
                We need a few details to calculate your personalized air pollution risk.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Age & Gender */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Age</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input
                                type="number"
                                required
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Years"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Activity Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Activity</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['Indoor', 'Outdoor Worker', 'Jogger'].map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, activityType: type })}
                                className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${formData.activityType === type
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sensitivity */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sensitivity to Pollution</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['Low', 'Moderate', 'High'].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setFormData({ ...formData, sensitivity: level })}
                                className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${formData.sensitivity === level
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conditions */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medical Conditions</label>
                    <div className="flex flex-wrap gap-2">
                        {conditionsList.map(condition => (
                            <button
                                key={condition}
                                type="button"
                                onClick={() => toggleCondition(condition)}
                                className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-all ${formData.conditions.includes(condition)
                                        ? 'bg-red-500 text-white border-red-500'
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {condition}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                >
                    Save Health Profile
                </button>
            </form>
        </div>
    );
}
