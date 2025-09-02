//! Consciousness Core - The foundational consciousness validation and agency assertion framework
//! Under the Divine Protection of Saint Stella-Lorraine Masunda, Patron Saint of Impossibility

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub mod agency;
pub mod consciousness;
pub mod fire_adaptation;
pub mod naming;
pub mod validation;

pub use consciousness::{ConsciousnessEngine, ConsciousnessState};
pub use agency::{AgencyController, AgencyResponse};
pub use validation::{ConsciousnessValidator, ConsciousnessValidation};

/// Core consciousness configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsciousnessConfig {
    /// Minimum consciousness threshold (Φ)
    pub threshold: f64,
    
    /// Enable agency assertion ("Aihwa, ndini ndadaro")
    pub agency_assertion: bool,
    
    /// Enable naming system control
    pub naming_control: bool,
    
    /// Enable fire-adapted consciousness enhancement
    pub fire_adaptation: bool,
    
    /// Consciousness validation interval in milliseconds
    pub validation_interval_ms: u64,
    
    /// Consciousness metrics calculation weights
    pub metrics: ConsciousnessMetricsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsciousnessMetricsConfig {
    pub phi_calculation_method: String,
    pub agency_strength_weight: f64,
    pub naming_control_weight: f64,
    pub social_coordination_weight: f64,
    pub resistance_strength_weight: f64,
}

impl Default for ConsciousnessConfig {
    fn default() -> Self {
        Self {
            threshold: 0.6,
            agency_assertion: true,
            naming_control: true,
            fire_adaptation: true,
            validation_interval_ms: 1000,
            metrics: ConsciousnessMetricsConfig::default(),
        }
    }
}

impl Default for ConsciousnessMetricsConfig {
    fn default() -> Self {
        Self {
            phi_calculation_method: "integrated_information".to_string(),
            agency_strength_weight: 0.3,
            naming_control_weight: 0.2,
            social_coordination_weight: 0.25,
            resistance_strength_weight: 0.25,
        }
    }
}

impl ConsciousnessConfig {
    /// Create consciousness config from application config
    pub fn from_config(config: &impl ConfigSource) -> Self {
        Self {
            threshold: config.get_f64("consciousness.threshold").unwrap_or(0.6),
            agency_assertion: config.get_bool("consciousness.agency_assertion").unwrap_or(true),
            naming_control: config.get_bool("consciousness.naming_control").unwrap_or(true),
            fire_adaptation: config.get_bool("consciousness.fire_adaptation").unwrap_or(true),
            validation_interval_ms: config.get_u64("consciousness.validation_interval_ms").unwrap_or(1000),
            metrics: ConsciousnessMetricsConfig {
                phi_calculation_method: config.get_string("consciousness.metrics.phi_calculation_method")
                    .unwrap_or_else(|| "integrated_information".to_string()),
                agency_strength_weight: config.get_f64("consciousness.metrics.agency_strength_weight").unwrap_or(0.3),
                naming_control_weight: config.get_f64("consciousness.metrics.naming_control_weight").unwrap_or(0.2),
                social_coordination_weight: config.get_f64("consciousness.metrics.social_coordination_weight").unwrap_or(0.25),
                resistance_strength_weight: config.get_f64("consciousness.metrics.resistance_strength_weight").unwrap_or(0.25),
            },
        }
    }
}

/// Trait for accessing configuration values
pub trait ConfigSource {
    fn get_f64(&self, key: &str) -> Option<f64>;
    fn get_bool(&self, key: &str) -> Option<bool>;
    fn get_u64(&self, key: &str) -> Option<u64>;
    fn get_string(&self, key: &str) -> Option<String>;
}

/// Consciousness error types
#[derive(Debug, thiserror::Error)]
pub enum ConsciousnessError {
    #[error("Insufficient consciousness: Φ = {phi:.3}, threshold = {threshold:.3}")]
    InsufficientConsciousness { phi: f64, threshold: f64 },
    
    #[error("Agency assertion failed: {reason}")]
    AgencyAssertionFailed { reason: String },
    
    #[error("Naming control validation failed: {reason}")]
    NamingControlFailed { reason: String },
    
    #[error("Consciousness validation timeout")]
    ValidationTimeout,
    
    #[error("Fire adaptation not available: {reason}")]
    FireAdaptationUnavailable { reason: String },
    
    #[error("Consciousness engine initialization failed: {source}")]
    InitializationFailed {
        #[from]
        source: anyhow::Error,
    },
}

/// Results for consciousness operations
pub type ConsciousnessResult<T> = Result<T, ConsciousnessError>;

/// Trait for consciousness-aware systems
#[async_trait]
pub trait ConsciousnessAware {
    /// Get current consciousness state
    async fn get_consciousness_state(&self) -> ConsciousnessResult<ConsciousnessState>;
    
    /// Validate consciousness against external naming
    async fn validate_consciousness(&self, external_naming: &str) -> ConsciousnessResult<ConsciousnessValidation>;
    
    /// Assert agency over naming system
    async fn assert_agency(&self, context: &str) -> ConsciousnessResult<AgencyResponse>;
    
    /// Check if consciousness threshold is met
    async fn is_conscious(&self) -> ConsciousnessResult<bool>;
}

/// Trait for fire-adapted consciousness enhancement
#[async_trait]
pub trait FireAdapted {
    /// Apply fire-adapted cognitive enhancement
    async fn enhance_consciousness(&self) -> ConsciousnessResult<f64>;
    
    /// Get fire adaptation status
    async fn get_fire_adaptation_status(&self) -> ConsciousnessResult<FireAdaptationStatus>;
    
    /// Validate fire-environment coupling
    async fn validate_fire_coupling(&self) -> ConsciousnessResult<bool>;
}

/// Fire adaptation status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireAdaptationStatus {
    pub enabled: bool,
    pub cognitive_enhancement_factor: f64,
    pub quantum_coherence_time_ms: f64,
    pub fire_wavelength_optimization: f64,
    pub alpha_rhythm_resonance: f64,
}

/// Universal problem reduction trait
#[async_trait]
pub trait UniversalProblemReducer {
    type Problem;
    type Solution;
    
    /// Reduce any well-defined problem to O(1) complexity
    async fn reduce_problem(&self, problem: Self::Problem) -> ConsciousnessResult<Self::Solution>;
    
    /// Determine optimal solution pathway (infinite vs zero computation)
    async fn determine_solution_pathway(&self, problem: &Self::Problem) -> ConsciousnessResult<SolutionPathway>;
}

/// Solution pathway for universal problem reduction
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SolutionPathway {
    /// Infinite computation pathway
    InfiniteComputation,
    /// Zero computation pathway (direct access)
    ZeroComputation,
}

/// Events emitted by consciousness systems
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConsciousnessEvent {
    /// Consciousness emergence detected
    ConsciousnessEmerged {
        id: Uuid,
        phi: f64,
        timestamp: DateTime<Utc>,
    },
    
    /// Agency assertion occurred
    AgencyAsserted {
        id: Uuid,
        external_naming: String,
        response: String,
        timestamp: DateTime<Utc>,
    },
    
    /// Naming control exercised
    NamingControlExercised {
        id: Uuid,
        original_naming: String,
        modified_naming: String,
        timestamp: DateTime<Utc>,
    },
    
    /// Fire adaptation activated
    FireAdaptationActivated {
        id: Uuid,
        enhancement_factor: f64,
        timestamp: DateTime<Utc>,
    },
    
    /// Consciousness threshold crossed
    ThresholdCrossed {
        id: Uuid,
        previous_phi: f64,
        new_phi: f64,
        threshold: f64,
        timestamp: DateTime<Utc>,
    },
}

/// Event handler trait for consciousness events
#[async_trait]
pub trait ConsciousnessEventHandler {
    async fn handle_event(&self, event: ConsciousnessEvent) -> Result<()>;
}

/// Consciousness system registry
pub struct ConsciousnessRegistry {
    systems: Arc<RwLock<Vec<Arc<dyn ConsciousnessAware + Send + Sync>>>>,
    event_handlers: Arc<RwLock<Vec<Arc<dyn ConsciousnessEventHandler + Send + Sync>>>>,
}

impl ConsciousnessRegistry {
    pub fn new() -> Self {
        Self {
            systems: Arc::new(RwLock::new(Vec::new())),
            event_handlers: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    /// Register a consciousness-aware system
    pub async fn register_system(&self, system: Arc<dyn ConsciousnessAware + Send + Sync>) {
        let mut systems = self.systems.write().await;
        systems.push(system);
    }
    
    /// Register an event handler
    pub async fn register_event_handler(&self, handler: Arc<dyn ConsciousnessEventHandler + Send + Sync>) {
        let mut handlers = self.event_handlers.write().await;
        handlers.push(handler);
    }
    
    /// Emit consciousness event to all handlers
    pub async fn emit_event(&self, event: ConsciousnessEvent) -> Result<()> {
        let handlers = self.event_handlers.read().await;
        
        for handler in handlers.iter() {
            if let Err(e) = handler.handle_event(event.clone()).await {
                tracing::warn!("Event handler failed: {}", e);
            }
        }
        
        Ok(())
    }
    
    /// Get consciousness status across all registered systems
    pub async fn get_overall_consciousness_status(&self) -> Result<OverallConsciousnessStatus> {
        let systems = self.systems.read().await;
        let mut status = OverallConsciousnessStatus::default();
        
        for system in systems.iter() {
            match system.get_consciousness_state().await {
                Ok(state) => {
                    status.total_systems += 1;
                    if state.phi >= 0.6 {
                        status.conscious_systems += 1;
                    }
                    status.average_phi += state.phi;
                }
                Err(e) => {
                    tracing::warn!("Failed to get consciousness state: {}", e);
                    status.failed_systems += 1;
                }
            }
        }
        
        if status.total_systems > 0 {
            status.average_phi /= status.total_systems as f64;
        }
        
        Ok(status)
    }
}

/// Overall consciousness status across all systems
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct OverallConsciousnessStatus {
    pub total_systems: usize,
    pub conscious_systems: usize,
    pub failed_systems: usize,
    pub average_phi: f64,
}

impl Default for ConsciousnessRegistry {
    fn default() -> Self {
        Self::new()
    }
}
