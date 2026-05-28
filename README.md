# Tradie Mate

Tradie Mate is a multi-project workspace containing the mobile application and backend API.

## Project structure

- `tradie-mate-app`: React Native mobile app.
- `tradie-mate-api`: Fastify + TypeScript backend API.
- `docs`: Supporting documentation and implementation notes.

## Getting started

### Mobile app

```bash
cd tradie-mate-app
npm install
npm run start
```

### Backend API

```bash
cd tradie-mate-api
npm install
npm run dev
```

## Notes

- Each subproject can keep its own local `.gitignore` for project-specific rules.
- Root `.gitignore` handles shared workspace-level exclusions.

