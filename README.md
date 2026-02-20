# Static Workspace

Monorepo con Frontend React e Backend NestJS.

## Struttura

```
Static/
├── frontend/   → React + TypeScript (Vite)
└── backend/    → NestJS (Node.js + TypeScript)
```

---

## 🖥️ Frontend (React + Vite)

Porta di sviluppo: **http://localhost:5173**

```bash
cd frontend
npm install       # solo la prima volta
npm run dev       # avvia il server di sviluppo
npm run build     # build di produzione
npm run preview   # anteprima della build
```

---

## ⚙️ Backend (NestJS)

Porta di sviluppo: **http://localhost:3000**

```bash
cd backend
npm install       # solo la prima volta
npm run start:dev # avvia con hot-reload
npm run build     # build di produzione
npm run start     # avvia in produzione
```

---

## �️ Database (PostgreSQL)

Il database viene avviato tramite **Docker**.

```bash
# Avvia il container PostgreSQL
docker-compose up -d

# Ferma il container
docker-compose down

# Ferma e rimuove i dati (reset completo)
docker-compose down -v
```

Credenziali di default (modificabili in `backend/.env`):

| Parametro | Valore default |
|-----------|---------------|
| Host      | `localhost`   |
| Porta     | `5432`        |
| Utente    | `postgres`    |
| Password  | `postgres`    |
| Database  | `staticdb`    |

---

## 🚀 Avvio rapido (dalla root)

```bash
# 1. Avvia il database
docker-compose up -d

# 2. Avvia il backend
npm run start:backend

# 3. Avvia il frontend
npm run start:frontend
```
