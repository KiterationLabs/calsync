# Use a small, modern Node image
FROM node:20-alpine AS base

# Add minimal tools (optional: tzdata if you want local time)
RUN apk add --no-cache tzdata tini

# Set timezone if you want logs in Stockholm time (optional)
ENV TZ=Europe/Stockholm

# Create app directory and use non-root user
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copy only package files first for better caching
COPY package.json package-lock.json* ./

# Install prod deps (use npm ci for reproducible builds)
RUN npm ci --omit=dev

# Copy the rest of your source
COPY . .

# Set NODE_ENV
ENV NODE_ENV=production

# Expose the port your Fastify server listens on
EXPOSE 3000

# Optional: Healthcheck if your app has /health or /metrics
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Switch to non-root for safety
USER nodeuser

# Use tini as PID 1 to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start your app
CMD ["npm", "start"]
