# Floor Plan Studio

A browser-based layout tool for arranging furniture on a floor plan at real-world scale. Plans and layouts are saved to **Firebase Firestore**; images live in **Firebase Storage**.

**Live app:**
- Firebase Hosting: https://zs-floor-plan-studio.web.app
- Vercel: https://floor-plan-studio.vercel.app

## Features

- **Saved floor plans** — persisted in Firestore, synced across devices
- **Upload a floor plan** — PNG or JPG of your room or blueprint
- **Calibrate scale** — auto-detect graphic scale bars, or set manually
- **Furniture catalog** — add inventory items at real-world dimensions
- **Drag, rotate, resize** — Konva canvas with transform handles
- **Undo / redo** — full change history with keyboard shortcuts (⌘Z / ⌘⇧Z)

## Local development

Local dev connects to the **same production Firebase project** as the hosted app (via `.env.development`).

```bash
npm install
npm run dev
```

Open http://localhost:5173 — changes save to the shared Firestore database.

## Deploy

Both Firebase Hosting and Vercel deploy from `master`/`main` on push.

| Platform | URL | Manual deploy |
|----------|-----|---------------|
| Firebase | https://zs-floor-plan-studio.web.app | `npm run firebase:hosting` |
| Vercel | https://floor-plan-studio.vercel.app | `npm run vercel:deploy` |

GitHub Actions deploys Firebase on push. Vercel auto-deploys via its GitHub integration.

Other Firebase commands:

```bash
npm run firebase:deploy   # Firestore + Storage rules
npm run firebase:seed     # Seed Unit 14A if database is empty
```

## Workflow

1. Open a saved floor plan from the sidebar (Unit 14A is seeded on first setup).
2. Scale is auto-detected from graphic scale bars when possible.
3. Add furniture from the catalog or create custom pieces.
4. Drag items into place; use handles to rotate and resize.
5. Edits auto-save to Firestore.

## Stack

- React + TypeScript + Vite
- Firebase (Firestore, Storage, Hosting)
- [Konva](https://konvajs.org/) / react-konva for the interactive canvas
- Tesseract.js for scale-bar OCR
