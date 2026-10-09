import React, { useState, useEffect } from "react";
import { api } from "./api/client";
import {
  RiskAssessment,
  RiskSummary,
  ResourceSummary,
  OptimizationResult,
  ScenarioConfig,
  LiveWeatherObservation,
  WeatherSummary
} from "./types";

import { Sidebar } from "./components/Layout/Sidebar";
import { Topbar } from "./components/Layout/Topbar";
import { SyntheticDataBanner } from "./components/Layout/Banner";

import { LandingPage } from "./pages/LandingPage";
import { NationalDashboard } from "./pages/NationalDashboard";
import { RiskIntelligencePage } from "./pages/RiskIntelligencePage";
import { ResourceManagementPage } from "./pages/ResourceManagementPage";
import { ResourceOptimizerPage } from "./pages/ResourceOptimizerPage";
import { WhatIfSimulatorPage } from "./pages/WhatIfSimulatorPage";
import { ImpactAnalysisPage } from "./pages/ImpactAnalysisPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { MethodologyPage } from "./pages/MethodologyPage";

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("landing");
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [resourceSummary, setResourceSummary] = useState<ResourceSummary | null>(null);
  const [latestOptimization, setLatestOptimization] = useState<OptimizationResult | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([]);
  const [currentScenarioId, setCurrentScenarioId] = useState<string>("assam-flood");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("AS-KAM");
  const [activeHazardFilter, setActiveHazardFilter] = useState<string>("All");

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Weather Integration State
  const [isLiveWeatherMode, setIsLiveWeatherMode] = useState<boolean>(false);
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(null);
  const [liveWeatherMap, setLiveWeatherMap] = useState<Record<string, LiveWeatherObservation>>({});
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState<boolean>(false);
  const [isSyncingRisk, setIsSyncingRisk] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Fetch Live Weather Telemetry
  const fetchLiveWeather = async (force: boolean = false) => {
    setIsWeatherRefreshing(true);
    setWeatherError(null);
    try {
      const data = await api.getLiveWeather(force);
      setWeatherSummary(data.summary);
      const map: Record<string, LiveWeatherObservation> = {};
      data.observations.forEach((obs) => {
        map[obs.region_id] = obs;
      });
      setLiveWeatherMap(map);
    } catch (err: any) {
      console.error("Failed to load live weather:", err);
      setWeatherError(err?.message || "Failed to fetch live weather observations");
    } finally {
      setIsWeatherRefreshing(false);
    }
  };

  // Initial Data Load
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [health, assessData, summaryData, resSumData, optData, scenData] = await Promise.all([
        api.getHealth(),
        api.getRiskAssessments(),
        api.getRiskSummary(),
        api.getResourceSummary(),
        api.getLatestOptimization(),
        api.getScenarios()
      ]);

      setIsBackendConnected(health.status === "healthy");
      setAssessments(assessData);
      setRiskSummary(summaryData);
      setResourceSummary(resSumData);
      setLatestOptimization(optData);
      setScenarios(scenData);
      if (optData?.scenario_id) {
        setCurrentScenarioId(optData.scenario_id);
      }

      // Concurrently fetch live weather telemetry
      fetchLiveWeather(false);
    } catch (err) {
      console.error("Failed to load initial data from backend:", err);
      setIsBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Auto-refresh weather every 10 minutes
    const interval = setInterval(() => {
      fetchLiveWeather(false);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Toggle Live Weather Mode
  const handleToggleLiveWeatherMode = async () => {
    const nextMode = !isLiveWeatherMode;
    setIsLiveWeatherMode(nextMode);
    if (nextMode) {
      await fetchLiveWeather(true);
    }
  };

  // Handle Syncing Live Meteorological Risk to Core Assessment Pipeline
  const handleSyncLiveRisk = async () => {
    setIsSyncingRisk(true);
    try {
      const res = await api.syncWeatherToRisk(true);
      await fetchLiveWeather(true);
      const [assessData, summaryData] = await Promise.all([
        api.getRiskAssessments(),
        api.getRiskSummary()
      ]);
      setAssessments(assessData);
      setRiskSummary(summaryData);
      alert(
        `Live Meteorological Risk Synchronized!\nUpdated ${res.synced_regions_count || 82} districts with current surface telemetry.\nEmergency dispatches recalculated.`
      );
    } catch (err: any) {
      alert("Error synchronizing live weather risk: " + (err?.message || err));
    } finally {
      setIsSyncingRisk(false);
    }
  };

  // Handle Scenario Switch
  const handleScenarioChange = async (scenarioId: string) => {
    setIsLoading(true);
    try {
      const res = await api.activateScenario(scenarioId);
      setCurrentScenarioId(scenarioId);
      if (res.optimization_result) {
        setLatestOptimization(res.optimization_result);
      }
      // Refresh assessments and summary
      const [assessData, summaryData, resSumData] = await Promise.all([
        api.getRiskAssessments(),
        api.getRiskSummary(),
        api.getResourceSummary()
      ]);
      setAssessments(assessData);
      setRiskSummary(summaryData);
      setResourceSummary(resSumData);
    } catch (err) {
      alert("Error switching scenario: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Reset to Baseline
  const handleReset = async () => {
    setIsLoading(true);
    try {
      await api.resetBaseline();
      await fetchAllData();
      alert("System restored to baseline Assam Flood Emergency scenario.");
    } catch (err) {
      alert("Error resetting database: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentPage === "landing") {
    return (
      <LandingPage
        onLaunch={() => setCurrentPage("dashboard")}
        onSelectScenario={(sId) => {
          handleScenarioChange(sId);
          setCurrentPage("dashboard");
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-zinc-100 font-sans">
      {/* Left Persistent Command Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        criticalAlertCount={riskSummary?.critical_count || 0}
        pendingTransfersCount={latestOptimization?.transfers?.length || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <Topbar
          scenarios={scenarios}
          currentScenarioId={currentScenarioId}
          onScenarioChange={handleScenarioChange}
          onReset={handleReset}
          isBackendConnected={isBackendConnected}
          isDemoMode={isDemoMode}
          onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
          isLoading={isLoading}
          isLiveWeatherMode={isLiveWeatherMode}
          onToggleLiveWeatherMode={handleToggleLiveWeatherMode}
          weatherSummary={weatherSummary}
          isWeatherRefreshing={isWeatherRefreshing}
          onRefreshWeather={() => fetchLiveWeather(true)}
          weatherError={weatherError}
          onSyncLiveRisk={handleSyncLiveRisk}
          isSyncingRisk={isSyncingRisk}
        />

        {/* Synthetic Data Banner */}
        <SyntheticDataBanner isLiveWeatherMode={isLiveWeatherMode} />

        {/* Dynamic Page Component */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentPage === "landing" && (
            <LandingPage
              onLaunch={() => setCurrentPage("dashboard")}
              onSelectScenario={(sId) => {
                handleScenarioChange(sId);
                setCurrentPage("dashboard");
              }}
            />
          )}

          {currentPage === "dashboard" && (
            <NationalDashboard
              riskSummary={riskSummary}
              resourceSummary={resourceSummary}
              assessments={assessments}
              latestOptimization={latestOptimization}
              selectedRegionId={selectedRegionId}
              onSelectRegion={(id) => {
                setSelectedRegionId(id);
                // Also optionally can navigate to risk
              }}
              onNavigatePage={setCurrentPage}
              activeHazardFilter={activeHazardFilter}
              onHazardFilterChange={setActiveHazardFilter}
              liveWeatherMap={liveWeatherMap}
              weatherSummary={weatherSummary}
              isLiveWeatherMode={isLiveWeatherMode}
              onRefreshWeather={() => fetchLiveWeather(true)}
              isWeatherRefreshing={isWeatherRefreshing}
            />
          )}

          {currentPage === "risk" && (
            <RiskIntelligencePage
              assessments={assessments}
              selectedRegionId={selectedRegionId}
              onSelectRegion={setSelectedRegionId}
              liveWeatherMap={liveWeatherMap}
              isLiveWeatherMode={isLiveWeatherMode}
            />
          )}

          {currentPage === "resources" && (
            <ResourceManagementPage
              onRefreshData={() => {
                api.getResourceSummary().then(setResourceSummary);
              }}
            />
          )}

          {currentPage === "optimizer" && (
            <ResourceOptimizerPage
              optimizationResult={latestOptimization}
              onRunOptimization={(res) => setLatestOptimization(res)}
              onNavigatePage={setCurrentPage}
            />
          )}

          {currentPage === "simulator" && (
            <WhatIfSimulatorPage
              scenarios={scenarios}
              currentScenarioId={currentScenarioId}
              onSelectScenario={handleScenarioChange}
              baseOptimization={latestOptimization}
              onApplySimulationResult={(res) => setLatestOptimization(res)}
            />
          )}

          {currentPage === "impact" && <ImpactAnalysisPage />}

          {currentPage === "recommendations" && (
            <RecommendationsPage
              onPlanApproved={() => {
                fetchAllData();
              }}
            />
          )}

          {currentPage === "methodology" && <MethodologyPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
