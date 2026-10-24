import React, { useState } from 'react';
import {
    Wind,
    Eye,
    EyeOff,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import {
    authenticateCitizen,
    registerCitizen,
    requestCitizenPasswordReset
} from '../../services/authService';

export default function CitizenAuthPage({
    onLoginSuccess,
    onExploreGuest,
    initialMode = 'signin' // 'signin' | 'signup' | 'forgot'
}) {
    const [mode, setMode] = useState(initialMode); // 'signin' | 'signup' | 'forgot'
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleTabChange = (targetMode) => {
        setMode(targetMode);
        setErrorMessage('');
        setSuccessMessage('');
    };

    // Sign In handler
    const handleSignIn = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!email.trim()) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        if (!password) {
            setErrorMessage('Please enter your password.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await authenticateCitizen(email, password);
            if (result.success && result.user) {
                setPassword('');
                if (onLoginSuccess) {
                    onLoginSuccess(result.user);
                } else if (onExploreGuest) {
                    onExploreGuest();
                }
            } else {
                setErrorMessage(result.error || 'Invalid email or password. Please try again.');
            }
        } catch {
            setErrorMessage('Network connection error. Please verify your internet and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Sign Up handler
    const handleSignUp = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!fullName.trim()) {
            setErrorMessage('Please enter your full name.');
            return;
        }

        if (!email.trim()) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        if (!password) {
            setErrorMessage('Please create a password.');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters in length.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await registerCitizen(fullName, email, password);
            if (result.success && result.user) {
                setPassword('');
                if (onLoginSuccess) {
                    onLoginSuccess(result.user);
                } else if (onExploreGuest) {
                    onExploreGuest();
                }
            } else {
                setErrorMessage(result.error || 'Registration could not be completed. Please try again.');
            }
        } catch {
            setErrorMessage('Unable to reach authentication service. Please check your network.');
        } finally {
            setIsLoading(false);
        }
    };

    // Forgot Password handler
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!email.trim()) {
            setErrorMessage('Please enter your registered email address.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await requestCitizenPasswordReset(email);
            if (result.success) {
                setSuccessMessage(result.message);
            } else {
                setErrorMessage(result.error || 'Password recovery request failed.');
            }
        } catch {
            setErrorMessage('Network connection error. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[460px] mx-auto">
            {/* Main Citizen Auth Card */}
            <div className="bg-[#0b0f17] border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative text-slate-100">
                {/* BreatheLens Logo & Wind Badge */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#0891b2] flex items-center justify-center shadow-lg shadow-cyan-600/25 flex-shrink-0">
                        <Wind className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="text-xl font-bold tracking-tight text-white mt-3.5">
                        BreatheLens
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        Breathe better. Stay informed.
                    </div>
                </div>

                {/* Segmented Control Pill: [ Sign In ] | [ Create Account ] */}
                {mode !== 'forgot' && (
                    <div className="bg-[#141925] border border-slate-800/80 p-1 rounded-xl flex items-center mt-6 mb-6">
                        <button
                            type="button"
                            onClick={() => handleTabChange('signin')}
                            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center ${
                                mode === 'signin'
                                    ? 'bg-[#222b3d] text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange('signup')}
                            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center ${
                                mode === 'signup'
                                    ? 'bg-[#222b3d] text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Create Account
                        </button>
                    </div>
                )}

                {/* Global Error Banner */}
                {errorMessage && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                    >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                        <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                )}

                {/* Global Success Banner */}
                {successMessage && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                    >
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                        <span className="leading-relaxed">{successMessage}</span>
                    </div>
                )}

                {/* FLOW 1: SIGN IN */}
                {mode === 'signin' && (
                    <div>
                        <div className="mb-5">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                Welcome back
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                Sign in to access your saved locations and personalized air-quality updates.
                            </p>
                        </div>

                        <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                            {/* Email address */}
                            <div>
                                <label
                                    htmlFor="citizen-signin-email"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Email address
                                </label>
                                <input
                                    id="citizen-signin-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck="false"
                                    disabled={isLoading}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                    placeholder="you@example.com"
                                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="citizen-signin-password"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="citizen-signin-password"
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
                                        className="w-full bg-[#070b13] border border-slate-700/80 rounded-lg px-3.5 py-2.5 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
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

                            {/* Forgot Password link */}
                            <div className="flex justify-end pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('forgot')}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors focus:outline-none focus:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {/* Sign In Primary Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm rounded-lg transition-colors shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <span>Sign In</span>
                                )}
                            </button>
                        </form>

                        {/* Switch to Create Account */}
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => handleTabChange('signup')}
                                className="text-xs text-slate-300 hover:text-white transition-colors focus:outline-none focus:underline"
                            >
                                New to BreatheLens? <span className="text-cyan-400 font-medium">Create an account.</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* FLOW 2: CREATE ACCOUNT */}
                {mode === 'signup' && (
                    <div>
                        <div className="mb-5">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                Create your account
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                Personalize your air-quality experience and keep track of your favorite locations.
                            </p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                            {/* Full name */}
                            <div>
                                <label
                                    htmlFor="citizen-signup-name"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Full name
                                </label>
                                <input
                                    id="citizen-signup-name"
                                    name="fullName"
                                    type="text"
                                    autoComplete="name"
                                    disabled={isLoading}
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                    placeholder="Enter your name"
                                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                                />
                            </div>

                            {/* Email address */}
                            <div>
                                <label
                                    htmlFor="citizen-signup-email"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Email address
                                </label>
                                <input
                                    id="citizen-signup-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck="false"
                                    disabled={isLoading}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                    placeholder="you@example.com"
                                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                                />
                            </div>

                            {/* Create password */}
                            <div>
                                <label
                                    htmlFor="citizen-signup-password"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Create password
                                </label>
                                <div className="relative">
                                    <input
                                        id="citizen-signup-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (errorMessage) setErrorMessage('');
                                        }}
                                        placeholder="Create a strong password"
                                        className="w-full bg-[#070b13] border border-slate-700/80 rounded-lg px-3.5 py-2.5 pr-11 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
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

                            {/* Create Account Primary Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm rounded-lg transition-colors shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                                        <span>Creating account...</span>
                                    </>
                                ) : (
                                    <span>Create Account</span>
                                )}
                            </button>
                        </form>

                        {/* Switch to Sign In */}
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => handleTabChange('signin')}
                                className="text-xs text-slate-300 hover:text-white transition-colors focus:outline-none focus:underline"
                            >
                                Already have an account? <span className="text-cyan-400 font-medium">Sign in.</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* FLOW 3: FORGOT PASSWORD */}
                {mode === 'forgot' && (
                    <div className="mt-4">
                        <div className="mb-5">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                Reset your password
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                Enter your registered email address to receive password recovery instructions.
                            </p>
                        </div>

                        <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                            {/* Email address */}
                            <div>
                                <label
                                    htmlFor="citizen-forgot-email"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Email address
                                </label>
                                <input
                                    id="citizen-forgot-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck="false"
                                    disabled={isLoading}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errorMessage) setErrorMessage('');
                                    }}
                                    placeholder="you@example.com"
                                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-sm rounded-lg transition-colors shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                                        <span>Sending instructions...</span>
                                    </>
                                ) : (
                                    <span>Send Recovery Instructions</span>
                                )}
                            </button>

                            {/* Return to Sign In */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('signin')}
                                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors focus:outline-none focus:underline"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Sign In</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* GUEST ACCESS LINK */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                    <button
                        type="button"
                        onClick={onExploreGuest}
                        className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:underline"
                    >
                        <span>Explore as guest</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <p className="text-[10px] text-slate-500 mt-2">
                        View live air quality, trends, rankings & route advisories without an account.
                    </p>
                </div>

                {/* Illustrative Disclaimer */}
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-slate-500 leading-normal">
                        Illustrative design concept only. Authentication is not performed in this preview.
                    </p>
                </div>
            </div>
        </div>
    );
}
