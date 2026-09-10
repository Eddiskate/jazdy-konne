# Easypanel: Dockerfile w katalogu głównym repo (build path = /)
FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]
