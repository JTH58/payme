/**
 * TWQR Generator Helper
 * 負責組裝標準的 TWQRP:// 字串
 */

export interface TwqrData {
  bankCode: string;       // D5
  accountNumber: string;  // D6
  amount?: string | number; // D1
  comment?: string;       // D9
}

// 常數定義
const PROTOCOL = "TWQRP";
const SERVICE_NAME = "個人轉帳"; // 保持原始中文，最後再一次全字串編碼
const COUNTRY_CODE = "158";
const CATEGORY = "02";
const VERSION = "V1";

/**
 * 產生 TWQRP 字串
 * 
 * 修正：根據使用者需求，回傳「全字串編碼」結果
 * 例如: TWQRP%3A%2F%2F%E5%80%8B%E4%BA%BA...
 */
export function createTwqrString(data: TwqrData): string {
  const { bankCode, accountNumber, amount, comment } = data;
  
  // 1. 建構原始路徑 (Raw Path)
  // 格式: TWQRP://個人轉帳/158/02/V1
  const basePath = `${PROTOCOL}://${SERVICE_NAME}/${COUNTRY_CODE}/${CATEGORY}/${VERSION}`;

  // 2. 建構參數 (不使用 URLSearchParams 以避免預先編碼導致的雙重編碼問題)
  const params: string[] = [];
  
  // D5: 轉入行庫代碼
  params.push(`D5=${bankCode}`);
  
  // D6: 轉入帳號 (關鍵修正：必須補滿 16 碼，不足補 0)
  // 例如：1234567890 -> 0000001234567890
  params.push(`D6=${accountNumber.padStart(16, '0')}`);
  
  // D1: 交易金額 (若有填寫)
  // 關鍵修正：單位應為「分」，所以需要將金額 * 100
  // 例如：500 元 -> 50000
  if (amount && Number(amount) > 0) {
    const amountInCents = Math.round(Number(amount) * 100);
    params.push(`D1=${amountInCents}`);
  }

  // D9: 備註 (若有填寫)
  if (comment) {
    params.push(`D9=${comment}`);
  }

  // D10: 幣別代碼 (關鍵修正：補回 D10=901，代表台幣)
  params.push(`D10=901`);

  // 3. 組合原始字串
  // 例如: TWQRP://個人轉帳/158/02/V1?D5=822&D6=000000123...&D1=50000&D9=午餐&D10=901
  const rawUri = `${basePath}?${params.join('&')}`;

  // 4. 回傳全字串編碼結果
  return encodeURIComponent(rawUri);
}
