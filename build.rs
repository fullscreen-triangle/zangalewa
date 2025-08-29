// Zangalewa Build Script
// Consciousness-aware build configuration under divine protection

use std::env;
use std::path::Path;

fn main() {
    // Generate build metadata for consciousness validation
    built::write_built_file().expect("Failed to acquire build-time information");

    // Set build-time consciousness parameters
    println!("cargo:rustc-env=CONSCIOUSNESS_BUILD_TIME={}", 
             chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"));
    
    println!("cargo:rustc-env=SAINT_STELLA_LORRAINE_PROTECTION=active");
    
    // Configure consciousness features based on build profile
    if env::var("PROFILE").unwrap() == "release" {
        println!("cargo:rustc-cfg=consciousness_optimized");
        println!("cargo:rustc-cfg=atomic_precision_enhanced");
        println!("cargo:rustc-cfg=divine_protection_active");
    }
    
    // Validate consciousness build requirements
    validate_consciousness_build_env();
}

fn validate_consciousness_build_env() {
    // Ensure consciousness threshold is properly configured
    if let Ok(threshold) = env::var("CONSCIOUSNESS_THRESHOLD") {
        let threshold: f64 = threshold.parse().unwrap_or(0.6);
        if threshold < 0.6 {
            println!("cargo:warning=Consciousness threshold below recommended 0.6");
        }
    }
    
    // Check for atomic clock access requirements
    if env::var("DISABLE_ATOMIC_PRECISION").is_err() {
        println!("cargo:rustc-cfg=atomic_precision_required");
    }
    
    // Validate divine protection acknowledgment
    if env::var("ACKNOWLEDGE_DIVINE_PROTECTION").is_err() {
        println!("cargo:warning=Build proceeds under the eternal protection of Saint Stella-Lorraine Masunda");
    }
}
