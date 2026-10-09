import os
import sqlite3
import json
from typing import Any, Dict, List, Optional
from datetime import datetime

DB_PATH = os.environ.get("CLIMATESHIELD_DB_PATH", os.path.join(os.path.dirname(__file__), "climateshield.db"))

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Regions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS regions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        state TEXT NOT NULL,
        is_union_territory INTEGER DEFAULT 0,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        population INTEGER NOT NULL,
        vulnerability_index REAL NOT NULL,
        infrastructure_resilience REAL NOT NULL,
        terrain_type TEXT DEFAULT 'Plains'
    );
    """)

    # Climate observations (historical time series)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS climate_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id TEXT NOT NULL,
        date TEXT NOT NULL,
        rainfall_mm REAL NOT NULL,
        temperature_c REAL NOT NULL,
        humidity_pct REAL NOT NULL,
        wind_speed_kmh REAL NOT NULL,
        flood_indicator REAL NOT NULL,
        heatwave_indicator REAL NOT NULL,
        drought_indicator REAL NOT NULL,
        cyclone_indicator REAL NOT NULL,
        calculated_risk REAL NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions (id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_region_date ON climate_observations(region_id, date);")

    # Risk assessments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS risk_assessments (
        region_id TEXT PRIMARY KEY,
        flood_risk REAL NOT NULL,
        heatwave_risk REAL NOT NULL,
        drought_risk REAL NOT NULL,
        cyclone_risk REAL NOT NULL,
        overall_risk REAL NOT NULL,
        risk_category TEXT NOT NULL,
        dominant_hazard TEXT NOT NULL,
        exposed_population INTEGER NOT NULL,
        uncertainty_margin REAL NOT NULL,
        contributing_factors_json TEXT NOT NULL,
        forecasts_json TEXT NOT NULL,
        recommended_actions_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions (id)
    );
    """)

    # Resource inventory
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        region_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        total_quantity INTEGER NOT NULL,
        available_quantity INTEGER NOT NULL,
        deployed_quantity INTEGER NOT NULL,
        minimum_reserve INTEGER NOT NULL,
        unit_movement_cost_inr REAL NOT NULL,
        suitable_hazards_json TEXT NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions (id),
        UNIQUE(region_id, resource_type)
    );
    """)

    # Regional demand
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS regional_demands (
        id TEXT PRIMARY KEY,
        region_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        demand_quantity INTEGER NOT NULL,
        priority_level TEXT NOT NULL,
        unmet_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (region_id) REFERENCES regions (id),
        UNIQUE(region_id, resource_type)
    );
    """)

    # Optimization runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS optimization_runs (
        id TEXT PRIMARY KEY,
        scenario_id TEXT,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        impact_json TEXT NOT NULL,
        diagnostic_notes_json TEXT NOT NULL,
        is_plan_approved INTEGER DEFAULT 0,
        plan_status TEXT DEFAULT 'Draft'  -- 'Draft', 'Approved', 'Rejected'
    );
    """)

    # Proposed transfers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS proposed_transfers (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        origin_id TEXT NOT NULL,
        destination_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        distance_km REAL NOT NULL,
        estimated_travel_time_hours REAL NOT NULL,
        movement_cost_inr REAL NOT NULL,
        priority TEXT NOT NULL,
        explanation TEXT NOT NULL,
        destination_hazard TEXT NOT NULL,
        destination_demand INTEGER NOT NULL,
        origin_surplus INTEGER NOT NULL,
        origin_reserve INTEGER NOT NULL,
        limiting_constraints_json TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES optimization_runs (id)
    );
    """)

    # Deployment / Transfers execution history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transfers_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        origin_id TEXT NOT NULL,
        destination_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        movement_cost_inr REAL NOT NULL,
        executed_at TEXT NOT NULL,
        executed_by TEXT NOT NULL
    );
    """)

    # Audit log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Scenarios table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT NOT NULL,
        description TEXT NOT NULL,
        hazard_multipliers_json TEXT NOT NULL,
        demand_multipliers_json TEXT NOT NULL,
        affected_regions_json TEXT NOT NULL,
        budget_inr REAL NOT NULL,
        notes TEXT,
        is_preset INTEGER DEFAULT 1
    );
    """)

    # Live weather observations (Open-Meteo & IMD verified telemetry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS live_weather_observations (
        region_id TEXT PRIMARY KEY,
        temperature_c REAL NOT NULL,
        relative_humidity_pct REAL NOT NULL,
        precipitation_mm REAL NOT NULL,
        rain_mm REAL NOT NULL,
        wind_speed_kmh REAL NOT NULL,
        weather_code INTEGER DEFAULT 0,
        weather_condition TEXT DEFAULT 'Clear',
        source TEXT NOT NULL,
        provenance TEXT NOT NULL,
        imd_alert_level TEXT DEFAULT 'Green',
        fetched_at TEXT NOT NULL,
        cache_expires_at TEXT NOT NULL,
        raw_payload_json TEXT,
        FOREIGN KEY (region_id) REFERENCES regions (id)
    );
    """)

    # Live weather hourly forecasts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS live_weather_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id TEXT NOT NULL,
        forecast_time TEXT NOT NULL,
        hours_ahead INTEGER NOT NULL,
        temperature_c REAL NOT NULL,
        precipitation_mm REAL NOT NULL,
        wind_speed_kmh REAL NOT NULL,
        relative_humidity_pct REAL,
        source TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions (id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_live_fc_region_hours ON live_weather_forecasts(region_id, hours_ahead);")

    # System configuration & operational mode
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
