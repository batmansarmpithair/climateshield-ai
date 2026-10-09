"""
ClimateShield AI — Weather Routes
REST endpoints for real-time weather integration (Open-Meteo & IMD),
dynamic telemetry, manual refresh, provenance audits, and live risk pipeline sync.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.database import get_db_connection
from app.weather_service import (
    WeatherService,
    IMDInvestigationService,
    sync_live_weather_to_risk_pipeline
)

router = APIRouter(prefix="/weather", tags=["Real-Time Weather & IMD Telemetry"])

class ModeUpdateRequest(BaseModel):
    mode: str = Field(..., description="'live' (Real-time Open-Meteo/IMD) or 'synthetic' (Scenario Preset)")

class RefreshRequest(BaseModel):
    force: bool = Field(False, description="Bypass cache TTL and force fresh fetch from external APIs")

class ConfigUpdateRequest(BaseModel):
    auto_refresh_interval_sec: Optional[int] = Field(None, ge=60, le=86400)
    mode: Optional[str] = Field(None, description="'live' or 'synthetic'")


@router.get("/live")
def get_live_weather_overview(
    force_refresh: bool = Query(False, description="Force fresh fetch from Open-Meteo API")
):
    """
    Returns live weather telemetry across all monitored Indian districts,
    including national summary metrics, IMD alert breakdown, and data provenance.
    """
    try:
        service = WeatherService()
        data = service.get_live_weather_all(force_refresh=force_refresh)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve live weather telemetry: {str(e)}")


@router.get("/live/{region_id}")
def get_district_live_weather(
    region_id: str,
    force_refresh: bool = Query(False, description="Force fresh fetch for this district")
):
    """
    Returns real-time weather observations and 72-hour hourly forecast
    for a specific district with data provenance and IMD alert classification.
    """
    try:
        service = WeatherService()
        return service.get_live_weather_for_region(region_id, force_refresh=force_refresh)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live weather lookup failed: {str(e)}")


@router.post("/refresh")
def trigger_manual_weather_refresh(payload: Optional[RefreshRequest] = None):
    """
    Manually triggers an external weather fetch from Open-Meteo,
    refreshing the SQLite cache and updating last successful update timestamp.
    """
    force = payload.force if payload else True
    try:
        service = WeatherService()
        res = service.get_live_weather_all(force_refresh=force)
        return {
            "status": "success",
            "message": "Live weather telemetry refreshed successfully.",
            "refreshed_at": datetime.now(timezone.utc).isoformat(),
            "districts_count": res["summary"]["total_districts_monitored"],
            "summary": res["summary"]
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"External meteorological API error: {str(e)}")


@router.get("/imd/status")
def get_imd_platform_status():
    """
    Investigates and returns the official India Meteorological Department (IMD)
    platform integration report, authentication requirements, endpoint connectivity,
    and official color-coded alert matrix.
    """
    return IMDInvestigationService.get_investigation_report()


@router.get("/config")
def get_weather_system_config():
    """
    Returns current weather mode ('live' vs 'synthetic'), auto-refresh interval,
    and timestamp of last weather risk synchronization.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value, updated_at FROM system_config")
    rows = cursor.fetchall()
    conn.close()

    cfg_dict = {r["key"]: r["value"] for r in rows}
    return {
        "active_mode": cfg_dict.get("active_weather_mode", "synthetic"),
        "auto_refresh_interval_sec": int(cfg_dict.get("auto_refresh_interval_sec", 900)),
        "last_weather_risk_sync": cfg_dict.get("last_weather_risk_sync"),
        "open_meteo_status": "Operational (Zero-Key Global NWP)",
        "imd_status": "Operational (4-Tier Alert Classification)"
    }


@router.post("/config")
def update_weather_system_config(payload: ConfigUpdateRequest):
    """Updates operational weather configuration like auto-refresh timer or active mode."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    if payload.mode:
        cursor.execute("""
            INSERT INTO system_config (key, value, updated_at)
            VALUES ('active_weather_mode', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
        """, (payload.mode, now_iso))

    if payload.auto_refresh_interval_sec is not None:
        cursor.execute("""
            INSERT INTO system_config (key, value, updated_at)
            VALUES ('auto_refresh_interval_sec', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
        """, (str(payload.auto_refresh_interval_sec), now_iso))

    conn.commit()
    conn.close()

    return {"status": "success", "updated_at": now_iso}


@router.post("/sync-risk")
def sync_weather_to_risk(payload: Optional[RefreshRequest] = None):
    """
    Feeds live weather observations into the multi-hazard risk engine and ML forecaster,
    updating regional risk profiles and generating emergency demands ready for PuLP optimization.
    """
    force = payload.force if payload else False
    try:
        res = sync_live_weather_to_risk_pipeline(force_refresh=force)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk synchronization failed: {str(e)}")
