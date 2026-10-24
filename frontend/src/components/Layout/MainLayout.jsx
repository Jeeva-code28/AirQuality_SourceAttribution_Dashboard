import React from 'react';
import Header from './Header';

export default function MainLayout({ children, onLocationSelect, onSwitchPortal, activeTab, onSelectTab }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30 transition-colors duration-300 flex flex-col justify-between">
            <div>
                <Header
                    onLocationSelect={onLocationSelect}
                    onSwitchPortal={onSwitchPortal}
                    activeTab={activeTab}
                    onSelectTab={onSelectTab}
                />
                <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>
            <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                <p>BreatheLens AI-Powered Pollution Source Attribution & Forecasting Platform • Real-time Open-Meteo & OSRM Engine</p>
            </footer>
        </div>
    );
}
