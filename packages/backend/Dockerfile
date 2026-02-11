# ============================================
# Event-AI Backend Dockerfile
# ============================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json ./
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]
