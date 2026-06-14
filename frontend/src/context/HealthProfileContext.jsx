import React, { createContext, useContext, useState, useEffect } from 'react';

const HealthProfileContext = createContext();

export const useHealthProfile = () => {
    const context = useContext(HealthProfileContext);
    if (!context) {
        throw new Error("useHealthProfile must be used within a HealthProfileProvider");
    }
    return context;
};

export const HealthProfileProvider = ({ children }) => {
    // User Profile State
    const [profile, setProfile] = useState(() => {
        try {
            const saved = localStorage.getItem('aqi_health_profile');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Failed to load profile", e);
            return null;
        }
    });

    // Symptom Log State
    const [symptoms, setSymptoms] = useState(() => {
        try {
            const saved = localStorage.getItem('aqi_symptom_log');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Save Profile
    const saveProfile = (newProfile) => {
        setProfile(newProfile);
        localStorage.setItem('aqi_health_profile', JSON.stringify(newProfile));
    };

    // Add Symptom Entry
    const logSymptom = (entry) => {
        const updatedLog = [entry, ...symptoms]; // Prepend new entry
        setSymptoms(updatedLog);
        localStorage.setItem('aqi_symptom_log', JSON.stringify(updatedLog));
    };

    // Clear Data
    const clearData = () => {
        setProfile(null);
        setSymptoms([]);
        localStorage.removeItem('aqi_health_profile');
        localStorage.removeItem('aqi_symptom_log');
    };

    return (
        <HealthProfileContext.Provider value={{ profile, saveProfile, symptoms, logSymptom, clearData }}>
            {children}
        </HealthProfileContext.Provider>
    );
};
