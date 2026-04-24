INSERT INTO "FinancialConfig" (id, key, value, label, description, category, "updatedAt")
VALUES 
('id_asst_ceo', 'BONUS_GROSS_ASSISTANT_CEO', 0.015, 'Bonus Gross Assistant CEO (%)', 'Bonus dari Omset Bruto untuk Assistant CEO (Default: 1.5%)', 'BONUS', NOW()),
('id_fin', 'BONUS_GROSS_FINANCE', 0.01, 'Bonus Gross Finance (%)', 'Bonus dari Omset Bruto untuk Finance (Default: 1%)', 'BONUS', NOW()),
('id_spv_adv', 'BONUS_GROSS_SPV_ADV', 0.015, 'Bonus Gross SPV Adv (%)', 'Bonus dari Omset Bruto untuk SPV Adv (Default: 1.5%)', 'BONUS', NOW()),
('id_spv_mult', 'BONUS_GROSS_SPV_MULTIMEDIA', 0.015, 'Bonus Gross SPV Multimedia (%)', 'Bonus dari Omset Bruto untuk SPV Multimedia (Default: 1.5%)', 'BONUS', NOW()),
('id_sh_adv', 'RATE_SHARING_SPV_ADV', 0.025, 'Rate Sharing SPV Adv', 'Jatah SPV Adv dari total sharing tim (Default: 2.5%)', 'SHARING_DETAIL', NOW()),
('id_sh_mult', 'RATE_SHARING_SPV_MULTIMEDIA', 0.02, 'Rate Sharing SPV Multimedia', 'Jatah SPV Multimedia (Default: 2%)', 'SHARING_DETAIL', NOW()),
('id_sh_aceo', 'RATE_SHARING_ASSISTANT_CEO', 0.02, 'Rate Sharing Assistant CEO', 'Jatah Assistant CEO (Default: 2%)', 'SHARING_DETAIL', NOW()),
('id_sh_fin', 'RATE_SHARING_FINANCE', 0.01, 'Rate Sharing Finance', 'Jatah Finance (Default: 1%)', 'SHARING_DETAIL', NOW())
ON CONFLICT (key) DO NOTHING;
