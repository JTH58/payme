/** 銀行 TWQR 支援狀態 */
export type BankStatus = 'no_reports' | 'verified' | 'reported_issues';

/** 基礎銀行資料（banks.json 原始結構） */
export interface Bank {
  code: string;
  name: string;
  shortName: string;
}

/** 擴充銀行資料（含狀態與可選連結） */
export interface BankExtended extends Bank {
  status: BankStatus;
  appStoreUrl?: string;
  playStoreUrl?: string;
  officialGuideUrl?: string;
  customerServicePhone?: string;
}
