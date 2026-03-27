/** 銀行 TWQR 支援狀態 */
export type BankStatus = 'no_reports' | 'verified' | 'reported_issues';

export interface BankFaq {
  question: string;
  answer: string;
}

export interface BankSeoContent {
  seoIntro: string;
  usageNotes: string[];
  faqs: BankFaq[];
  relatedBankCodes: string[];
  lastReviewedAt: string;
  statusSummary: string;
  scanFeatureHint: string;
  officialGuideLabel: string;
  verificationDate?: string;
  issueSummary?: string;
  issueUpdatedAt?: string;
}

export interface BankSeoOverride {
  status?: BankStatus;
  seoIntro?: string;
  usageNotes?: string[];
  faqs?: BankFaq[];
  relatedBankCodes?: string[];
  lastReviewedAt?: string;
  statusSummary?: string;
  scanFeatureHint?: string;
  officialGuideLabel?: string;
  verificationDate?: string;
  issueSummary?: string;
  issueUpdatedAt?: string;
}

export interface BankTopic {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  faq: BankFaq[];
  bankCodes?: string[];
  filter?: (bank: BankExtended) => boolean;
}

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
  seo: BankSeoContent;
}
