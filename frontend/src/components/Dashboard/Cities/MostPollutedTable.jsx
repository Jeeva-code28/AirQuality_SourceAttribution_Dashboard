import React from 'react';
import { MapPin, Star } from 'lucide-react';

export default function MostPollutedTable({ cities, loading }) {
    if (loading) {
        return (
            <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-xl mb-8 animate-pulse">
                <div className="h-8 bg-slate-800 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-slate-800 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl mb-8 transition-colors duration-300">
            <div className="mb-6">
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Most Polluted Cities</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Top major cities sorted by AQI levels</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-500 text-xs border-b border-slate-200 dark:border-slate-700/50">
                            <th className="py-3 px-4 w-16">Rank</th>
                            <th className="py-3 px-4">City</th>
                            <th className="py-3 px-4">State</th>
                            <th className="py-3 px-4">AQI</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Follow</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {cities.map((city, index) => (
                            <tr key={city.name} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${index === 3 ? 'bg-slate-50/50 dark:bg-slate-800/40' : ''}`}>
                                <td className="py-4 px-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-900 ${index < 3 ? 'bg-[#ff9b57]' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                        <span className="font-bold text-slate-900 dark:text-slate-200">{city.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-slate-500 dark:text-slate-400">{city.state}</td>
                                <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">{city.displayAqi ?? city.aqi}</td>
                                <td className="py-4 px-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${city.color} ${city.bg} bg-opacity-10`}>
                                        {city.status}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button className="text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                                        <Star className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
