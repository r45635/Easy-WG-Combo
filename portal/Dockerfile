FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p /data
EXPOSE 8080
CMD ["node", "server.js"]
