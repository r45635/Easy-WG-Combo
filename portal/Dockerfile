# Digest-pinned for reproducibility (matches the other images in this project).
# Dependabot refreshes the digest on new 22-bookworm-slim releases.
FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436
WORKDIR /app
RUN apt-get update \
	&& DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fail2ban ca-certificates tar ufw \
	&& rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /data
EXPOSE 8080
CMD ["node", "server.js"]
