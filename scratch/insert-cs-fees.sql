INSERT INTO "FinancialConfig" (id, key, value, label, description, category, "updatedAt")
VALUES 
('cs_live_high', 'FEE_CS_LIVE_49K_HIGH_CR', 2500, 'CS Live 49K (CR > 50%)', 'Fee per closing paket 49K saat CR di atas 50%', 'FEE', NOW()),
('cs_live_low', 'FEE_CS_LIVE_49K_LOW_CR', 2000, 'CS Live 49K (CR <= 50%)', 'Fee per closing paket 49K saat CR di bawah atau sama dengan 50%', 'FEE', NOW()),
('cs_live_pct', 'FEE_CS_LIVE_PERCENT', 0.05, 'CS Live Paket Private (%)', 'Persentase fee untuk paket Fast/Private (Default: 5% atau 0.05)', 'FEE', NOW()),
('cs_toefl_elite', 'FEE_CS_TOEFL_ELITE', 2500, 'Fee CS TOEFL Elite', 'Fee tetap untuk setiap closing paket TOEFL Elite', 'FEE', NOW()),
('cs_toefl_master', 'FEE_CS_TOEFL_MASTER', 5000, 'Fee CS TOEFL Master', 'Fee tetap untuk setiap closing paket TOEFL Master', 'FEE', NOW()),
('cs_toefl_pct', 'FEE_CS_TOEFL_PERCENT', 0.10, 'Fee CS TOEFL Lainnya (%)', 'Persentase fee untuk paket TOEFL lainnya (Default: 10% atau 0.10)', 'FEE', NOW())
ON CONFLICT (key) DO NOTHING;
