FROM node:20-alpine

# Install build tools for native dependencies (if any)
RUN apk add --no-cache python3 make g++ 

WORKDIR /usr/src/app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port (Cloud Run sets PORT env var dynamically, but defaults to 8080 usually. 
# We'll expose 4000 as a standard, but the app should use process.env.PORT)
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
