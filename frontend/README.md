# StoryGate PWA Client & Python Server

## Overview

This repository contains two main components:

1. **Client (front-end)**: A Progressive Web App (PWA) built with React, TypeScript, Phaser 3, and Vite. Provides UI for tactical grid combat, chat with AI DM, character sheets, and more.
2. **Server (back-end)**: A FastAPI WebSocket server in Python. Hosts the core engine (RulesEngine, TurnManager, Movement, AIService, etc.), manages game state, and broadcasts events to clients.

---

## Table of Contents

- [StoryGate PWA Client \& Python Server](#storygate-pwa-client--python-server)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation \& Development](#installation--development)
    - [Front-end](#front-end)
    - [Back-end](#back-end)
  - [Building \& Production](#building--production)
    - [Front-end](#front-end-1)
    - [Back-end](#back-end-1)
  - [Docker Setup](#docker-setup)
  - [Testing](#testing)
    - [Front-end Unit Tests (Jest)](#front-end-unit-tests-jest)
    - [End-to-End Tests (Cypress)](#end-to-end-tests-cypress)
    - [Back-end Tests (pytest)](#back-end-tests-pytest)
  - [API Documentation](#api-documentation)
  - [Directory Structure](#directory-structure)
  - [Further Documentation](#further-documentation)

---

## Prerequisites

* **Node.js** >= 18
* **npm** or **yarn**
* **Python** >= 3.9
* **pipenv** or **venv** for Python dependencies
* **Docker** (for containerized builds)

---

## Environment Variables

Create a `.env` in the root:

```
VITE_SERVER_URL=ws://localhost:8000/ws
```

For deployment, set `VITE_SERVER_URL` to your production WebSocket endpoint.

---

## Installation & Development

### Front-end

```bash
# Install dependencies
npm install
# Start dev server (http://localhost:3000)
npm run dev
```

### Back-end

```bash
# Navigate to server folder
cd server
# Create venv and install
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Start FastAPI server
uvicorn server:app --reload --port 8000
```

---

## Building & Production

### Front-end

```bash
# Build static assets\ n npm run build
# Preview production build
npm run preview
```

### Back-end

```bash
# Run without reload
uvicorn server:app --host 0.0.0.0 --port 8000
```

---

## Docker Setup

Build and run the client:

```bash
# Build Docker image
docker build -t storygate-client .
# Run container
docker run -p 80:80 storygate-client
```

---

## Testing

### Front-end Unit Tests (Jest)

```bash
npm test
```

### End-to-End Tests (Cypress)

```bash
npm run dev &
cypress open
```

Or headless in CI via `npm run dev` + `cypress run`

### Back-end Tests (pytest)

```bash
# From server folder\ npytest
```

---

## API Documentation

FastAPI provides interactive API docs:

* Swagger UI: `http://localhost:8000/docs`
* Redoc: `http://localhost:8000/redoc`

---

## Directory Structure

```
/
├── .env
├── package.json
├── tsconfig.json
├── vite.config.ts
├── workbox-config.js
├── nginx.conf
├── Dockerfile
├── public/
│   ├── index.html
│   └── assets/
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── utils/PerformanceMonitor.ts
    ├── store/
    ├── network/
    ├── pages/
    ├── components/
    └── phaser/scenes/

server/
├── server.py
├── requirements.txt
└── (engine modules: config_manager.py, movement.py, etc.)
```

---

## Further Documentation

1. **Code Comments & Docstrings**

   * Front-end uses JSDoc/TSDoc comments for key components and utilities.
   * Back-end modules include Python docstrings; generate API docs via Sphinx or pdoc.

2. **Generated Docs**

   * **TypeDoc** for front-end TypeScript types and JSDoc: `npx typedoc --out docs-ts src`
   * **Sphinx** or **MkDocs** for Python: run `sphinx-quickstart` in `server/docs`.

3. **Storybook**

   * Consider adding **Storybook** for isolated UI component development.

4. **Operational Guide**

   * Deployment instructions for AWS Amplify/ECS and monitoring (Datadog).

---

**Maintainers**: Team StoryGate
**License**: MIT
