<p align="center">
  <img src="./branding/aptipiou.svg" alt="Mascotte Aptipiou" width="150" />
  <br />
  <img src="./branding/aptitek.svg" alt="Logo Aptitek" width="220" />
</p>

_Version anglaise : [README.md](./README.md)_

# EduQuest

EduQuest est un système de gestion de l'apprentissage gamifié, conçu comme un jeu de rôle pédagogique. Les étudiants progressent sur une carte d'activités, rejoignent des cohortes et des guildes, terminent des quêtes et des boss, et contribuent à une progression de guilde stockée en base de données.

Le dépôt est un monorepo TypeScript basé sur npm workspaces.

## Structure Du Projet

- `apps/frontend` : SPA React avec Vite, TypeScript, Tailwind CSS 3, DaisyUI 5, Zustand, Framer Motion, TanStack Table et Lucide.
- `apps/backend` : API Cloudflare Worker avec Hono, Drizzle ORM, PostgreSQL, authentification JWT et routes de gestion/jeu.
- `packages/shared` : Interfaces TypeScript et contrats de jeu partagés entre le frontend et le backend.
- `Taskfile.yml` : Tâches de développement pour lancer, compiler, nettoyer et vérifier les règles de design.

## État Actuel

- L'authentification prend en charge GitHub SSO et une connexion de debug locale.
- L'interface de gestion charge et met à jour les écoles, cohortes, étudiants, profils, invitations et logos via le backend.
- La carte charge les activités via `/api/map`, et la complétion d'une activité est persistée via `/api/map/activities/:activityId/complete`.
- Le dock du tableau de bord et les notifications d'en-tête chargent leurs données via `/api/dashboard`, avec jauges, jalons, récompenses et notifications stockés en base.
- Les migrations Drizzle incluent des données de démonstration pour écoles, campus, cohortes, guildes, utilisateurs, étudiants, adhésions, personnages, activités, combats, jauges, récompenses et notifications.
- Les locales anglaise et française couvrent le dock, les jalons, récompenses, boutons, notifications, écrans de gestion, auth, profil, carte et panneau de détail.
- Les tokens de design et les frontières Atomic Design sont vérifiés par `apps/frontend/scripts/audit-design-system.mjs`.

## Prérequis

- Node.js 22.22.3 est déclaré dans `package.json` via Volta. Node 18+ peut fonctionner, mais Node 22 est la version attendue.
- npm 9+.
- Task, optionnel mais recommandé : [taskfile.dev](https://taskfile.dev).
- Wrangler, installé dans les dépendances de développement racine.
- PostgreSQL pour les données de l'API backend. Sans `DATABASE_URL`, les routes adossées à la base renvoient une erreur de configuration.

## Installation

Installez les dépendances depuis la racine :

```bash
npm install
```

## Développement

Lancer le frontend et le backend :

```bash
task run
```

Commande npm équivalente :

```bash
npm run dev
```

Lancer uniquement le Worker backend :

```bash
task run-backend
```

Lancer uniquement le frontend :

```bash
task run-frontend
```

Lancer le frontend et ouvrir le navigateur :

```bash
task run-frontend-open
```

## Stack Locale Docker

Lancer toute la stack locale avec PostgreSQL, les migrations Drizzle automatiques, le Worker backend et le frontend :

```bash
docker compose up --build
```

Compose expose le frontend sur `http://localhost:5173`, le backend sur `http://localhost:8787` et PostgreSQL sur `localhost:5432`. La base utilise `eduquest` comme nom de base, utilisateur et mot de passe, et conserve ses données dans le volume Docker `postgres_data`.

Le processus de développement backend applique les migrations Drizzle en attente avant de démarrer Wrangler, puis surveille `apps/backend/src/db/migrations` et applique automatiquement les nouveaux fichiers de migration pendant le hot reload Docker. Pour recréer la base locale depuis zéro :

```bash
docker compose down -v
docker compose up --build
```

## Compilation Et Vérifications

Compiler tous les workspaces qui exposent un script de build :

```bash
npm run build
```

Compiler via le Taskfile :

```bash
task compile
```

Exécuter l'audit du design system et des frontières Atomic Design :

```bash
task lint
```

Vérifier le TypeScript backend :

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json
```

Le build frontend utilise des chunks Vite manuels pour React, Framer Motion, TanStack et le code applicatif afin d'éviter les avertissements de bundle trop volumineux.

## Environnement

L'application distingue explicitement les modes développement et production. Les données mock et l'authentification de debug sont disponibles uniquement lorsque `APP_ENV`/`VITE_APP_ENV` ne valent pas `production`.

Créez le fichier d'environnement local du backend avant de lancer Wrangler :

```bash
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
```

Modifiez ensuite `apps/backend/.dev.vars` et configurez `DATABASE_URL` avec une base PostgreSQL sur laquelle les migrations du projet ont été appliquées. Wrangler charge ce fichier lorsque le backend est lancé depuis `apps/backend`.

Valeurs frontend :

```bash
VITE_APP_ENV=development
VITE_BACKEND_BASE_URL=http://localhost:8787
VITE_ENABLE_DEV_TOOLS=true
```

Pour les builds frontend de production :

```bash
VITE_APP_ENV=production
VITE_BACKEND_BASE_URL=https://your-api.example.com
VITE_ENABLE_DEV_TOOLS=false
```

Valeurs du Worker backend :

```bash
APP_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:8787/api/auth/github/callback
FRONTEND_URL=http://localhost:5173
ENABLE_DEBUG_AUTH=true
```

Les uploads de fichiers utilisent le binding R2 `ASSETS` déclaré dans `apps/backend/wrangler.toml`. En développement, Wrangler utilise une simulation R2 locale par défaut : les photos de profil et logos d'école peuvent donc être téléversés localement sans bucket Cloudflare réel. Les objets téléversés sont servis par le Worker à l'adresse `/assets/<object-key>`, sauf si `ASSET_PUBLIC_BASE_URL` pointe vers un bucket public ou un CDN.

`DATABASE_URL` est requis pour les données de l'API, y compris l'authentification locale de développement. Sans cette variable, les routes adossées à la base renvoient une erreur de configuration `503` et GitHub OAuth redirige vers le frontend avec `error=missing_database_url`. En production, les routes exigent de vrais bindings comme `DATABASE_URL`, `JWT_SECRET` et `FRONTEND_URL`; l'authentification de debug est désactivée même si son flag est défini.

Utilisez `apps/frontend/.env.example` et `apps/backend/.dev.vars.example` comme points de départ locaux. Ne commitez jamais de vrais fichiers `.env` ou `.dev.vars`.

## Base De Données

Le schéma backend se trouve dans `apps/backend/src/db/schema.ts`.

Les migrations sont dans `apps/backend/src/db/migrations`. Elles réconcilient le schéma courant et ajoutent des données de démonstration déterministes pour les environnements locaux/dev.

Générer de nouvelles migrations après une modification du schéma :

```bash
npm run db:generate --workspace backend
```

En développement, `npm run dev --workspace backend` applique les migrations en attente au démarrage et surveille `apps/backend/src/db/migrations` pour les nouvelles migrations générées. La configuration Drizzle lit `DATABASE_URL` depuis l'environnement en priorité, puis depuis `apps/backend/.dev.vars`.

En production, `npm run deploy --workspace backend` exécute `npm run db:migrate` avant `wrangler deploy`. Vérifiez que l'environnement de déploiement expose le `DATABASE_URL` de production ; les secrets Cloudflare Worker restent nécessaires pour le Worker déployé. Gardez `schema.ts`, les migrations et les types partagés synchronisés.

## Règles De Code

- Utilisez les types de `@eduquest/shared` pour les contrats partagés.
- Gardez la logique métier dans `features`, `pages`, les routes backend ou les services backend. Les composants réutilisables dans `components` doivent rester aussi présentiels que possible.
- Respectez le sens des imports Atomic Design : les atoms ne doivent pas importer molecules/organisms/templates, les molecules ne doivent pas importer organisms/templates, et les organisms ne doivent pas importer templates.
- Utilisez d'abord les composants sémantiques DaisyUI, puis les utilitaires Tailwind, et créez des composants custom uniquement lorsque le design local l'exige.
- Utilisez les tokens sémantiques `gaming`, `text`, `status` et `accent`. N'ajoutez pas de couleurs hexadécimales ou RGB brutes dans le TSX.
- Ajoutez les nouvelles couleurs dans `apps/frontend/src/styles/index.css` et exposez-les dans `apps/frontend/tailwind.config.js`.
- Placez tout texte visible par l'utilisateur dans `apps/frontend/src/locales/en.ts` et `apps/frontend/src/locales/fr.ts`.
- Lancez `task lint` avant une PR ou un commit qui touche l'interface.

## Attribution

EduQuest est développé et maintenu par [Aptitek](https://aptitek.io), fondé par Antoine GREA.
