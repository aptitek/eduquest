<p align="center">
  <img src="./branding/aptipiou.svg" alt="Aptipiou Mascot" width="150" />
  <br />
  <img src="./branding/aptitek.svg" alt="Aptitek Logo" width="220" />
</p>

🌐 _[English version](./README.md)_

# EduQuest 🎮📚

EduQuest est un système de gestion de l'apprentissage (LMS) gamifié sous forme de jeu de rôle pédagogique.

Ce dépôt est structuré comme un monorepo à l'aide de **npm Workspaces**.

## 📂 Structure du Monorepo

- **`packages/shared`** : 📦 Types TypeScript et constantes du jeu partagés entre le frontend et le backend (ex: structures d'utilisateurs, calculs d'XP, quêtes).
- **`apps/backend`** : ⚙️ API de backend sous forme de Cloudflare Worker utilisant **Hono** et **Drizzle ORM** (connexion à une base de données PostgreSQL).
- **`apps/frontend`** : 🎮 Application React client (SPA) construite avec **Vite**, **TypeScript**, **Tailwind CSS v4** pour l'interface, **Zustand** pour l'état du jeu et **Framer Motion** pour les animations.

---

## 🛠️ Démarrage et Développement

Les dépendances sont installées et liées automatiquement au niveau de la racine.

### Prérequis

- **Node.js** (v18+)
- **npm** (v9+)

### Installation

Installez toutes les dépendances du projet depuis la racine :

```bash
npm install
```

### Commandes Globales

- **Démarrer en mode développement (Frontend & Backend)** :
  ```bash
  npm run dev
  ```

* **Compiler toutes les applications et packages** :
  ```bash
  npm run build
  ```

---

## 🏗️ Architecture et Design System (Frontend)

L'application frontend applique les principes du **Design Atomique** dans `apps/frontend/src/components` :

1.  **Atoms** : Composants graphiques de base sans logique (ex: bouton, badge d'XP, avatar).
2.  **Molecules** : Combinaison d'atomes (ex: barre de progression de quête, ligne d'icônes).
3.  **Organisms** : Blocs complexes et interactifs (ex: carte de jeu interactive, panneau latéral d'inventaire).
4.  **Templates** : Squelettes de mise en page réutilisables (ex: mise en page du jeu avec barre d'état).

La logique métier est quant à elle découplée et gérée dans le dossier `features/` :

- `auth/` : Session de l'utilisateur et gestion des rôles (Joueur vs Maître du Jeu).
- `game/` : Moteur de rendu de la carte de progression, déplacements et boucle de jeu.
- `activities/` : Logique de validation des leçons, combats de boss et gains d'XP.
- `gamemaster/` : Outils de l'enseignant pour modifier la carte ou voir les statistiques.

---

## 🎨 Attribution

Ce projet est fièrement développé et maintenu par **[Aptitek](https://aptitek.io)** (fondé par **Antoine GRÉA**).

Pour plus d'informations ou pour collaborer sur des formations en IA, dev et no-code, visitez **[aptitek.io](https://aptitek.io)** ! 🐣💻
