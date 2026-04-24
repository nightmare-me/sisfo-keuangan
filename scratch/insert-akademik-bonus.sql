INSERT INTO "FinancialConfig" (id, key, value, label, description, category, "updatedAt")
VALUES 
('ak_limit_1', 'BONUS_AKADEMIK_RO_LIMIT_1', 200000000, 'Threshold Bonus RO 1', 'Ambang batas bawah omset RO (Default: 200 Juta)', 'BONUS', NOW()),
('ak_rate_1', 'BONUS_AKADEMIK_RO_RATE_1', 0.0025, 'Rate Bonus RO Tier 1 (%)', 'Persentase bonus jika omset di bawah Limit 1 (Default: 0.25% atau 0.0025)', 'BONUS', NOW()),
('ak_limit_2', 'BONUS_AKADEMIK_RO_LIMIT_2', 400000000, 'Threshold Bonus RO 2', 'Ambang batas menengah omset RO (Default: 400 Juta)', 'BONUS', NOW()),
('ak_rate_2', 'BONUS_AKADEMIK_RO_RATE_2', 0.005, 'Rate Bonus RO Tier 2 (%)', 'Persentase bonus jika omset di antara Limit 1 dan Limit 2 (Default: 0.5% atau 0.005)', 'BONUS', NOW()),
('ak_rate_3', 'BONUS_AKADEMIK_RO_RATE_3', 0.01, 'Rate Bonus RO Tier 3 (%)', 'Persentase bonus jika omset di atas Limit 2 (Default: 1% atau 0.01)', 'BONUS', NOW())
ON CONFLICT (key) DO NOTHING;
