"""
Policy Recommendation API Routes
AI-driven, source-aware policy recommendation engine.
"""
import traceback
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import requests

router = APIRouter()


# Policy knowledge base — maps sources to actionable interventions
POLICY_DATABASE = {
    "transport": [
        {
            "name": "Odd-Even Traffic Rule",
            "description": "Restrict private vehicles based on registration plate numbers to cut vehicular emissions.",
            "aqi_reduction_pct": 12,
            "economic_impact": "Medium",
            "type": "Enforcement",
            "icon": "fa-car-side"
        },
        {
            "name": "Public Transport Subsidies",
            "description": "Offer free or discounted metro/bus passes to reduce private vehicle usage during high-pollution days.",
            "aqi_reduction_pct": 8,
            "economic_impact": "Low",
            "type": "Incentive",
            "icon": "fa-bus"
        },
        {
            "name": "Heavy Vehicle Entry Ban",
            "description": "Ban entry of trucks and heavy commercial vehicles during peak hours (6AM-10PM).",
            "aqi_reduction_pct": 10,
            "economic_impact": "Medium",
            "type": "Enforcement",
            "icon": "fa-truck"
        }
    ],
    "dust": [
        {
            "name": "Construction Activity Ban",
            "description": "Halt all civil construction and demolition activities to prevent PM10 suspension.",
            "aqi_reduction_pct": 10,
            "economic_impact": "High",
            "type": "Enforcement",
            "icon": "fa-helmet-safety"
        },
        {
            "name": "Mechanical Road Sweeping & Sprinkling",
            "description": "Deploy automated water sprinklers and vacuum sweepers on major arterial roads.",
            "aqi_reduction_pct": 5,
            "economic_impact": "Low",
            "type": "Infrastructure",
            "icon": "fa-broom"
        }
    ],
    "industry": [
        {
            "name": "Industrial Sector Shutdown",
            "description": "Temporary cessation of non-essential manufacturing in high-emission industrial clusters.",
            "aqi_reduction_pct": 18,
            "economic_impact": "High",
            "type": "Emergency",
            "icon": "fa-industry"
        },
        {
            "name": "Emission Standards Enforcement",
            "description": "Deploy mobile monitoring units to ensure compliance with emission norms at industrial sites.",
            "aqi_reduction_pct": 7,
            "economic_impact": "Low",
            "type": "Enforcement",
            "icon": "fa-gauge-high"
        }
    ],
    "stubble": [
        {
            "name": "Biomass Management Subsidy",
            "description": "Coordinate with neighboring agricultural states to fund ex-situ stubble processing instead of burning.",
            "aqi_reduction_pct": 15,
            "economic_impact": "Medium",
            "type": "Incentive",
            "icon": "fa-wheat-awn"
        },
        {
            "name": "Interstate Fire Monitoring",
            "description": "Activate satellite-based (NASA FIRMS) fire detection alerts and deploy rapid response teams.",
            "aqi_reduction_pct": 8,
            "economic_impact": "Low",
            "type": "Surveillance",
            "icon": "fa-satellite"
        }
    ],
    "residential": [
        {
            "name": "Clean Cooking Fuel Distribution",
            "description": "Emergency distribution of LPG cylinders in areas with high biomass burning for cooking/heating.",
            "aqi_reduction_pct": 6,
            "economic_impact": "Medium",
            "type": "Incentive",
            "icon": "fa-fire-burner"
        },
        {
            "name": "Waste Burning Enforcement",
            "description": "Intensified monitoring of illegal garbage and waste burning with immediate penalties.",
            "aqi_reduction_pct": 7,
            "economic_impact": "Low",
            "type": "Enforcement",
            "icon": "fa-dumpster-fire"
        }
    ],
    "regional": [
        {
            "name": "Cloud Seeding / Smog Tower Activation",
            "description": "Activate installed smog towers and consider cloud seeding to accelerate pollutant washout.",
            "aqi_reduction_pct": 5,
            "economic_impact": "High",
            "type": "Infrastructure",
            "icon": "fa-cloud-rain"
        }
    ]
}

# Emergency policies triggered by AQI severity, independent of source
EMERGENCY_POLICIES = [
    {
        "name": "Educational Institution Lockdown",
        "description": "Close all schools and colleges to protect vulnerable children from hazardous air exposure.",
        "aqi_threshold": 300,
        "urgency": "CRITICAL",
        "icon": "fa-school"
    },
    {
        "name": "GRAP Stage IV Activation",
        "description": "Comprehensive emergency measures: truck entry bans, work-from-home mandates, and water sprinkling.",
        "aqi_threshold": 400,
        "urgency": "CRITICAL",
        "icon": "fa-triangle-exclamation"
    },
    {
        "name": "Outdoor Activity Restrictions",
        "description": "Advise all citizens to limit prolonged outdoor exertion. Sensitive groups should stay indoors.",
        "aqi_threshold": 150,
        "urgency": "HIGH",
        "icon": "fa-person-running"
    },
    {
        "name": "Health Advisory Issuance",
        "description": "Issue formal health advisory through public broadcasting and emergency SMS system.",
        "aqi_threshold": 200,
        "urgency": "HIGH",
        "icon": "fa-bullhorn"
    }
]


def _get_urgency(source_pct: float, aqi: int) -> str:
    """Determine urgency level based on source dominance and AQI."""
    if aqi > 300 or source_pct > 0.40:
        return "CRITICAL"
    elif aqi > 200 or source_pct > 0.30:
        return "HIGH"
    elif aqi > 100 or source_pct > 0.20:
        return "MODERATE"
    return "LOW"


def _generate_recommendations(source_data: dict, aqi: int) -> list:
    """Generate ranked policy recommendations based on source attribution and AQI."""
    recommendations = []
    sources = source_data.get("sources", {})

    # 1. Source-specific policies — prioritize by source contribution
    sorted_sources = sorted(sources.items(), key=lambda x: x[1], reverse=True)

    for source_name, source_pct in sorted_sources:
        if source_pct < 0.05:
            continue  # Skip negligible sources

        policies = POLICY_DATABASE.get(source_name, [])
        urgency = _get_urgency(source_pct, aqi)

        for policy in policies:
            # Dynamic AQI reduction estimate
            estimated_reduction = round(aqi * (policy["aqi_reduction_pct"] / 100) * source_pct, 1)

            recommendations.append({
                "name": policy["name"],
                "description": policy["description"],
                "source": source_name,
                "source_contribution_pct": round(source_pct * 100, 1),
                "urgency": urgency,
                "estimated_aqi_reduction": estimated_reduction,
                "economic_impact": policy["economic_impact"],
                "type": policy["type"],
                "icon": policy["icon"]
            })

    # 2. Emergency policies (AQI-threshold-based)
    for ep in EMERGENCY_POLICIES:
        if aqi >= ep["aqi_threshold"]:
            recommendations.append({
                "name": ep["name"],
                "description": ep["description"],
                "source": "emergency",
                "source_contribution_pct": 100,
                "urgency": ep["urgency"],
                "estimated_aqi_reduction": 0,
                "economic_impact": "N/A",
                "type": "Emergency",
                "icon": ep["icon"]
            })

    # 3. Sort: CRITICAL first, then HIGH, then by estimated reduction
    urgency_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
    recommendations.sort(key=lambda x: (urgency_order.get(x["urgency"], 4), -x["estimated_aqi_reduction"]))

    return recommendations


@router.get("/recommend")
async def recommend_policies(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Generate AI-driven policy recommendations based on real-time source attribution.
    """
    try:
        # 1. Get source attribution data
        try:
            from api.source_routes import _fetch_live_conditions, _heuristic_source_attribution, _get_model

            conditions = _fetch_live_conditions(lat, lon)
            aqi = int(conditions.get("aqi", 100))

            # Try ML model first
            model = _get_model()
            if model and model != "UNAVAILABLE":
                try:
                    result = model.predict(conditions, return_std=True)
                    source_data = {
                        "sources": result["sources"],
                        "confidence": result.get("confidence", 0.8),
                        "primary_source": max(result["sources"], key=result["sources"].get)
                    }
                except Exception:
                    source_data = _heuristic_source_attribution(conditions)
            else:
                source_data = _heuristic_source_attribution(conditions)

        except Exception as e:
            print(f"Source fetch failed in policy: {e}")
            # Minimal fallback
            aqi = 150
            source_data = {
                "sources": {"transport": 0.30, "dust": 0.25, "industry": 0.20,
                            "stubble": 0.10, "residential": 0.10, "regional": 0.05},
                "confidence": 0.5,
                "primary_source": "transport"
            }

        # 2. Generate recommendations
        recommendations = _generate_recommendations(source_data, aqi)

        return JSONResponse(content={
            "recommendations": recommendations,
            "total_count": len(recommendations),
            "current_aqi": aqi,
            "source_attribution": source_data,
            "generated_at": datetime.utcnow().isoformat()
        })

    except Exception as e:
        print(f"Policy recommendation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Policy recommendation failed: {str(e)}")
