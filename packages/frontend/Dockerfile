# ============================================
# Event-AI Vendor Portal Dockerfile
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

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
