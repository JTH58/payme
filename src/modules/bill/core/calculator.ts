import { BillData } from '@/types/bill';

/**
 * 計算指定成員在帳單中應支付的總金額
 * 
 * 規則：
 * 1. 遍歷所有項目，若該成員在分配名單(o)中，則加上 (項目金額 / 分配人數)。
 * 2. 加總後，若有服務費 (s=true)，則乘以 1.1。
 * 3. 最後結果四捨五入至整數 (Math.round)。
 * 
 * @param billData 帳單資料物件
 * @param memberIndex 成員索引
 * @returns 應付金額 (整數)
 */
export function calculateMemberAmount(billData: BillData, memberIndex: number): number {
  if (!billData || !billData.i || memberIndex < 0) return 0;

  let memberTotal = 0;

  billData.i.forEach(item => {
    // 確保價格是數字
    const price = Number(item.p) || 0;
    
    // 如果該項目分配給這個人，且分配人數大於 0
    if (item.o && item.o.includes(memberIndex) && item.o.length > 0) {
      const share = price / item.o.length;
      memberTotal += share;
    }
  });

  // 加上服務費 (+10%)
  if (billData.s) {
    memberTotal *= 1.1;
  }

  return Math.round(memberTotal);
}
