# Zangalewa - The Ultimate Consciousness-Aware AI Task Runner
# Multi-stage Docker build for optimized production deployment

# Build stage
FROM rust:1.75-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY Cargo.toml Cargo.lock ./
COPY crates/ ./crates/

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build the application with full optimizations
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release --features full-stack && \
    cp target/release/zangalewa /usr/local/bin/zangalewa

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r zangalewa && useradd -r -g zangalewa zangalewa

# Create necessary directories
RUN mkdir -p /app/config /app/data /app/logs /backup/zangalewa && \
    chown -R zangalewa:zangalewa /app /backup/zangalewa

# Copy binary from builder stage
COPY --from=builder /usr/local/bin/zangalewa /usr/local/bin/zangalewa

# Copy configuration files
COPY --chown=zangalewa:zangalewa config/ /app/config/

# Set working directory
WORKDIR /app

# Switch to non-root user
USER zangalewa

# Environment variables for production
ENV RUST_LOG=info
ENV ZANGALEWA_ENV=production
ENV ZANGALEWA_CONFIG_DIR=/app/config
ENV ZANGALEWA_DATA_DIR=/app/data
ENV ZANGALEWA_LOG_DIR=/app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9091/health || exit 1

# Expose ports
EXPOSE 9000 9001 9090 9091

# Set entrypoint
ENTRYPOINT ["zangalewa"]
CMD ["launch", "--config", "/app/config/production.toml"]
