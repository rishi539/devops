# Stage 1: Build the React app
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
# Copy the built assets from the build stage (Vite outputs to 'dist')
COPY --from=build /app/dist /usr/share/nginx/html

# Optional: Add custom Nginx config if using React Router (to redirect all paths to index.html)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
