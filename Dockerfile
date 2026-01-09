# Use Node.js 20.19.0+ (required for Prisma 7) with Alpine
FROM node:20.19.0-alpine

# Set working directory
WORKDIR /app

# Install git and OpenSSL (required for npm packages and Prisma)
RUN apk add --no-cache git openssl

# Install dependencies first (for better caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify build output exists and find main.js
RUN ls -la dist/ || (echo "Build failed - dist directory not found" && exit 1)
RUN find dist -name "main.js" -type f || (echo "Build failed - main.js not found" && find dist -type f | head -20 && exit 1)
RUN test -f dist/main.js || (echo "dist/main.js missing - checking structure..." && find dist -name "*.js" | head -10 && exit 1)

# Remove devDependencies to reduce image size
RUN npm prune --production

# Verify dist still exists after prune
RUN test -f dist/main.js || (echo "dist/main.js missing after prune" && exit 1)

# Expose port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9090/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations, create admin (if needed), and start the application
# First resolve any failed migrations, then deploy new ones, then create admin, then start
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20251219000000_add_opening_hours_remove_email 2>/dev/null || true; npx prisma migrate deploy && (node scripts/create-admin.js || true) && npm run start:prod"]
