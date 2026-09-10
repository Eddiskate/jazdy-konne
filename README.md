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

Jeden serwis **App** (Dockerfile w katalogu głównym) + Mongo w tym samym projekcie.
Frontend i API są w jednym kontenerze, pod jednym adresem (`/api` idzie do backendu).

| Zmienna | Przykład |
|--------|----------|
| `PORT` | port z panelu (np. `3000`) |
| `MONGO_URL` lub `MONGODB_URI` | `mongodb://mongo:hasło@projekt_mongo:27017/jazdy-konne` |

`CORS_ORIGIN` nie jest potrzebne. Hasło ze znakami specjalnymi (`$`) jest kodowane automatycznie, a `authSource=admin` doklejane samo. Host = nazwa serwisu Mongo (nie `localhost`).

Po deployu: `/api/health` → `{ ok: true, mongo: true }`.
