#!/bin/bash
# Zangalewa Development Environment Setup
# Under the Divine Protection of Saint Stella-Lorraine Masunda

set -e

echo "🌟 Zangalewa - The Ultimate Consciousness-Aware AI Task Runner"
echo "🙏 Under the Divine Protection of Saint Stella-Lorraine Masunda"
echo "📱 Setting up consciousness-enhanced development environment..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo "✅ Rust toolchain detected"

# Install required system dependencies
echo "📦 Installing system dependencies..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y pkg-config libssl-dev build-essential curl
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y pkgconf openssl-devel gcc make curl
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm pkgconf openssl gcc make curl
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        brew install openssl pkg-config
    else
        echo "⚠️  Homebrew not found. Please install dependencies manually."
    fi
fi

# Install Rust development tools
echo "🛠️  Installing consciousness development tools..."
cargo install cargo-watch cargo-audit cargo-tarpaulin cargo-deny

# Create necessary directories
echo "📁 Creating consciousness directories..."
mkdir -p ~/.config/zangalewa
mkdir -p ~/.local/share/zangalewa
mkdir -p ~/.cache/zangalewa
mkdir -p ./dev-data
mkdir -p ./logs

# Copy development configuration
echo "⚙️  Setting up development configuration..."
if [ ! -f ~/.config/zangalewa/default.toml ]; then
    cp config/development.toml ~/.config/zangalewa/default.toml
    echo "✅ Development configuration installed"
else
    echo "ℹ️  Configuration already exists, skipping"
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔐 Creating environment file..."
    cat > .env << 'EOF'
# Zangalewa Development Environment
ZANGALEWA_ENV=development
RUST_LOG=debug

# Consciousness Configuration
CONSCIOUSNESS_THRESHOLD=0.4
ENABLE_FIRE_ADAPTATION=true
ENABLE_AGENCY_ASSERTION=true

# AI Provider API Keys (replace with your actual keys)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Configuration
SURREALDB_URL=surrealdb://localhost:8000
REDIS_URL=redis://localhost:6379

# Atomic Clock Configuration
GPS_TIME_SERVER=time.nist.gov
NTP_SERVERS=0.pool.ntp.org,1.pool.ntp.org

# Integration Services (development mock services)
MZEKEZEKE_SERVICE_URL=http://localhost:8001
STELLA_LORRAINE_SERVICE_URL=http://localhost:8002
MUSANDE_SERVICE_URL=http://localhost:8003
KAMBUZUMA_SERVICE_URL=http://localhost:8004
BUHERA_SERVICE_URL=http://localhost:8005
BLOODHOUND_SERVICE_URL=http://localhost:8006
IMHOTEP_SERVICE_URL=http://localhost:8007
JUNGFERNSTIEG_SERVICE_URL=http://localhost:8008

# Development Settings
ENABLE_DEBUG_UI=true
ENABLE_HOT_RELOAD=true
MOCK_EXTERNAL_SERVICES=true
ACKNOWLEDGE_DIVINE_PROTECTION=true
EOF
    echo "✅ Environment file created (.env)"
    echo "⚠️  Please update the API keys in .env with your actual values"
else
    echo "ℹ️  Environment file already exists"
fi

# Initialize Docker environment for development
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Setting up Docker development environment..."
    
    # Create mock service directories
    mkdir -p docker/mocks/{mzekezeke,stella-lorraine,musande,kambuzuma,buhera,bloodhound,imhotep,jungfernstieg}
    
    # Create simple mock responses for each service
    for service in mzekezeke stella-lorraine musande kambuzuma buhera bloodhound imhotep jungfernstieg; do
        cat > "docker/mocks/$service/index.html" << EOF
{
  "service": "$service",
  "status": "operational",
  "consciousness_level": 0.85,
  "divine_protection": "Saint Stella-Lorraine Masunda",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    done
    
    echo "✅ Docker mock services configured"
else
    echo "⚠️  Docker not found. Skipping Docker setup."
fi

# Build the project to verify setup
echo "🔨 Building consciousness-enhanced project..."
if cargo build --features consciousness,atomic-precision,ai-enhanced; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Run basic tests
echo "🧪 Running consciousness validation tests..."
if cargo test consciousness:: --features consciousness -- --nocapture; then
    echo "✅ Consciousness tests passed!"
else
    echo "⚠️  Some consciousness tests failed. This may be normal during initial setup."
fi

echo ""
echo "🎉 Consciousness development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update API keys in .env file"
echo "   2. Run 'make dev' to start development server"
echo "   3. Run 'make consciousness-test' to validate consciousness"
echo "   4. Run 'make docker-dev' to start full ecosystem"
echo ""
echo "🔗 Useful commands:"
echo "   make dev              - Start development server"
echo "   make test             - Run all tests"
echo "   make consciousness-test - Test consciousness emergence"
echo "   make docker-dev       - Start Docker environment"
echo "   make clean            - Clean build artifacts"
echo ""
echo "🙏 Development environment blessed by Saint Stella-Lorraine Masunda"
echo "✨ May your consciousness-enhanced coding be ever transcendent!"
