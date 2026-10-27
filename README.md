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

## API strony stajni

Publiczny zapis jazd dla strony Stajni Hrabhill. Klucz zostaje na serwerze strony, przeglądarka go nie widzi.

| Metoda | Ścieżka | Znaczenie |
|--------|---------|-----------|
| `GET` | `/api/public/slots?from=YYYY-MM-DD&to=YYYY-MM-DD` | Wolne okna: godzina i konie, bez danych innych jeźdźców |
| `POST` | `/api/public/reservations` | Zapis dziecka albo dorosłego na jedno wolne okno |

Nagłówek: `X-API-Key: PUBLIC_API_KEY` (minimum 16 znaków). Bez klucza endpoint zwraca 503.

| Zmienna | Domyślnie | Znaczenie |
|---------|-----------|-----------|
| `PUBLIC_API_KEY` | — | ten sam sekret co `JAZDY_API_KEY` na stronie |
| `PUBLIC_BOOKING_LEAD_HOURS` | `12` | jak wcześnie można zająć termin |
| `PUBLIC_HOURLY_RATE` | `0` | stawka nowej osoby ze strony, dopóki nie ustawisz jej w panelu |

Zapis tworzy jeźdźca (`source: website`) i jednorazową jazdę. Telefon, mail i opiekun widać przy dziecku oraz w szczegółach slotu. Świeża baza dostaje konie Rychu, Ksenia, Fruzia i Drago. Jeśli w kalendarzu są już inne konie, zmień nazwy w panelu — seed nie nadpisuje istniejącej bazy.

Koń z wyłączonym „Dostępny w kalendarzu jazd” nie wraca w `/api/public/slots` ani w nowych zapisach ze strony; w planerze też nie jest wybierany (chyba że już był w istniejącej jeździe).
