import React from 'react';
import Header from './Header';

export default function MainLayout({ children, onLocationSelect }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30 transition-colors duration-300">
            <Header onLocationSelect={onLocationSelect} />
            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
