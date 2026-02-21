import { SERVICE_CHARGE_MULTIPLIER } from '@/config/constants';

export interface SimpleSplitResult {
  perPersonAmount: number;
  totalWithService: number;
  comment: string;
}

export function calculateSimpleSplit(
  totalAmount: string, 
  peopleCount: number, 
  hasServiceCharge: boolean
): SimpleSplitResult | null {
  if (!totalAmount || isNaN(Number(totalAmount))) {
    return null;
  }

  let finalTotal = Number(totalAmount);
  
  if (hasServiceCharge) {
    finalTotal = Math.round(finalTotal * SERVICE_CHARGE_MULTIPLIER);
  }

  const perPerson = Math.round(finalTotal / peopleCount);
  const serviceText = hasServiceCharge ? '(含服務費)' : '';
  const comment = `均分$${finalTotal}${serviceText}/${peopleCount}人`.slice(0, 20);

  return {
    perPersonAmount: perPerson,
    totalWithService: finalTotal,
    comment
  };
}
