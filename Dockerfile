# Stage 1: Build the Vite application
FROM node:20-alpine AS build
WORKDIR /app

# Declare build arguments so Selise Blocks can pass environment variables
ARG VITE_BLOCKS_API_URL
ARG VITE_X_BLOCKS_KEY
ARG VITE_PROJECT_SLUG

# Export them to the environment so Vite embeds them in the build
ENV VITE_BLOCKS_API_URL=$VITE_BLOCKS_API_URL
ENV VITE_X_BLOCKS_KEY=$VITE_X_BLOCKS_KEY
ENV VITE_PROJECT_SLUG=$VITE_PROJECT_SLUG

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Add custom Nginx configuration to support React Router SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built assets from the dist folder
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
