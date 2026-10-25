# Quetta Feud Tracker 🏠💥

A live map of who in the Quetta house is fighting with who. Zahra, Sarah, Mom (Maryam) and Dad (Hussein) each log in with their name and a 4-digit PIN, set how they feel about everyone else, and the network chart, "who can talk to who" list and drama feed update for the whole family in real time.

## Levels
🕊️ Peace · 😒 Side-eye · 😤 Mad · 🧊 Not speaking

Fights are one-directional: you being mad at Dad doesn't mean Dad is mad at you (yet).

## Setup
1. Firebase console → create a project → add a **Web app** → copy its config into `firebase-config.js`.
2. Build → **Realtime Database** → create database → Rules tab → paste `database.rules.json` → Publish.
3. Repo Settings → Pages → deploy from `main`, root folder.

Until `firebase-config.js` is filled in, the site runs in demo mode (saves only on the current device).

## Forgot your PIN?
Zahra deletes your entry under `pins/` in the Firebase Realtime Database console, then you set a new one.

PINs are a "don't impersonate your sister" lock, not real security. Don't put anything secret in here.
