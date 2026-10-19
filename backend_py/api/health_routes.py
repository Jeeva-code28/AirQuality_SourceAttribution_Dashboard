"""
Health Advisory API Routes
Context-aware health advisory generation based on AQI, pollutant levels, and source attribution.
"""
import traceback
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import requests

router = APIRouter()


def _get_aqi_category(aqi: int) -> dict:
    """Classify AQI into category with color and level."""
    if aqi <= 50:
        return {"level": "Good", "color": "#10b981", "severity": 1}
    elif aqi <= 100:
        return {"level": "Moderate", "color": "#f59e0b", "severity": 2}
    elif aqi <= 150:
        return {"level": "Unhealthy for Sensitive Groups", "color": "#f97316", "severity": 3}
    elif aqi <= 200:
        return {"level": "Unhealthy", "color": "#ef4444", "severity": 4}
    elif aqi <= 300:
        return {"level": "Very Unhealthy", "color": "#7c3aed", "severity": 5}
    else:
        return {"level": "Hazardous", "color": "#7e0023", "severity": 6}


def _generate_health_advisory(aqi: int, pollutants: dict, source_data: dict = None) -> dict:
    """Generate structured health advisory based on current conditions."""
    category = _get_aqi_category(aqi)
    severity = category["severity"]

    # ---- General Population Advisory ----
    general = {}
    if severity <= 1:
        general = {
            "risk": "Low",
            "message": "Air quality is satisfactory. Enjoy outdoor activities freely.",
            "outdoor_activity": "Safe for all activities",
            "icon": "fa-face-smile"
        }
    elif severity == 2:
        general = {
            "risk": "Low-Moderate",
            "message": "Air quality is acceptable. Unusually sensitive individuals may experience mild effects.",
            "outdoor_activity": "Most outdoor activities are safe",
            "icon": "fa-face-meh"
        }
    elif severity == 3:
        general = {
            "risk": "Moderate",
            "message": "General public is less likely to be affected. However, people with existing respiratory conditions should take precautions.",
            "outdoor_activity": "Reduce prolonged outdoor exertion",
            "icon": "fa-triangle-exclamation"
        }
    elif severity == 4:
        general = {
            "risk": "High",
            "message": "Everyone may begin to experience health effects. Members of sensitive groups may experience more serious effects.",
            "outdoor_activity": "Avoid prolonged outdoor exertion",
            "icon": "fa-circle-exclamation"
        }
    elif severity == 5:
        general = {
            "risk": "Very High",
            "message": "Health alert: The risk of health effects is increased for everyone. Avoid outdoor activities.",
            "outdoor_activity": "Stay indoors. Use air purifiers.",
            "icon": "fa-skull"
        }
    else:
        general = {
            "risk": "Severe / Emergency",
            "message": "Health emergency: Everyone is likely to be affected. Avoid all outdoor exposure.",
            "outdoor_activity": "Do NOT go outdoors. Seal windows.",
            "icon": "fa-skull-crossbones"
        }

    # ---- Sensitive Groups ----
    sensitive_groups = []

    if severity >= 2:
        sensitive_groups.append({
            "group": "Children & Elderly",
            "icon": "fa-children",
            "advice": "Limit outdoor play time. Keep children indoors during peak pollution hours (8-10 AM, 6-9 PM)."
                      if severity <= 3 else
                      "Keep children and elderly strictly indoors. Cancel outdoor school activities."
        })

    if severity >= 3:
        sensitive_groups.append({
            "group": "Respiratory Patients",
            "icon": "fa-lungs",
            "advice": "Carry rescue inhalers. Avoid areas with heavy traffic."
                      if severity <= 4 else
                      "Use N95/FFP2 masks if outdoor travel is unavoidable. Consider staying near medical facilities."
        })

    if severity >= 3:
        sensitive_groups.append({
            "group": "Heart Disease Patients",
            "icon": "fa-heart-pulse",
            "advice": "Avoid strenuous activities. Monitor for chest pain or unusual fatigue."
        })

    if severity >= 4:
        sensitive_groups.append({
            "group": "Pregnant Women",
            "icon": "fa-person-pregnant",
            "advice": "Minimize all outdoor exposure. Use air purifiers in living spaces."
        })

    # ---- Activity-Specific Advisories ----
    activities = []

    # Joggers / Walkers
    if severity <= 2:
        activities.append({
            "activity": "Jogging & Walking",
            "icon": "fa-person-running",
            "status": "Safe",
            "status_color": "#10b981",
            "advice": "Outdoor exercise is safe. Best time: early morning (5-7 AM).",
            "breathing_note": "Joggers inhale 2.5× more air than resting — air quality is currently safe for this."
        })
    elif severity == 3:
        activities.append({
            "activity": "Jogging & Walking",
            "icon": "fa-person-running",
            "status": "Caution",
            "status_color": "#f59e0b",
            "advice": "Shorten outdoor runs. Prefer indoor gyms or treadmills. Avoid routes near highways.",
            "breathing_note": "At 2.5× breathing rate, joggers are exposed to significantly more pollutants. Consider reducing intensity."
        })
    else:
        activities.append({
            "activity": "Jogging & Walking",
            "icon": "fa-person-running",
            "status": "Avoid",
            "status_color": "#ef4444",
            "advice": "Do NOT exercise outdoors. Switch to indoor workouts. Use the Safe Route finder if travel is necessary.",
            "breathing_note": "At current pollution levels, even 30 minutes of jogging equals hours of passive exposure."
        })

    # Cycling
    if severity <= 2:
        activities.append({
            "activity": "Cycling",
            "icon": "fa-bicycle",
            "status": "Safe",
            "status_color": "#10b981",
            "advice": "Cycling is safe. Consider using dedicated cycle lanes away from main roads."
        })
    elif severity == 3:
        activities.append({
            "activity": "Cycling",
            "icon": "fa-bicycle",
            "status": "Caution",
            "status_color": "#f59e0b",
            "advice": "Reduce cycling duration. Avoid peak traffic hours. Cyclists breathe 2× more than drivers."
        })
    else:
        activities.append({
            "activity": "Cycling",
            "icon": "fa-bicycle",
            "status": "Avoid",
            "status_color": "#ef4444",
            "advice": "Avoid cycling outdoors. Use public transport or vehicles with cabin air filtration."
        })

    # Commuting
    if severity >= 3:
        activities.append({
            "activity": "Commuting",
            "icon": "fa-car",
            "status": "Use Protection" if severity <= 4 else "Minimize",
            "status_color": "#f59e0b" if severity <= 4 else "#ef4444",
            "advice": "Keep car windows closed. Use recirculation mode for AC. Consider using the Clean Route feature to find least-polluted commute paths."
        })

    # ---- Protective Measures ----
    protective = []
    if severity >= 3:
        protective.append({
            "measure": "Wear N95/FFP2 Masks",
            "icon": "fa-mask-face",
            "priority": "High" if severity >= 4 else "Recommended"
        })
    if severity >= 3:
        protective.append({
            "measure": "Use Air Purifiers Indoors",
            "icon": "fa-fan",
            "priority": "High" if severity >= 4 else "Recommended"
        })
    if severity >= 4:
        protective.append({
            "measure": "Seal Windows & Doors",
            "icon": "fa-door-closed",
            "priority": "High"
        })
    if severity >= 2:
        protective.append({
            "measure": "Stay Hydrated & Eat Antioxidants",
            "icon": "fa-apple-whole",
            "priority": "General"
        })

    # ---- Source-Specific Insight ----
    source_insight = ""
    if source_data and source_data.get("primary_source"):
        src = source_data["primary_source"]
        src_pct = round(source_data.get("sources", {}).get(src, 0) * 100)
        if src == "transport":
            source_insight = f"Vehicular emissions ({src_pct}% contribution) are the primary driver. Avoid busy roads and highway corridors."
        elif src == "dust":
            source_insight = f"Dust and construction ({src_pct}%) are dominant. Stay away from construction zones. Use damp cloths on windows."
        elif src == "industry":
            source_insight = f"Industrial emissions ({src_pct}%) are elevated. Monitor wind direction — downwind areas face higher risk."
        elif src == "stubble":
            source_insight = f"Crop residue burning ({src_pct}%) is contributing significantly. Smoke plumes may cause visibility issues."
        elif src == "residential":
            source_insight = f"Residential fuel burning ({src_pct}%) is a major contributor. Indoor air quality may also be compromised."
        else:
            source_insight = f"Regional background pollution ({src_pct}%) indicates a broader atmospheric stagnation event."

    return {
        "aqi": aqi,
        "category": category,
        "general_advisory": general,
        "sensitive_groups": sensitive_groups,
        "activity_advisories": activities,
        "protective_measures": protective,
        "source_insight": source_insight,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/advisory")
async def get_health_advisory(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Generate context-aware health advisory based on current air quality conditions.
    """
    try:
        # 1. Fetch current AQI
        pollutants = {}
        aqi = 100

        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality"
            f"?latitude={lat}&longitude={lon}"
            f"&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide"
            f"&timezone=auto"
        )
        try:
            resp = requests.get(aq_url, timeout=10)
            aq_data = resp.json().get("current", {})
            aqi = aq_data.get("us_aqi", 100) or 100
            pollutants = {
                "pm2_5": aq_data.get("pm2_5", 0) or 0,
                "pm10": aq_data.get("pm10", 0) or 0,
                "no2": aq_data.get("nitrogen_dioxide", 0) or 0,
                "so2": aq_data.get("sulphur_dioxide", 0) or 0,
                "o3": aq_data.get("ozone", 0) or 0,
                "co": aq_data.get("carbon_monoxide", 0) or 0
            }
        except Exception as e:
            print(f"AQ fetch failed for health: {e}")

        # 2. Try to get source data (optional enrichment)
        source_data = None
        try:
            from api.source_routes import _fetch_live_conditions, _heuristic_source_attribution
            conditions = _fetch_live_conditions(lat, lon)
            source_data = _heuristic_source_attribution(conditions)
        except Exception:
            pass

        # 3. Generate advisory
        advisory = _generate_health_advisory(aqi, pollutants, source_data)

        return JSONResponse(content=advisory)

    except Exception as e:
        print(f"Health advisory error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Health advisory failed: {str(e)}")
