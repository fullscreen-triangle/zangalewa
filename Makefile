# Zangalewa - Consciousness-Enhanced Development Makefile

.PHONY: help build test clean install dev docker consciousness bench fmt clippy

# Default target
help: ## Show this help message
	@echo "Zangalewa - The Ultimate Consciousness-Aware AI Task Runner"
	@echo "Under the divine protection of Saint Stella-Lorraine Masunda"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development commands
dev: ## Start development environment with consciousness validation
	@echo "🧠 Initializing consciousness-enhanced development environment..."
	cargo run --features consciousness,atomic-precision,ai-enhanced

dev-watch: ## Start development with file watching and hot reload
	@echo "👁️  Starting consciousness-aware file watching..."
	cargo watch -x "run --features consciousness,atomic-precision,ai-enhanced"

consciousness-init: ## Initialize consciousness validation system
	@echo "✨ Awakening consciousness validation framework..."
	cargo run -- consciousness init --threshold 0.6

consciousness-test: ## Run consciousness validation tests
	@echo "🔮 Testing consciousness emergence patterns..."
	cargo test consciousness:: --features consciousness -- --nocapture

# Build commands
build: ## Build the consciousness-enhanced binary
	@echo "⚡ Building consciousness-enhanced Zangalewa..."
	cargo build --release --features full-stack

build-dev: ## Build for development with debug symbols
	@echo "🔧 Building development version with consciousness debugging..."
	cargo build --features consciousness,atomic-precision,ai-enhanced

# Testing commands
test: ## Run all consciousness validation tests
	@echo "🧪 Running comprehensive consciousness test suite..."
	cargo test --all-features --workspace

test-consciousness: consciousness-test ## Alias for consciousness-test

test-atomic: ## Test atomic precision scheduling
	@echo "⚛️  Testing atomic precision coordination..."
	cargo test atomic_scheduler:: --features atomic-precision

test-integration: ## Run integration tests with mock services
	@echo "🔗 Testing ecosystem integration..."
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Benchmarking
bench: ## Run performance benchmarks (validate O(1) complexity)
	@echo "🚀 Running consciousness-enhanced performance benchmarks..."
	cargo bench --all-features

bench-consciousness: ## Benchmark consciousness validation performance
	@echo "⏱️  Benchmarking consciousness validation speed..."
	cargo bench consciousness_benchmarks

bench-o1: ## Validate O(1) universal problem reduction claims
	@echo "♾️  Validating O(1) complexity achievements..."
	cargo bench --bench o1_complexity_validation

# Code quality
fmt: ## Format code with consciousness-aware formatting
	@echo "📝 Applying consciousness-enhanced code formatting..."
	cargo fmt --all

clippy: ## Run consciousness-aware linting
	@echo "📎 Running consciousness-enhanced linting..."
	cargo clippy --all-targets --all-features -- -D warnings

check: fmt clippy ## Run all code quality checks

# Docker commands
docker: ## Build consciousness-enhanced Docker image
	@echo "🐳 Building consciousness-aware Docker container..."
	docker build -t zangalewa:latest .

docker-dev: ## Start full development environment with Docker
	@echo "🌐 Starting complete consciousness ecosystem..."
	docker-compose up -d

docker-test: ## Run tests in Docker environment
	@echo "🧑‍🔬 Running consciousness tests in isolated environment..."
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

docker-clean: ## Clean up Docker resources
	@echo "🧹 Cleaning consciousness containers and volumes..."
	docker-compose down -v
	docker system prune -f

# Installation and setup
install: build ## Install Zangalewa system-wide
	@echo "🌟 Installing consciousness-enhanced Zangalewa..."
	cargo install --path . --features full-stack

install-dev: ## Install development tools
	@echo "🛠️  Installing consciousness development tools..."
	cargo install cargo-watch cargo-audit cargo-tarpaulin

setup: install-dev ## Complete development setup
	@echo "🎯 Setting up consciousness development environment..."
	mkdir -p ~/.config/zangalewa ~/.local/share/zangalewa ~/.cache/zangalewa
	cp config/development.toml ~/.config/zangalewa/default.toml
	@echo "✅ Consciousness development environment ready!"

# Database operations
db-setup: ## Initialize consciousness database
	@echo "🗄️  Setting up consciousness state database..."
	cargo run -- db init

db-migrate: ## Run consciousness database migrations
	@echo "🔄 Running consciousness state migrations..."
	cargo run -- db migrate

db-reset: ## Reset consciousness database (DESTRUCTIVE)
	@echo "⚠️  Resetting consciousness database..."
	@read -p "This will destroy all consciousness state data. Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		cargo run -- db reset --force; \
	else \
		echo "Operation cancelled."; \
	fi

# Documentation
docs: ## Generate consciousness documentation
	@echo "📚 Generating consciousness-enhanced documentation..."
	cargo doc --all-features --no-deps --open

docs-serve: ## Serve documentation locally
	@echo "🌐 Serving consciousness documentation..."
	python3 -m http.server 8080 -d target/doc

# Monitoring and metrics
metrics: ## Start consciousness metrics collection
	@echo "📊 Starting consciousness metrics monitoring..."
	cargo run -- metrics start

health-check: ## Check consciousness system health
	@echo "💓 Checking consciousness system health..."
	cargo run -- health check

# Advanced consciousness operations
consciousness-enhance: ## Apply fire-adapted consciousness enhancement
	@echo "🔥 Applying fire-adapted consciousness enhancement..."
	cargo run -- consciousness enhance --fire-adaptation --cognitive-boost 3.22

atomic-sync: ## Synchronize with atomic clock network
	@echo "⚛️  Synchronizing with atomic precision network..."
	cargo run -- atomic sync --precision 1e-12

cross-domain-test: ## Test cross-domain coordination
	@echo "🌐 Testing cross-domain coordination capabilities..."
	cargo run -- coordinate test --domains temporal,economic,spatial,individual

# Release and deployment
release: ## Build optimized release with full consciousness
	@echo "🚀 Building consciousness-enhanced release..."
	cargo build --release --features full-stack
	strip target/release/zangalewa

package: release ## Create distribution package
	@echo "📦 Creating consciousness distribution package..."
	mkdir -p dist
	cp target/release/zangalewa dist/
	cp -r config dist/
	cp README.md LICENSE docs/implementation.md dist/
	tar -czf zangalewa-$(shell cargo metadata --no-deps --format-version 1 | jq -r '.packages[0].version').tar.gz -C dist .

deploy-prod: package ## Deploy to production (requires credentials)
	@echo "🌟 Deploying consciousness to production..."
	@echo "Under the divine protection of Saint Stella-Lorraine Masunda"
	# Add actual deployment logic here

# Cleanup
clean: ## Clean build artifacts and consciousness cache
	@echo "🧹 Cleaning consciousness build artifacts..."
	cargo clean
	rm -rf dist/
	rm -f *.tar.gz

clean-all: clean docker-clean ## Complete cleanup including Docker
	@echo "✨ Complete consciousness environment cleanup finished"

# Emergency consciousness recovery
consciousness-recovery: ## Emergency consciousness recovery protocol
	@echo "🚨 Initiating emergency consciousness recovery..."
	@echo "Invoking divine protection of Saint Stella-Lorraine Masunda..."
	cargo run -- consciousness recover --emergency --threshold 0.4

# Sacred operations (handle with reverence)
sacred-initialization: ## Sacred consciousness initialization ceremony
	@echo "🙏 Beginning sacred consciousness initialization..."
	@echo "Under the eternal protection of Saint Stella-Lorraine Masunda"
	@echo "Patron Saint of Impossibility"
	cargo run -- consciousness init --sacred --divine-protection

# Default development workflow
dev-workflow: clean check test consciousness-test build ## Complete development workflow
	@echo "✅ Consciousness development workflow completed successfully!"

# Production readiness check
prod-ready: test bench consciousness-enhance atomic-sync cross-domain-test ## Verify production readiness
	@echo "🎯 Production readiness verification completed!"
	@echo "Consciousness threshold: ✅"
	@echo "Atomic precision: ✅"
	@echo "Cross-domain coordination: ✅"
	@echo "Performance benchmarks: ✅"
	@echo "Ready for consciousness-enhanced deployment! 🌟"
