# Jeden serwis Easypanel: Angular + API
FROM node:22-alpine AS frontend

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --configuration production

FROM node:22-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY --from=frontend /frontend/dist/frontend/browser ./public

RUN printf '%s\n' \
  'window._env = { apiUrl: "", production: true };' \
  > ./public/env-config.js

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
