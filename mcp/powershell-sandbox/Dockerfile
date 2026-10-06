# powershell-sandbox-mcp — image container untuk MCP server.
#
# Base = PowerShell 7 (Linux) supaya script PowerShell dieksekusi di dalam container,
# bukan di host Windows. Node ditambahkan untuk menjalankan MCP stdio server.
ARG PS_IMAGE=mcr.microsoft.com/powershell:7.5-ubuntu-22.04
FROM ${PS_IMAGE}

ARG NODE_MAJOR=22

ENV DEBIAN_FRONTEND=noninteractive \
    POWERSHELL_TELEMETRY_OPTOUT=1 \
    POWERSHELL_UPDATECHECK=Off \
    PS_SANDBOX_ROOT=/sandbox \
    PS_SANDBOX_SHELL=pwsh

# Node runtime + toolchain minimal untuk build/test.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg xz-utils procps; \
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -; \
    apt-get install -y --no-install-recommends nodejs; \
    rm -rf /var/lib/apt/lists/*; \
    node --version; npm --version; pwsh --version

WORKDIR /app

# Layer dependency terpisah supaya rebuild cepat saat src berubah.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY src ./src

# Folder sandbox adalah bind mount dari host (lihat scripts/podman-run.ps1),
# jadi di image hanya disiapkan sebagai fallback.
RUN mkdir -p /sandbox/scripts /sandbox/work /sandbox/logs

# Non-root supaya script tidak bisa menulis ke image layer.
RUN set -eux; \
    (id -u sandboxer >/dev/null 2>&1) || useradd --create-home --shell /bin/bash --uid 1000 sandboxer; \
    mkdir -p /sandbox/scripts /sandbox/work /sandbox/logs; \
    chown -R sandboxer:sandboxer /sandbox /app
USER sandboxer

ENTRYPOINT ["node", "/app/src/server.js"]