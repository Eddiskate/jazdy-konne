# Jazdy Konne

Planer jazd konnych: instruktorzy, dzieci, konie i tygodniowy kalendarz slotów.

## Wymagania

- Node.js 20+
- MongoDB na `mongodb://127.0.0.1:27017` (u Ciebie już działa lokalnie)

## Uruchomienie

```bash
cd backend && npm install && npm run dev
cd frontend && npm start -- --proxy-config proxy.conf.json
```

Albo z katalogu głównego:

```bash
npm install
npm run dev
```

- Aplikacja: http://localhost:4200
- API: http://localhost:3000/api/health

Przy pierwszym starcie API doda przykładowych instruktorów, dzieci i konie, jeśli baza jest pusta.

## Easypanel

Dwa serwisy **App** (Dockerfile) + Mongo w tym samym projekcie — tak jak w harvest-moon.

### Backend (`backend/`)

Builder: **Dockerfile**, build path `/backend`.

| Zmienna | Przykład |
|--------|----------|
| `PORT` | port z panelu (np. `3000`) |
| `MONGO_URL` lub `MONGODB_URI` | `mongodb://mongo:hasło@projekt_mongo:27017/jazdy-konne` |
| `CORS_ORIGIN` | publiczny URL frontendu, np. `https://jazdy.example.com` |

Hasło ze znakami specjalnymi (`$`) jest kodowane automatycznie, a `authSource=admin` doklejane samo. Host = nazwa serwisu Mongo w Easypanel (nie `localhost`).

Po deployu: `/api/health` → `{ ok: true, mongo: true }`.

### Frontend (`frontend/`)

Builder: **Dockerfile**, build path `/frontend`.

| Zmienna | Przykład |
|--------|----------|
| `API_URL` | publiczny URL backendu, np. `https://api-jazdy.example.com` |

`API_URL` jest wstrzykiwane przy starcie kontenera (`env-config.js`), bez przebudowy obrazu.
