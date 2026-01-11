# Base stage
FROM node:20-slim as base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Development stage
FROM base as development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Build stage
FROM base as builder
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine as production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
