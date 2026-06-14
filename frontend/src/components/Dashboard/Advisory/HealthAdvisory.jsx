import React from 'react';
import { HealthProfileProvider } from '../../../context/HealthProfileContext';
import HealthHub from './HealthHub';

export default function HealthAdvisory({ data, loading }) {
    if (loading || !data) {
        return (
            <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-xl mb-8 animate-pulse h-64">
                <div className="h-8 bg-slate-800 rounded w-1/4 mb-6"></div>
                <div className="h-32 bg-slate-800 rounded mb-6"></div>
            </div>
        );
    }

    return (
        <HealthProfileProvider>
            <HealthHub data={data} />
        </HealthProfileProvider>
    );
}
