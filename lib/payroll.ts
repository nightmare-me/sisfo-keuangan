/**
 * Payroll & Fee Calculation Engine
 */

export type CSCategory = 'CS_REGULAR' | 'CS_LIVE' | 'CS_TOEFL' | 'CS_RO' | 'CS_SOSMED' | 'CS_AFFILIATE';
export type AdvCategory = 'ADV_REGULAR' | 'ADV_PART_TIME' | 'ADV_PROJECT';

/**
 * Calculate CS Fee based on product and category
 */
export function calculateCSFee(
  csCategory: CSCategory,
  productType: string,
  price: number,
  isRO: boolean = false,
  cr: number = 0, // For CS Live
  program?: { feeClosing?: number, feeClosingRO?: number }
): number {
  // 0. KHUSUS CS_RO: Selalu gunakan persentase 5% (Sesuai kebijakan terbaru)
  if (csCategory === 'CS_RO' || (isRO && csCategory !== 'CS_TOEFL')) {
    return price * 0.05;
  }

  // 1. PRIORITAS: Pakai nominal fee dari Database jika > 0
  if (program) {
    const dbFee = isRO ? (program.feeClosingRO || 0) : (program.feeClosing || 0);
    if (dbFee > 0) return dbFee;
  }

  if (csCategory === 'CS_AFFILIATE') {
    return 25000;
  }

  // 2. CADANGAN: Pakai rumus hardcoded (untuk back-compatibility)
  if (csCategory === 'CS_REGULAR' || csCategory === 'CS_SOSMED') {
    
    // FALLBACK PRIORITAS: Jika nama mengandung kata kunci khusus, gunakan fee tersebut
    // (Penting jika kategoriFee di DB kosong atau salah set ke REG_1B)
    if (program && (program as any).nama) {
      const nama = (program as any).nama.toLowerCase();
      if (nama.includes('semi')) return isRO ? 12500 : 15000;
      if (nama.includes('private')) {
        if (price > 1000000) return isRO ? 30000 : 50000;
        return isRO ? 15000 : 25000;
      }
      if (nama.includes('toefl') || nama.includes('ielts')) return 12500;
      if (nama.includes('native')) return 12500;
    }

    // Rules berdasarkan Kategori (Explicit)
    if (!isRO) {
      if (productType === '49K_DISKON') return 2000;
      if (productType === '49K') return 2500;
      if (productType === 'EFP') return 4000;
      if (productType === 'REG_1B') return 10000;
      if (productType === 'REG_ADV') return 12500;
      if (productType === 'NATIVE') return 12500;
      if (productType === 'TOEFL') return 12500;
      if (productType === 'SEMI_PRIVATE') return 15000;
      if (productType === 'PRIVATE_550' || productType === 'PRIVATE_850') return 25000;
      if (productType === 'PRIVATE_1B' || productType === 'PRIVATE_VIP' || productType === 'PRIVATE_FAMILY') return 50000;
    } else {
      // RO Rules
      if (productType === '49K_DISKON') return 2000;
      if (productType === '49K') return 2500;
      if (productType === 'EFP') return 4000;
      if (productType === 'REG_1B') return 10000;
      if (productType === 'REG_ADV') return 12500;
      if (productType === 'NATIVE') return 12500;
      if (productType === 'TOEFL') return 12500;
      if (productType === 'SEMI_PRIVATE') return 12500;
      if (productType === 'PRIVATE_550' || productType === 'PRIVATE_850') return 15000;
      if (productType === 'PRIVATE_1B' || productType === 'PRIVATE_VIP' || productType === 'PRIVATE_FAMILY') return 30000;
    }
  }

  if (csCategory === 'CS_LIVE') {
    if (productType === '49K' || productType === '49K_DISKON') {
      return cr > 0.5 ? 2500 : 2000;
    }
    if (productType.includes('FAST') || productType.includes('PRIVATE')) {
      return price * 0.05;
    }
  }

  if (csCategory === 'CS_TOEFL') {
    // Cek Kategori Dulu (Explicit)
    if (productType === 'ELITE' || productType === 'ELITE_PRO') return 2500;
    if (productType === 'MASTER') return 5000;

    // Fallback: Cek dari Nama Program jika kategori kosong/tidak sesuai
    if (program && (program as any).nama) {
      const lowerName = String((program as any).nama).toLowerCase();
      if (lowerName.includes("elite")) return 2500;
      if (lowerName.includes("master")) return 5000;
    }

    return price * 0.10; // Lain-lain: 10% x Harga Produk
  }

  if (csCategory === 'CS_RO') {
    return price * 0.05;
  }

  return 0;
}

/**
 * Calculate Advertiser Fee based on CPL and category
 */
export function calculateAdvFee(
  advCategory: AdvCategory,
  cpl: number,
  leadsCount: number
): number {
  let feePerLead = 0;

  if (advCategory === 'ADV_REGULAR') {
    if (cpl < 9000) feePerLead = 1000;
    else if (cpl <= 13500) feePerLead = 500;
    else if (cpl <= 15000) feePerLead = 250;
    else feePerLead = 0;
  }

  if (advCategory === 'ADV_PART_TIME') {
    if (cpl < 15000) feePerLead = 1000;
    else if (cpl <= 20000) feePerLead = 700;
    else feePerLead = 300;
  }

  if (advCategory === 'ADV_PROJECT' || advCategory === 'ADV_TOEFL' as any) {
    if (cpl < 15000) feePerLead = 500;
    else feePerLead = 250;
  }

  return feePerLead * leadsCount;
}

/**
 * Calculate Talent Live Bonus based on personal Omset
 */
export function calculateBonusTalent(omsetTalent: number): number {
  if (omsetTalent < 30000000) return 0;
  if (omsetTalent <= 35000000) return omsetTalent * 0.025;
  return omsetTalent * 0.05;
}

/**
 * Calculate SPV Akademik Bonus based on RO Omset
 */
export function calculateBonusAkademikRO(omsetRO: number): number {
  if (omsetRO < 200000000) return omsetRO * 0.0025;
  if (omsetRO <= 400000000) return omsetRO * 0.005;
  return omsetRO * 0.01;
}

/**
 * Calculate Bonus for Tim Multimedia Eksternal based on Nett Profit
 */
export function calculateBonusMultimediaEksternal(nettProfit: number): number {
  if (nettProfit < 50000000) return 0;
  if (nettProfit <= 100000000) return nettProfit * 0.05;
  if (nettProfit <= 150000000) return nettProfit * 0.08;
  return nettProfit * 0.12;
}

/**
 * Calculate TOEFL Profit Sharing for a user based on their position
 */
export function calculateSharingTOEFL(toeflProfit: number, posisi: string): number {
  const teamShare = toeflProfit * 0.5; // Tim TOEFL gets 50%
  
  const rates: Record<string, number> = {
    'CEO': 0.825,
    'COO': 0.05,
    'SPV AKADEMIK': 0.05,
    'SPV ADV': 0.025,
    'SPV MULTIMEDIA': 0.02,
    'ASSISTANT CEO': 0.02,
    'FINANCE': 0.01
  };

  const rate = rates[posisi.toUpperCase()] || 0;
  return teamShare * rate;
}

/**
 * Calculate Revenue-based Bonus (from Gross Profit)
 */
export function calculateBonusGrossProfit(grossProfit: number, posisi: string): number {
  const rates: Record<string, number> = {
    'CEO': 0.015,
    'ASSISTANT CEO': 0.015,
    'COO': 0.03,
    'FINANCE': 0.01,
    'SPV ADV': 0.015,
    'SPV MULTIMEDIA': 0.015
  };

  const rate = rates[posisi.toUpperCase()] || 0;
  return grossProfit * rate;
}

/**
 * Calculate Salary from Live Hours
 */
export function calculateGajiLive(totalJam: number): number {
  return totalJam * 13500;
}
