-- Farm configuration
INSERT INTO farm (id, name, area_hectares, currency, address, notes)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Ferme Avicole',
  3.00,
  'MAD',
  'Maroc',
  'Exploitation avicole - 3 hectares'
);

-- Poultry Houses (4 initial houses, capacity 250 each)
INSERT INTO poultry_houses (id, name, code, capacity, house_type, status) VALUES
('b0000000-0000-0000-0000-000000000001', 'Poulailler 1', 'P1', 250, 'standard', 'active'),
('b0000000-0000-0000-0000-000000000002', 'Poulailler 2', 'P2', 250, 'standard', 'active'),
('b0000000-0000-0000-0000-000000000003', 'Poulailler 3', 'P3', 250, 'standard', 'active'),
('b0000000-0000-0000-0000-000000000004', 'Poulailler 4', 'P4', 250, 'standard', 'active');

-- Animal Types
INSERT INTO animal_types (id, name, description) VALUES
('c0000000-0000-0000-0000-000000000001', 'Poule pondeuse', 'Poules destinées à la production d''œufs'),
('c0000000-0000-0000-0000-000000000002', 'Poule reproductrice', 'Poules destinées à la reproduction');

-- Animal Breeds
INSERT INTO animal_breeds (id, animal_type_id, name, description) VALUES
('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ISA Brown', 'Race pondeuse hybride performante'),
('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Lohmann Brown', 'Race pondeuse marron'),
('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Cobb 500', 'Race reproductrice de chair'),
('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'Ross 308', 'Race reproductrice de chair');

-- Inventory Categories
INSERT INTO inventory_categories (id, name, description) VALUES
('e0000000-0000-0000-0000-000000000001', 'Aliment composé', 'Aliments composés pour volailles'),
('e0000000-0000-0000-0000-000000000002', 'Fourrage vert', 'Fourrage vert et herbe'),
('e0000000-0000-0000-0000-000000000003', 'Médicaments', 'Produits vétérinaires et médicaments'),
('e0000000-0000-0000-0000-000000000004', 'Vaccins', 'Vaccins pour volailles'),
('e0000000-0000-0000-0000-000000000005', 'Équipement', 'Équipement et matériel'),
('e0000000-0000-0000-0000-000000000006', 'Fournitures diverses', 'Autres fournitures');

-- Default Incubator
INSERT INTO incubators (id, name, capacity, status) VALUES
('f0000000-0000-0000-0000-000000000001', 'Incubateur 1', 500, 'active'),
('f0000000-0000-0000-0000-000000000002', 'Incubateur 2', 500, 'active');

-- Default Alert Rules
INSERT INTO alert_rules (id, rule_type, is_enabled, threshold, severity, description) VALUES
('10000000-0000-0000-0000-000000000001', 'LOW_FEED_STOCK', true, '{"days_remaining": 3}', 'warning', 'Alerte lorsque le stock d''aliment est inférieur à 3 jours'),
('10000000-0000-0000-0000-000000000002', 'LOW_FORAGE_STOCK', true, '{"kg_minimum": 50}', 'warning', 'Alerte lorsque le stock de fourrage est inférieur à 50 kg'),
('10000000-0000-0000-0000-000000000003', 'HIGH_MORTALITY', true, '{"percentage": 2}', 'critical', 'Alerte lorsque la mortalité dépasse 2% par jour'),
('10000000-0000-0000-0000-000000000004', 'DEBT_DUE', true, '{"days_before": 3}', 'warning', 'Alerte 3 jours avant l''échéance d''une dette'),
('10000000-0000-0000-0000-000000000005', 'RECEIVABLE_OVERDUE', true, '{"days_overdue": 7}', 'warning', 'Alerte lorsqu''une créance est en retard de 7 jours'),
('10000000-0000-0000-0000-000000000006', 'INCUBATION_DUE', true, '{"days_before": 2}', 'info', 'Alerte 2 jours avant l''éclosion prévue'),
('10000000-0000-0000-0000-000000000007', 'MISSING_DAILY_PRODUCTION', true, '{"hour": 20}', 'warning', 'Alerte si la production journalière n''est pas saisie'),
('10000000-0000-0000-0000-000000000008', 'MISSING_DAILY_FEED_RECORD', true, '{"hour": 20}', 'warning', 'Alerte si la consommation d''aliment n''est pas saisie'),
('10000000-0000-0000-0000-000000000009', 'POULTRY_HOUSE_OVER_CAPACITY', true, '{"percentage": 100}', 'critical', 'Alerte lorsqu''un poulailler dépasse sa capacité');

-- App Settings
INSERT INTO app_settings (id, key, value, description) VALUES
('20000000-0000-0000-0000-000000000001', 'default_bag_size', '50', 'Taille par défaut des sacs d''aliment en kg'),
('20000000-0000-0000-0000-000000000002', 'currency', '"MAD"', 'Devise par défaut'),
('20000000-0000-0000-0000-000000000003', 'date_format', '"DD/MM/YYYY"', 'Format de date'),
('20000000-0000-0000-0000-000000000004', 'language', '"fr"', 'Langue par défaut'),
('20000000-0000-0000-0000-000000000005', 'allow_negative_stock', 'false', 'Autoriser le stock négatif'),
('20000000-0000-0000-0000-000000000006', 'allow_over_capacity', 'false', 'Autoriser le dépassement de capacité des poulaillers');
