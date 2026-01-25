# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install uv
RUN pip install uv

# Copy only requirements first
COPY pyproject.toml ./

# Create venv and install dependencies
RUN uv venv /app/.venv
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"
# Note: we need to install dependencies without the project itself first if we want better caching
# but with uv pip install . it's fine for now if we copy . later.
# Actually, let's just copy everything after uv venv but before uv pip install .
COPY . .
RUN uv pip install .

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy venv from builder
COPY --from=builder /app/.venv /app/.venv
COPY app ./app

# Add venv to path
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Version Info
ARG COMMIT_SHA=unknown
ARG VERSION=0.0.0
ENV COMMIT_SHA=${COMMIT_SHA}
ENV VERSION=${VERSION}

# Command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
