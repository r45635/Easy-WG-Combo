# Digest-pinned for reproducibility (matches the other images in this project).
# Dependabot refreshes the digest on new 22-bookworm-slim releases.
FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370
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
