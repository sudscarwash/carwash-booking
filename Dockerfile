FROM node:22-bookworm

ENV PORT=3000

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install --include=dev

# Copy source files
COPY . .

# Build frontend and server bundle
RUN npm run build

# Create runtime directories
RUN mkdir -p uploads data

ENV NODE_ENV=production

EXPOSE 3000

# Start server
CMD ["node", "dist/server.cjs"]
