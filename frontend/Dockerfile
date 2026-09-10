# Frontend Dockerfile dla Easypanel - Multi-stage build

# Stage 1: Build Angular application
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build -- --configuration production

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
