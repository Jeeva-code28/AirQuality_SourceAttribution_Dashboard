import React, { useState, useEffect } from 'react';
import {
    Wind,
    Eye,
    EyeOff,
    Loader2,
    AlertCircle,
    X,
    Shield,
    HelpCircle,
    FileText,
    Building2,
    Users
} from 'lucide-react';
import { authenticateAuthority } from '../../../services/authService';
import CitizenAuthPage from '../../citizen/CitizenAuthPage';

export default function WelcomeLandingPage({
    onSelectPortal,
    onLoginAuthority,
    onLoginCitizen,
    initialTab = 'citizen',
    sessionExpired = false
}) {
    // Read from URL query param if present
    const [activePortal, setActivePortal] = useState(() => {
        const search = new URLSearchParams(window.location.search);
        const authParam = search.get('auth');
        const portalParam = search.get('portal');
        if (authParam === 'authority' || portalParam === 'authority') return 'authority';
        if (authParam === 'citizen' || portalParam === 'citizen') return 'citizen';
        return initialTab || 'citizen';
    });

    // Authority Sign In state
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeModal, setActiveModal] = useState(null); // 'forgot' | 'support' | 'privacy' | 'accessibility' | null

    useEffect(() => {
        // If sessionExpired prop changes, switch to authority view so user sees the message
        if (sessionExpired) {
            setActivePortal('authority');
        }
    }, [sessionExpired]);

    const handleAuthoritySubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!identifier.trim()) {
            setErrorMessage('Please enter your Official Officer ID or registered work email.');
            return;
        }

        if (!password) {
            setErrorMessage('Please enter your password.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await authenticateAuthority(identifier, password);

            if (result.success && result.user) {
                setPassword('');
                if (onLoginAuthority) {
                    onLoginAuthority(result.user);
                } else if (onSelectPortal) {
                    onSelectPortal('authority');
                }
            } else {
                setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.');
            }
        } catch {
            setErrorMessage('Unable to connect to authorization service. Please check your network connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans selection:bg-cyan-500/30">
            {/* Ambient background glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-cyan-950/20 rounded-full blur-[150px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-[500px] flex flex-col items-center">
                {/* ======================================================== */}
                {/* TWO BARS: Government Authority vs Citizen Portal Switcher */}
                {/* ======================================================== */}
                <div
                    role="tablist"
                    aria-label="Portal Selection"
                    className="w-full mb-6 bg-[#090d16] border border-slate-800 p-1.5 rounded-2xl shadow-xl flex gap-1.5 backdrop-blur-md"
                >
                    {/* BAR 1: Citizen Portal */}
                    <button
                        type="button"
                        role="tab"
                        id="portal-tab-citizen"
                        aria-selected={activePortal === 'citizen'}
                        aria-controls="portal-panel-citizen"
                        onClick={() => {
                            setActivePortal('citizen');
                            setErrorMessage('');
                        }}
                        className={`flex-1 py-3 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200 select-none ${
                            activePortal === 'citizen'
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                    >
                        <Users className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">Citizen Portal</span>
                    </button>

                    {/* BAR 2: Government Authority */}
                    <button
                        type="button"
                        role="tab"
                        id="portal-tab-authority"
                        aria-selected={activePortal === 'authority'}
                        aria-controls="portal-panel-authority"
                        onClick={() => {
                            setActivePortal('authority');
                            setErrorMessage('');
                        }}
                        className={`flex-1 py-3 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200 select-none ${
                            activePortal === 'authority'
                                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-md shadow-black/40'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                    >
                        <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">Government Authority</span>
                    </button>
                </div>

                {/* ======================================================== */}
                {/* PORTAL VIEW 1: CITIZEN AUTHENTICATION (Sign In / Sign Up) */}
                {/* ======================================================== */}
                {activePortal === 'citizen' && (
                    <div
                        id="portal-panel-citizen"
                        role="tabpanel"
                        aria-labelledby="portal-tab-citizen"
                        className="w-full animate-fadeIn"
                    >
                        <CitizenAuthPage
                            onExploreGuest={() => onSelectPortal && onSelectPortal('citizen')}
                            onLoginSuccess={(user) => {
                                if (onLoginCitizen) onLoginCitizen(user);
                                else if (onSelectPortal) onSelectPortal('citizen');
                            }}
                        />
                    </div>
                )}

                {/* ======================================================== */}
                {/* PORTAL VIEW 2: GOVERNMENT AUTHORITY SIGN IN               */}
                {/* ======================================================== */}
                {activePortal === 'authority' && (
                    <main
                        id="portal-panel-authority"
                        role="tabpanel"
                        aria-labelledby="portal-tab-authority"
                        className="w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 sm:p-8 md:p-9 shadow-2xl shadow-black/80 animate-fadeIn"
                    >
                        {/* Brand Header */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center shadow-md shadow-cyan-600/30 flex-shrink-0">
                                    <Wind className="w-5 h-5 text-white" aria-hidden="true" />
                                </div>
                                <div>
                                    <div className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                                        BreatheLens
                                    </div>
                                    <div className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 mt-0.5">
                                        ENVIRONMENTAL MONITORING & INTELLIGENCE
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0">
                                <span className="inline-block px-3 py-1 bg-[#111827] border border-slate-700/80 text-slate-300 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase rounded-full">
                                    AUTHORITY PORTAL
                                </span>
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="border-t border-slate-800/80 my-6" />

                        {/* Section Title */}
                        <div className="text-center space-y-1 mb-6">
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Authority Sign In
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-400">
                                Secure access for authorized environmental monitoring personnel
                            </p>
                        </div>

                        {/* Session Expired Notice */}
                        {sessionExpired && !errorMessage && (
                            <div
                                role="status"
                                className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5"
                            >
                                <Shield className="w-4 h-4 flex-shrink-0 text-amber-400" />
                                <span>Your authority session has expired. Please sign in again to continue.</span>
                            </div>
                        )}

                        {/* Error Banner */}
                        {errorMessage && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                                <span className="leading-relaxed">{errorMessage}</span>
                            </div>
                        )}

                        {/* Authentication Form */}
                        <form onSubmit={handleAuthoritySubmit} className="space-y-4" noValidate>
                            {/* Identifier Field */}
                            <div>
                                <label
                                    htmlFor="officer-identifier"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Official Officer ID or Work Email
                                </label>
                                <input
                                    id="officer-identifier"
                                    name="identifier"
                                    type="text"
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    spellCheck="false"
                                    disabled={isLoading}
                                    value={identifier}
                                    onChange={(e) => {
                                        setIdentifier(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                    placeholder="Enter your registered credentials"
                                    className="w-full bg-[#060b14] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                                />
                            </div>

                            {/* Password Field */}
                            <div>
                                <label
                                    htmlFor="officer-password"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="officer-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (errorMessage) setErrorMessage('');
                                        }}
                                        placeholder="Enter your password"
                                        className="w-full bg-[#060b14] border border-slate-700/80 rounded-lg px-3.5 py-2.5 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                                        ) : (
                                            <Eye className="w-4 h-4" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Sub-row: Restriction & Recovery */}
                            <div className="flex items-center justify-between text-xs pt-0.5">
                                <span className="text-slate-400 select-none">
                                    Authorized personnel only
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal('forgot')}
                                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium focus:outline-none focus:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                                        <span>Verifying credentials...</span>
                                    </>
                                ) : (
                                    <span>Sign In Securely</span>
                                )}
                            </button>
                        </form>

                        {/* Security Advisory Notice */}
                        <p className="text-[11px] sm:text-xs text-slate-400 text-center mt-5 leading-normal">
                            Access is subject to identity verification and assigned permissions.
                        </p>

                        {/* Supporting Links */}
                        <div className="flex items-center justify-center gap-3 text-[11px] sm:text-xs text-slate-400 mt-2">
                            <button
                                type="button"
                                onClick={() => setActiveModal('support')}
                                className="hover:text-slate-300 transition-colors focus:outline-none focus:underline"
                            >
                                Support
                            </button>
                            <span aria-hidden="true">·</span>
                            <button
                                type="button"
                                onClick={() => setActiveModal('privacy')}
                                className="hover:text-slate-300 transition-colors focus:outline-none focus:underline"
                            >
                                Privacy
                            </button>
                            <span aria-hidden="true">·</span>
                            <button
                                type="button"
                                onClick={() => setActiveModal('accessibility')}
                                className="hover:text-slate-300 transition-colors focus:outline-none focus:underline"
                            >
                                Accessibility
                            </button>
                        </div>
                    </main>
                )}
            </div>

            {/* Accessible Institutional Information Modal */}
            {activeModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setActiveModal(null)}
                >
                    <div
                        className="bg-[#0b1220] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveModal(null)}
                            aria-label="Close dialog"
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Modal: Forgot Password */}
                        {activeModal === 'forgot' && (
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h2 id="modal-title" className="text-base font-bold text-white">
                                    Authority Credential Recovery
                                </h2>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    For security governance, password resets for authorized environmental monitoring officers
                                    must be processed through your agency&apos;s designated System Administrator or Central
                                    Pollution Control IT Desk.
                                </p>
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                                    Please reference your assigned Officer ID and station location code when contacting your
                                    department coordinator.
                                </div>
                            </div>
                        )}

                        {/* Modal: Support */}
                        {activeModal === 'support' && (
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                    <HelpCircle className="w-5 h-5" />
                                </div>
                                <h2 id="modal-title" className="text-base font-bold text-white">
                                    System Support & Operations
                                </h2>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Technical support is available for telemetry calibration, station data synchronization,
                                    and predictive simulation services.
                                </p>
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                                    <div>Platform Version: <span className="text-slate-200">BreatheLens v2.0 Enterprise</span></div>
                                    <div>Telemetry Providers: <span className="text-slate-200">Open-Meteo, CPCB, NASA FIRMS</span></div>
                                    <div>Operations Desk: <span className="text-slate-200">Internal Agency Dispatch</span></div>
                                </div>
                            </div>
                        )}

                        {/* Modal: Privacy */}
                        {activeModal === 'privacy' && (
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h2 id="modal-title" className="text-base font-bold text-white">
                                    Data Privacy & Governance Notice
                                </h2>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    All telemetry metrics, pollution source attribution estimates, and intervention policies
                                    are governed under public environmental monitoring protocols.
                                </p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Officer sessions are recorded for security audit logs. No plaintext passwords or personal
                                    browsing data are transmitted or retained on unencrypted channels.
                                </p>
                            </div>
                        )}

                        {/* Modal: Accessibility */}
                        {activeModal === 'accessibility' && (
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h2 id="modal-title" className="text-base font-bold text-white">
                                    Accessibility Statement
                                </h2>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    BreatheLens is developed to comply with WCAG 2.1 Level AA accessibility standards,
                                    including high-contrast text ratios, full keyboard operability, explicit ARIA form labelling,
                                    and reduced motion support.
                                </p>
                            </div>
                        )}

                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
