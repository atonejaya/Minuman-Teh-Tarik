FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (leverages Docker layer caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source
COPY src ./src

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 && \
    chown -R nodeapp:nodejs /app
USER nodeapp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start server
CMD ["node", "src/server.js"]
