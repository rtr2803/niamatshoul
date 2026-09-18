# Manuel des Opérations Avicoles — FERME MANAGEMENT

Ce document décrit le flux de travail opérationnel quotidien et les procédures clés pour l'exploitant de la ferme avicole au Maroc.

---

## 1. Routine Quotidienne : « La Saisie Journalière »

L'écran **« Saisie Journalière »** permet au gérant d'enregistrer l'intégralité des événements d'un bâtiment en moins d'une minute :

1. **Sélectionner la Date** (par défaut : aujourd'hui).
2. **Choisir le Poulailler** (Poulailler 1, 2, 3 ou 4) :
   - L'effectif actif actuel d'oiseaux s'affiche automatiquement.
3. **Mortalité** :
   - Indiquer le nombre d'oiseaux morts constatés lors de la tournée d'inspection matinale.
   - La validation enregistre un événement de mortalité négatif qui déduit automatiquement l'effectif du lot.
4. **Production d'Œufs** :
   - Saisir le total d'œufs ramassés.
   - Saisir le nombre d'œufs cassés/fêlés.
   - Le système calcule automatiquement : `Œufs vendables = Total - Cassés`.
5. **Alimentation** :
   - Sélectionner l'aliment composé distribué (ex: Aliment ponte 50 kg).
   - Indiquer le nombre de sacs ou les kilogrammes distribués (ex: 2 sacs = 100 kg).
   - Indiquer les kilogrammes de fourrage vert distribués (fauché sur les 3 hectares).
6. **Cliquer sur « ENREGISTRER LA JOURNÉE »** :
   - L'ensemble des tables (`egg_production`, `animal_lot_events`, `feed_consumption`, `inventory_transactions`) sont alimentées de manière cohérente et atomique.

---

## 2. Cycle d'Incubation & Renouvellement du Cheptel

Puisque l'exploitation n'achète pas de poussins d'un jour mais des **œufs fécondés** :

### Étape 1 : Réception des Œufs Fécondés
1. Aller dans **Finances > Achats** et créer la facture fournisseur (ex: 500 œufs fécondés à 4,50 DH/œuf).
2. Aller dans **Incubation > Nouveau Lot** :
   - Enregistrer le lot (ex: `INC-2026-001`), le fournisseur et la quantité d'œufs placés dans l'incubateur.
   - Le système calcule automatiquement la date théorique d'éclosion (`Date + 21 jours`).

### Étape 2 : Suivi & Mirage (J+7 / J+14)
- Dans le détail du lot d'incubation, ajouter un événement de mirage (`CANDLING`) pour noter les œufs non fécondés éliminés.

### Étape 3 : Éclosion (J+21) & Création du Lot d'Animaux
1. Lors de l'éclosion, cliquer sur **« Compléter Éclosion »**.
2. Renseigner le nombre de poussins viables éclos (ex: 438) et les échecs (ex: 62).
3. Le système calcule le taux d'éclosion : `(438 / 500) * 100 = 87.6%`.
4. Cliquer immédiatement sur **« Créer Lot d'Animaux »** :
   - Attribue le lot (ex: `LOT-2026-001`) au poulailler de démarrage choisi.
   - Maintient la traçabilité complète : `Lot d'animaux` -> `Lot d'incubation` -> `Fournisseur d'œufs`.

---

## 3. Gestion de l'Alimentation & Stocks (Sacs de 50 kg)

- **Réception d'aliment** :
  - Chaque livraison de sacs de 50 kg est enregistrée via **Inventaire > Nouvelle Transaction > ACHAT**.
  - La valeur en stock augmente proportionnellement.
- **Consommation** :
  - La distribution quotidienne déduit le stock.
  - Lorsque le stock restant couvre moins de 3 jours de consommation moyenne, une alerte `LOW_FEED_STOCK` de niveau avertissement est générée.

---

## 4. Ventes & Encaissements

### Ventes d'Œufs
- Les plateaux ou unités d'œufs sont vendus au comptant ou à crédit.
- Si le client ne règle qu'une partie (ex: Vente de 3 000 DH, payé 1 500 DH), une **créance client** de 1 500 DH est automatiquement ouverte avec suivi d'échéance.

### Ventes d'Animaux (Réformes ou Volailles de chair)
- La vente d'animaux réduit automatiquement l'effectif du lot correspondant par un événement `SALE` (-Q).

---

## 5. Rôle des Partenaires

Les associés ou bailleurs de fonds connectés à l'application ont le rôle `PARTNER` :
- Ils visualisent les graphiques de production, le stock d'oiseaux, les revenus, les charges, et le résultat net en temps réel.
- Toute tentative d'écriture, d'altération ou de suppression leur est bloquée par l'interface et refusée par la base de données PostgreSQL.
