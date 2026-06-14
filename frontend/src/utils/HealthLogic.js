/**
 * Health Intelligence Logic Engine
 * Calculates Personal Health Risk Index (PHRI) and generates dynamic advice.
 */

// Risk Scoring Constants
const RISK_SCORES = {
    ASTHMA: 2,
    COPD: 2,
    HEART_DISEASE: 2,
    PREGNANCY: 2,
    ELDERLY: 1, // Age > 60
    CHILD: 1,   // Age < 10
    OUTDOOR_WORKER: 2,
    HIGH_SENSITIVITY: 1
};

export const calculatePHRI = (aqi, profile) => {
    if (!aqi || !profile) return { score: 0, level: 'Low', color: 'green' };

    let baseRisk = 0;
    // Base Risk from AQI
    if (aqi <= 50) baseRisk = 0;
    else if (aqi <= 100) baseRisk = 1;
    else if (aqi <= 150) baseRisk = 2;
    else if (aqi <= 200) baseRisk = 3;
    else if (aqi <= 300) baseRisk = 4;
    else baseRisk = 5;

    let addedRisk = 0;

    // Condition-based Risk
    if (profile.conditions.includes('Asthma')) addedRisk += RISK_SCORES.ASTHMA;
    if (profile.conditions.includes('COPD')) addedRisk += RISK_SCORES.COPD;
    if (profile.conditions.includes('Heart Disease')) addedRisk += RISK_SCORES.HEART_DISEASE;
    if (profile.conditions.includes('Pregnancy')) addedRisk += RISK_SCORES.PREGNANCY;

    // Age-based Risk
    const age = parseInt(profile.age, 10);
    if (age > 60) addedRisk += RISK_SCORES.ELDERLY;
    else if (age < 10) addedRisk += RISK_SCORES.CHILD;

    // Activity/Profile Risk
    if (profile.activityType === 'Outdoor Worker') addedRisk += RISK_SCORES.OUTDOOR_WORKER;
    if (profile.sensitivity === 'High') addedRisk += RISK_SCORES.HIGH_SENSITIVITY;

    const totalScore = baseRisk + addedRisk;

    // Classification
    let level = 'Low';
    let color = 'text-emerald-500';
    let bg = 'bg-emerald-500';

    if (totalScore >= 5) {
        level = 'High';
        color = 'text-red-500';
        bg = 'bg-red-500';
    } else if (totalScore >= 3) {
        level = 'Moderate';
        color = 'text-yellow-500';
        bg = 'bg-yellow-500';
    }

    return { score: totalScore, level, color, bg, baseRisk, addedRisk };
};

export const generateAdvice = (aqi, profile, currentData = {}) => {
    const advice = [];
    const conditions = profile.conditions || [];

    // --- 1. POLLUTANT-SPECIFIC MEDICAL INSIGHTS (The "Legit Data") ---
    // We check which specific pollutant is driving the toxicity

    // PM2.5 (Fine Particulate Matter)
    if (currentData.pm2_5 > 60) {
        advice.push({
            type: 'danger',
            text: "🔴 [MEDICAL ALERT] High PM2.5 detected. These fine particles can penetrate the lung barrier and enter the bloodstream, causing systemic inflammation."
        });
        if (conditions.includes('Heart Disease')) {
            advice.push({
                type: 'medical',
                text: "CRITICAL: PM2.5 increases risk of plaque rupture and arrhythmias. Avoid ALL outdoor exertion."
            });
        }
        if (conditions.includes('Pregnancy')) {
            advice.push({
                type: 'medical',
                text: "PM2.5 exposure is linked to fetal growth restriction. Use an N95 mask to filter these particles effectively."
            });
        }
    }

    // PM10 (Coarse Particulate Matter)
    if (currentData.pm10 > 100) {
        advice.push({
            type: 'warning',
            text: "Elevated PM10 levels. These larger particles irritate the upper respiratory tract, causing coughing and eye irritation."
        });
        if (conditions.includes('Asthma') || conditions.includes('COPD')) {
            advice.push({
                type: 'medical',
                text: "PM10 can trigger bronchospasms. Keep rescue inhaler accessible and rinse nasal passages after exposure."
            });
        }
    }

    // NO2 (Nitrogen Dioxide) - Traffic Related
    if (currentData.nitrogen_dioxide > 40) {
        advice.push({
            type: 'warning',
            text: "High NO2 levels detected (likely traffic-related). NO2 inflames the lining of the lungs and reduces immunity to lung infections."
        });
        if (conditions.includes('Asthma') && profile.age < 18) {
            advice.push({
                type: 'medical',
                text: "Pediatric Asthma Warning: NO2 is a potent trigger for attacks in children. Avoid playing near busy roads."
            });
        }
    }

    // O3 (Ground Level Ozone) - Afternoon sun
    if (currentData.ozone > 100) {
        advice.push({
            type: 'warning',
            text: "Ozone Alert: High oxidative stress on lung tissue. Unlike particles, masks do NOT filter ozone."
        });
        if (profile.activityType === 'Jogger' || profile.activityType === 'Outdoor Worker') {
            advice.push({
                type: 'activity',
                text: "Shift activity to early morning. Ozone peaks in mid-afternoon sunshine and aggressively damages alveoli during deep breathing."
            });
        }
    }

    // --- 2. GENERAL AQI & CONDITION LOGIC ---

    // Asthma Specific
    if (conditions.includes('Asthma')) {
        if (aqi > 150) advice.push({ type: 'medical', text: "Airway inflammation risk is high. Prophylactic use of controller medication may be advised (consult doctor)." });
    }

    // Outdoor Worker Specific
    if (profile.activityType === 'Outdoor Worker') {
        if (aqi > 150) {
            advice.push({ type: 'activity', text: "Occupational Hazard: Continuous exposure requires N95/P100 respirators. Surgical masks provide NO protection against PM2.5." });
        }
    }

    // Default Good Air
    if (advice.length === 0) {
        if (aqi <= 50) advice.push({ type: 'general', text: "Air quality is pristine. Ideal conditions for outdoor cardiopulmonary exercise." });
        else advice.push({ type: 'general', text: "Air quality is acceptable. No specific medical interventions required." });
    }

    return advice;
};

export const getMaskRecommendation = (aqi) => {
    if (aqi > 250) return { type: 'Avoid Outdoors', icon: '⛔' };
    if (aqi > 150) return { type: 'N95 Mask', icon: '😷' };
    if (aqi > 100) return { type: 'Surgical Mask', icon: '😷' };
    return { type: 'None Needed', icon: '😊' };
};

export const calculateExposureBudget = (riskLevel) => {
    if (riskLevel === 'High') return "0 - 30 mins";
    if (riskLevel === 'Moderate') return "60 mins";
    return "Unlimited";
};
