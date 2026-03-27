import banksRaw from '@/data/banks.json';
import bankSeoOverridesRaw from '@/data/bank-seo-content.json';
import { BankExtended, BankSeoContent, BankSeoOverride, BankStatus } from '../types';

const POPULAR_RELATED_CODES = ['004', '005', '007', '012', '013', '017', '812', '822'];

const STATUS_SUMMARIES: Record<BankStatus, string> = {
  no_reports: '目前尚未收到使用者針對此銀行掃描 TWQR 的錯誤回報，但仍建議先以小額轉帳測試一次。',
  verified: '目前已有整理到可用訊號，代表此銀行在既有回饋中屬於相對穩定的 TWQR 掃碼對象。',
  reported_issues: '目前曾收到與此銀行相關的使用問題回報，建議使用前先查看注意事項，並以小額測試確認。',
};

const bankSeoOverrides = bankSeoOverridesRaw as Record<string, BankSeoOverride>;

function buildStatusIntro(bank: typeof banksRaw[number], status: BankStatus): string {
  if (status === 'verified') {
    return `${bank.name}（${bank.code}）目前在 PayMe.tw 整理的資料中屬於較明確可用的 TWQR 掃碼對象，適合先從這頁確認操作方式與注意事項。`;
  }

  if (status === 'reported_issues') {
    return `${bank.name}（${bank.code}）曾有使用者回報 TWQR 掃碼或操作上的疑問。這頁整理目前狀態、排查方向與使用 PayMe.tw 建立收款碼時的注意事項。`;
  }

  return `${bank.name}（${bank.code}）是 PayMe.tw 支援查詢的 TWQR 對象之一。這頁整理目前的支援狀態、掃碼方向與使用 PayMe.tw 的基本建議。`;
}

function buildUsageNotes(bank: typeof banksRaw[number], status: BankStatus): string[] {
  const notes = [
    `請先在 ${bank.shortName} App 中尋找「掃碼轉帳」、「付款掃碼」或 TWQR 相關入口，再掃描 PayMe.tw 產生的 QR Code。`,
    '第一次使用時，建議先以小額轉帳測試，確認掃碼結果、收款資訊與金額顯示都正確。',
  ];

  if (status === 'reported_issues') {
    notes.push('若掃碼失敗，請一併記錄 App 版本、錯誤畫面與操作步驟，方便後續釐清是 App 入口問題還是相容性問題。');
  } else {
    notes.push('若找不到掃碼入口，可先更新 App 或查看官方教學頁，部分銀行會在版本更新後調整功能位置。');
  }

  return notes;
}

function buildFaqs(bank: typeof banksRaw[number], status: BankStatus) {
  return [
    {
      question: `${bank.shortName} 可以掃 TWQR 嗎？`,
      answer:
        status === 'verified'
          ? `目前 PayMe.tw 整理的資料中，${bank.shortName} 已有相對正向的可用訊號，但仍建議首次使用時先以小額轉帳測試。`
          : status === 'reported_issues'
            ? `目前曾收到與 ${bank.shortName} 相關的使用問題回報，因此建議先查看這頁的注意事項，再用小額轉帳確認。`
            : `目前 PayMe.tw 尚未收到 ${bank.shortName} 掃描 TWQR 的錯誤回報，但這不代表官方保證支援，仍建議先測試一次。`,
    },
    {
      question: `${bank.shortName} App 要怎麼掃 PayMe.tw 產生的 QR Code？`,
      answer: `通常可從 ${bank.shortName} App 的掃碼轉帳、付款掃碼或 TWQR 相關入口進入，再掃描 PayMe.tw 產生的收款碼。若實際名稱不同，請以 App 最新介面為準。`,
    },
    {
      question: `${bank.shortName} 掃不了 TWQR 怎麼辦？`,
      answer: '建議先確認是否從正確的轉帳掃碼功能進入、App 是否更新到最新版，以及 QR Code 是否完整顯示；若仍有問題，可回報給 PayMe.tw 協助整理。 ',
    },
    {
      question: `PayMe.tw 是 ${bank.shortName} 官方服務嗎？`,
      answer: `不是。PayMe.tw 是第三方開源工具，主要用途是協助產生符合 TWQR 規格的收款碼，並不代表 ${bank.shortName} 官方立場。`,
    },
  ];
}

function resolveRelatedBankCodes(code: string): string[] {
  const preferred = POPULAR_RELATED_CODES.filter((item) => item !== code);
  const fallback = banksRaw
    .map((bank) => bank.code)
    .filter((item) => item !== code && !preferred.includes(item));

  return [...preferred, ...fallback].slice(0, 3);
}

function buildSeoContent(bank: typeof banksRaw[number], status: BankStatus): BankSeoContent {
  const override = bankSeoOverrides[bank.code] || {};

  return {
    seoIntro: override.seoIntro || buildStatusIntro(bank, status),
    usageNotes: override.usageNotes || buildUsageNotes(bank, status),
    faqs: override.faqs || buildFaqs(bank, status),
    relatedBankCodes: override.relatedBankCodes || resolveRelatedBankCodes(bank.code),
    lastReviewedAt: override.lastReviewedAt || '2026-03-27',
    statusSummary: override.statusSummary || STATUS_SUMMARIES[status],
    scanFeatureHint: override.scanFeatureHint || `請在 ${bank.shortName} App 中尋找掃碼轉帳、付款掃碼或 TWQR 相關入口。`,
    officialGuideLabel: override.officialGuideLabel || `${bank.shortName} 官方教學`,
    verificationDate: override.verificationDate,
    issueSummary: override.issueSummary,
    issueUpdatedAt: override.issueUpdatedAt,
  };
}

/** 從 banks.json 取得擴充銀行資料（補上預設 status） */
export function getBanks(): BankExtended[] {
  return banksRaw.map((b) => {
    const override = bankSeoOverrides[b.code] || {};
    const status = override.status || ('no_reports' as BankStatus);

    return {
      ...b,
      status,
      seo: buildSeoContent(b, status),
    };
  });
}

/** 依代碼查詢單一銀行 */
export function getBankByCode(code: string): BankExtended | undefined {
  return getBanks().find((b) => b.code === code);
}
