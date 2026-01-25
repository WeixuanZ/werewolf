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
ARG COMMIT_SHA=unknown
ARG VERSION=0.0.0
ENV COMMIT_SHA=${COMMIT_SHA}
ENV VERSION=${VERSION}
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine as production
COPY --from=builder /app/dist /usr/share/nginx/html
# Nginx 1.19+ supports templates for env substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
