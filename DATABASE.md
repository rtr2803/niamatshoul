# Spécifications de la Base de Données — FERME MANAGEMENT

Système de gestion et grand livre avicole basé sur PostgreSQL et Supabase.

---

## 1. Principes Directeurs

1. **Grand Livre d'Événements (Immutable Ledger)** : Les stocks d'aliments, les effectifs d'animaux et les soldes financiers ne sont jamais écrasés arbitrairement. Ils sont reconstitués à partir des transactions et événements élémentaires.
2. **Auditabilité Complète** : Tout changement dans les tables opérationnelles déclenche l'écriture d'une ligne d'audit dans `audit_logs` contenant l'utilisateur, l'action, l'horodatage et les valeurs avant/après au format JSONB.
3. **Clés Primaires UUID** : Évite les conflits d'incrémentation lors de la synchronisation hors-ligne.
4. **Contraintes et Intégrité** : Rejet des valeurs négatives sur les quantités et montants.

---

## 2. Schéma Relationnel & Tables

### A. Utilisateurs & Configuration
- **`profiles`** : Profils utilisateurs liés à `auth.users`. Colonnes : `id (UUID PK)`, `email`, `full_name`, `role (OWNER | PARTNER)`, `avatar_url`, timestamps.
- **`farm`** : Paramètres de l'exploitation avicole. Colonnes : `id (UUID PK)`, `name`, `area_hectares` (3.00 ha), `currency` (MAD), `address`, `notes`.
- **`app_settings`** : Clé-valeur JSONB pour les réglages globaux (taille standard des sacs = 50 kg, devise, règles de validation).

### B. Infrastructures & Équipements
- **`poultry_houses`** : Bâtiments d'élevage. Colonnes : `id (UUID PK)`, `name`, `code`, `capacity` (250 têtes par défaut), `house_type`, `status` (`active`, `inactive`, `maintenance`), `is_active`.
- **`incubators`** : Matériel d'incubation. Colonnes : `id (UUID PK)`, `name`, `capacity`, `status`, `notes`.

### C. Gestion des Animaux (Par Lots)
- **`animal_types`** : Espèces (ex: `Poule pondeuse`, `Poule reproductrice`).
- **`animal_breeds`** : Races/souches (ex: `ISA Brown`, `Lohmann Brown`, `Cobb 500`).
- **`animal_lots`** : Lots d'oiseaux. Colonnes : `id`, `lot_number`, `animal_type_id`, `breed_id`, `sex`, `birth_date`, `origin`, `source_batch_id`, `initial_quantity`, `current_quantity`, `poultry_house_id`, `status`.
- **`animal_lot_events`** : Grand livre des mouvements d'animaux. Types d'événements :
  - `INITIAL_STOCK` (+)
  - `HATCH` (+)
  - `PURCHASE` (+)
  - `TRANSFER_IN` (+)
  - `TRANSFER_OUT` (-)
  - `MORTALITY` (-)
  - `SALE` (-)
  - `ADJUSTMENT` (+/-)

### D. Module d'Incubation (Achat d'Œufs Fécondés)
- **`incubation_batches`** : Lots d'incubation. Colonnes : `id`, `batch_number`, `supplier_id`, `incubator_id`, `date_received`, `eggs_placed`, `date_placed`, `expected_hatch_date`, `actual_hatch_date`, `eggs_hatched`, `eggs_failed`, `hatch_rate` (Généré automatiquement : `eggs_hatched / eggs_placed * 100`), `status`.
- **`incubation_events`** : Suivi des étapes (`RECEIVED`, `PLACED`, `CANDLING`, `HATCHING_STARTED`, `HATCHED`, `FAILED`, `NOTE`).

### E. Production & Consommation
- **`egg_production`** : Relevé journalier de ponte. Colonnes : `id`, `date`, `poultry_house_id`, `lot_id`, `total_eggs`, `broken_eggs`, `sellable_eggs` (`total_eggs - broken_eggs`), `notes`.
- **`feed_consumption`** : Consommation journalière d'aliment composé. Colonnes : `id`, `date`, `poultry_house_id`, `lot_id`, `product_id`, `bags`, `kg_consumed`, `operator`, `notes`.
- **`green_forage`** : Consommation de fourrage vert. Colonnes : `id`, `date`, `poultry_house_id`, `estimated_kg`, `source`, `notes`.

### F. Inventaire
- **`inventory_categories`** : Catégories (`Aliment composé`, `Fourrage vert`, `Médicaments`, `Vaccins`, `Équipement`).
- **`inventory_products`** : Articles en stock. Colonnes : `id`, `category_id`, `name`, `unit`, `package_size` (50 kg par défaut), `package_unit`, `purchase_price`, `current_stock`, `reorder_level`.
- **`inventory_transactions`** : Grand livre de stock (`PURCHASE`, `CONSUMPTION`, `LOSS`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `SALE`, `RETURN`).

### G. Finance & Commerce (MAD / DH)
- **`customers`** & **`suppliers`** : Répertoires des tiers.
- **`purchases`** & **`purchase_items`** : Achats et lignes de commande.
- **`egg_sales`** : Ventes d'œufs (quantité, prix unitaire, total, montant payé, reste à payer, statut).
- **`animal_sales`** : Ventes d'oiseaux sur pieds.
- **`expenses`** : Charges directes et d'exploitation (`fertilized_eggs`, `feed`, `medication`, `utilities`, `labor`, etc.).
- **`revenues`** : Entrées financières.
- **`debts`** & **`debt_payments`** : Suivi des dettes fournisseurs et règlements partiels/totaux.
- **`receivables`** & **`receivable_payments`** : Suivi des créances clients et recouvrements.
- **`financial_transactions`** : Journal comptable centralisé.

### H. Alertes, Push & Audit
- **`notifications`** : Alertes in-app (`info`, `warning`, `critical`, statut `unread`/`read`/`dismissed`).
- **`alert_rules`** : Règles configurables (seuil stock critique, mortalité excessive, créance en retard).
- **`push_subscriptions`** : Abonnements Web Push des navigateurs.
- **`audit_logs`** : Journal d'audit inviolable (immuable) géré par déclencheurs PL/pgSQL.

---

## 3. Déclencheurs (Triggers) Principaux

1. **`recalc_lot_quantity()`** : Recalcule automatiquement `animal_lots.current_quantity = SUM(quantity)` lors de toute insertion, modification ou suppression dans `animal_lot_events`.
2. **`recalc_inventory_stock()`** : Recalcule automatiquement `inventory_products.current_stock = SUM(quantity)` lors de toute transaction d'inventaire.
3. **`recalc_debt_amounts()`** : Met à jour le solde restant et le statut de la dette (`pending` -> `partial` -> `paid`) après un paiement.
4. **`recalc_receivable_amounts()`** : Met à jour le solde restant et le statut de la créance client après encaissement.
5. **`audit_log_function()`** : Enregistre automatiquement toute opération `INSERT`, `UPDATE` ou `DELETE` avec snapshot JSONB.
