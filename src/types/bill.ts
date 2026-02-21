export interface BillItem {
  n: string; // Name
  p: number; // Price
  o: number[]; // Owners (indices of members)
}

export interface BillData {
  t: string; // Title
  m: string[]; // Members names
  i: BillItem[]; // Items
  s: boolean; // Has Service Charge (10%)
}

export interface SimpleData {
  ta: string; // Total Amount
  pc: number; // People Count
  sc: boolean; // Service Charge
}

export interface CompactAccount {
  b: string; // Bank Code
  a: string; // Account Number
}

// 這是要在 URL data 參數中傳遞的完整結構
export interface CompressedData {
  b: string; // Bank Code
  a: string; // Account Number
  m: string; // Amount (Simple/General mode)
  c: string; // Comment
  mo: 'pay' | 'bill'; // Mode
  bd?: BillData; // Bill Data (Only for bill mode)
  sd?: SimpleData; // Simple Data (Only for simple mode)
  tid?: string; // Template ID (For attribution)
  ac?: CompactAccount[]; // Multi-account list
}
