# FERME MANAGEMENT

> **Farm Operations & Poultry Management ERP**  
> Système de gestion complet pour exploitation avicole au Maroc (3 hectares, 4 poulaillers, 1 000 têtes, 700 oiseaux au démarrage).  
> Architecture Cloud-native à **0 $/mois** : Cloudflare Pages + Supabase PostgreSQL + Progressive Web App (PWA) Offline-First.

---

## 1. Table des matières

1. [Architecture Globale](#architecture-globale)
2. [Stack Technique](#stack-technique)
3. [Configuration & Variables d'environnement](#configuration--variables-denvironnement)
4. [Mise en place de Supabase & Base de données](#mise-en-place-de-supabase--base-de-données)
5. [Développement Local](#développement-local)
6. [Déploiement à Coût Zéro ($0/mois)](#déploiement-à-coût-zéro-0mois)
7. [Installation PWA (Android & iOS)](#installation-pwa-android--ios)
8. [Configuration des Notifications Push (Web Push API)](#configuration-des-notifications-push-web-push-api)
9. [Architecture Hors-Ligne & Synchronisation](#architecture-hors-ligne--synchronisation)
10. [Sécurité & Rôles (RLS)](#sécurité--rôles-rls)
11. [Limites du Tier Gratuit](#limites-du-tier-gratuit)
12. [Sauvegarde & Reprise d'Activité](#sauvegarde--reprise-dactivité)

---

## 2. Architecture Globale

```
               ┌────────────────────────────────────────────────────────┐
               │              CLIENT APPLICATION (PWA)                  │
               │   React 19 + TypeScript + Vite + Tailwind CSS v4       │
               │   Zustand (State) + TanStack Query + Dexie (IndexedDB) │
               │   Service Worker (Cache Shell + Web Push Sync)         │
               └───────────────────────┬────────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
               ┌────────────────────────────────────────────────────────┐
               │                  SUPABASE BACKEND                      │
               │   - PostgreSQL 15+ (Database Ledger & Triggers)        │
               │   - Row Level Security (RLS) : OWNER vs PARTNER        │
               │   - GoTrue Auth (Session Management)                   │
               │   - PostgREST API (Direct Secure Queries)              │
               │   - Realtime Engine (Change Broadcasting)              │
               │   - Audit Triggers (Immutable Mutation Log)            │
               └────────────────────────────────────────────────────────┘
```

---

## 3. Stack Technique

- **Frontend** : React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts.
- **Formulaires & Validation** : React Hook Form, Zod.
- **Stockage Local** : Dexie.js (IndexedDB) pour mutations hors-ligne & mise en cache.
- **Backend & Base de données** : Supabase PostgreSQL (34 tables normalisées, fonctions PL/pgSQL, déclencheurs d'audit et de calculs).
- **Rapports & Exports** : Papaparse (CSV), jsPDF & jsPDF-Autotable (PDF).
- **Format monétaire** : Dirham Marocain (`MAD` affiché `DH`).
- **Langue par défaut** : Français (`fr-MA`).

---

## 4. Configuration & Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://zchpcztyraleqpajcwdx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_VAPID_PUBLIC_KEY=
```

---

## 5. Mise en place de Supabase & Base de données

Les scripts SQL se trouvent dans le dossier `supabase/migrations/` et `supabase/seed.sql` :

1. Ouvrir le **SQL Editor** sur votre tableau de bord Supabase (`https://supabase.com/dashboard/project/zchpcztyraleqpajcwdx/sql`).
2. Exécuter `supabase/migrations/001_schema.sql` :
   - Crée les 34 tables, les index optimisés, et les triggers de calcul (reconstitution automatique des stocks, des effectifs par événements, soldes débiteurs/créditeurs, et journal d'audit).
3. Exécuter `supabase/migrations/002_rls.sql` :
   - Active la Row Level Security sur toutes les tables.
   - Restreint les écritures/mutations exclusivement au rôle `OWNER`.
   - Garantit l'accès en lecture seule pour le rôle `PARTNER`.
4. Exécuter `supabase/seed.sql` :
   - Initialise les 4 poulaillers (P1, P2, P3, P4 - 250 têtes chacun).
   - Configure les catégories d'inventaire, races avicoles (ISA Brown, Cobb 500, etc.), et règles d'alertes.

---

## 6. Développement Local

```bash
# Installer les dépendances
npm install

# Lancer les tests automatisés
npm run test

# Lancer le serveur de développement local
npm run dev

# Compiler pour la production
npm run build
```

---

## 7. Déploiement à Coût Zéro ($0/mois)

### Option A : Cloudflare Pages (Recommandé)

1. Connectez votre dépôt Git à [Cloudflare Pages](https://pages.cloudflare.com).
2. Configuration de compilation :
   - **Framework preset** : `Vite`
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
3. Ajoutez les variables d'environnement dans les paramètres Cloudflare Pages (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Déployez ! Vous obtenez une URL HTTPS gratuite avec CDN mondial illimité.

### Option B : Déploiement Direct via Wrangler CLI

```bash
npx wrangler pages deploy dist --project-name ferme-management
```

---

## 8. Installation PWA (Android & iOS)

L'application respecte les standards PWA (Web App Manifest, Service Worker avec stratégie Cache-First, icônes adaptatives, affichage `standalone`).

### Android (Chrome / Edge / Firefox)
1. Ouvrez l'URL dans Google Chrome.
2. Une bannière **« Installer l'application »** apparaît automatiquement, ou cliquez sur les 3 points verticaux en haut à droite > **« Installer l'application »** / **« Ajouter à l'écran d'accueil »**.
3. L'application apparaît sur votre écran d'accueil sans barre d'adresse de navigateur.

### iOS / iPadOS (Safari)
1. Ouvrez l'URL dans Safari.
2. Touchez le bouton **Partager** (icône rectangle avec flèche vers le haut).
3. Faites défiler et sélectionnez **« Sur l'écran d'accueil »**.
4. Validez le nom **« FERME »**. L'icône est créée et s'exécute en plein écran.

---

## 9. Architecture Hors-Ligne & Synchronisation

1. **Persistance Locale** : Chaque opération enregistrée en mode déconnecté est stockée dans la base IndexedDB locale avec un identifiant UUID v4 unique.
2. **Indicateur d'état** : Un badge en haut et dans le menu affiche en temps réel :
   - 🟢 `SYNCHRONISÉ`
   - 🟡 `HORS LIGNE (X en attente)`
   - 🔴 `ERREUR SYNC (réessayer)`
3. **Moteur de synchronisation** : Dès que l'accès réseau est rétabli, les mutations sont rejouées séquentiellement. Grâce à l'idempotence des clés primaires UUID, aucun doublon ne peut être inséré.

---

## 10. Sécurité & Rôles (RLS)

- **Authentification** : Gestion via tokens JWT signés par Supabase Auth.
- **Rôle Propriétaire (OWNER)** : Création, modification, suppression, gestion financière, invitation de partenaires.
- **Rôle Partenaire (PARTNER)** : Consultation intégrale des tableaux de bord, données d'élevage, production et finances, mais **interdiction absolue de modification**.
- La sécurité est garantie au niveau **base de données** par PostgreSQL RLS. Même une requête REST API directe effectuée par un partenaire sera immédiatement rejetée par la base de données.

---

## 11. Limites du Tier Gratuit

L'architecture est dimensionnée pour rester indéfiniment sur les plans gratuits :
- **Supabase Free Tier** :
  - Base de données : 500 Mo (suffisant pour plus de 5 ans d'historique à l'échelle de 1 000 têtes).
  - Bande passante : 2 Go / mois.
  - Utilisateurs actifs mensuels : 50 000 (la ferme en utilise 2 à 5).
- **Cloudflare Pages Free Tier** :
  - Bande passante et requêtes illimitées.
  - 500 builds de déploiement par mois.
- **Coût total récurrent : 0 DH / mois.**

---

## 12. Sauvegarde & Reprise d'Activité

1. **Sauvegardes Quotidiennes Supabase** : Les sauvegardes WAL et dumps sont accessibles directement depuis la console Supabase (Settings > Database > Backups).
2. **Export Local Manuel** : La page **Rapports** permet d'exporter à tout moment l'ensemble des données en format CSV et PDF imprimable pour archivage physique ou tableur Excel.
