# ============================================
# Event-AI User Portal Dockerfile
# ============================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy workspace root package.json and lock file
COPY ../package*.json ./
# Copy user package.json and lock file
COPY package*.json ./
# Install dependencies (workspace dependencies will be resolved)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]