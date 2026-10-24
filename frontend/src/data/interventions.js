// Policy Interventions Database and Dynamic Simulation Engine
export const INTERVENTION_DATABASE = [
    {
        id: "traffic_odd_even",
        name: "Odd-Even Traffic Implementation",
        source: "traffic",
        effectiveness: 12, // Max 12% reduction of source contribution
        cost: "Medium",
        baseConfidence: 96,
        type: "Enforcement",
        severity: "Moderate",
        description: "Restricting private vehicle usage based on registration numbers to cut primary commuters' emissions."
    },
    {
        id: "industrial_shutdown",
        name: "Industrial Sector Shutdown",
        source: "industry",
        effectiveness: 18, // Max 18% reduction
        cost: "High",
        baseConfidence: 95,
        type: "Emergency",
        severity: "Strict",
        description: "Temporary cessation of all non-essential manufacturing units in high-emission clusters."
    },
    {
        id: "construction_ban",
        name: "Total Construction Ban",
        source: "dust",
        effectiveness: 10, // Max 10% reduction
        cost: "High",
        baseConfidence: 93,
        type: "Enforcement",
        severity: "Strict",
        description: "Zero-tolerance ban on civil works to prevent PM10 suspension from soil and debris."
    },
    {
        id: "garbage_burning_penalty",
        name: "Garbage Burning Enforcement",
        source: "garbage",
        effectiveness: 7,
        cost: "Low",
        baseConfidence: 94,
        type: "Enforcement",
        severity: "Low",
        description: "Intensified monitoring of landfills and illegal burning zones with immediate penalties."
    },
    {
        id: "stubble_biomass",
        name: "Biomass Management Subsidy",
        source: "stubble",
        effectiveness: 15,
        cost: "Medium",
        baseConfidence: 92,
        type: "Incentive",
        severity: "Low",
        description: "Coordinating with satellite states to fund ex-situ stubble processing instead of burning."
    },
    {
        id: "mechanical_sprinkling",
        name: "Mechanical Road Sprinkling",
        source: "dust",
        effectiveness: 5,
        cost: "Low",
        baseConfidence: 97,
        type: "Infrastructure",
        severity: "Low",
        description: "Automated water sprinkling on major arterial roads to settle surface dust."
    },
    {
        id: "school_closure",
        name: "Educational Institution Lockdown",
        source: "health",
        effectiveness: 0,
        cost: "Medium",
        baseConfidence: 100,
        type: "Health",
        severity: "Strict",
        description: "Prioritizing public health safety by minimizing exposure for vulnerable age groups."
    },
    {
        id: "emergency_gr_4",
        name: "GRAP Stage IV Activation",
        source: "all",
        effectiveness: 25,
        cost: "Extreme",
        baseConfidence: 99,
        type: "Disaster Management",
        severity: "Critical",
        description: "Comprehensive emergency measures including truck entry bans and work-from-home mandates."
    }
];

export function calculateInterventionImpact(policy, baseAQI, intensity, sources) {
    if (!policy) return { reduction: 0, projectedAQI: baseAQI, economicImpact: 'Low' };

    const sourceContrib = parseFloat(sources[policy.source]) || 0;
    const maxEffectiveness = policy.effectiveness || 12;

    let calculatedReduction = 0;
    if (policy.source === 'all') {
        calculatedReduction = baseAQI * (maxEffectiveness / 100) * (intensity / 100);
    } else if (policy.source === 'health') {
        calculatedReduction = 0;
    } else {
        calculatedReduction = baseAQI * (maxEffectiveness / 100) * (intensity / 100) * (sourceContrib / 100);
    }

    const projectedAQI = Math.max(0, Math.round(baseAQI - calculatedReduction));

    const costMap = { 'Low': 1, 'Medium': 2, 'High': 3, 'Extreme': 4 };
    const baseCost = costMap[policy.cost] || 1;
    const effectiveCost = (baseCost * (intensity / 100));

    let economicImpact = 'Low';
    if (effectiveCost > 3 || policy.cost === 'Extreme') economicImpact = 'Extreme';
    else if (effectiveCost > 2) economicImpact = 'High';
    else if (effectiveCost > 1) economicImpact = 'Medium';

    return {
        reduction: parseFloat(calculatedReduction.toFixed(1)),
        projectedAQI,
        economicImpact
    };
}
