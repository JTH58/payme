import { BankExtended, BankTopic } from '../types';
import { getBanks } from './get-banks';

const POPULAR_BANK_CODES = ['004', '007', '012', '013', '017', '812', '822', '803'];

const BANK_TOPICS: BankTopic[] = [
  {
    slug: 'popular-banks',
    title: '熱門銀行 TWQR 使用整理',
    shortTitle: '熱門銀行',
    description: '整理搜尋量高的熱門銀行 TWQR 狀態與使用入口，適合先查看台新、國泰、富邦、中信、第一、兆豐等常見銀行。',
    intro: '這個主題頁彙整 PayMe.tw 站內搜尋量與使用量都較高的銀行，方便你先查看熱門銀行的 TWQR 狀態、再進入個別銀行頁確認 FAQ 與注意事項。',
    bankCodes: POPULAR_BANK_CODES,
    faq: [
      {
        question: '哪些銀行屬於熱門 TWQR 查詢銀行？',
        answer: '通常包含公股大型銀行、主要民營銀行與實際使用量高的銀行，例如第一銀行、富邦、國泰世華、台新與中國信託。',
      },
      {
        question: '熱門銀行頁和單一銀行頁有什麼差別？',
        answer: '熱門銀行頁適合快速比較常查詢銀行；若你已經知道自己的銀行，仍建議進入單一銀行頁查看更具體的 FAQ 與使用提醒。',
      },
    ],
  },
  {
    slug: 'state-owned-and-major-banks',
    title: '公股與大型商業銀行 TWQR 列表',
    shortTitle: '公股與大型商業銀行',
    description: '整理臺灣銀行、土地銀行、第一銀行、兆豐銀行與大型商業銀行的 TWQR 狀態與使用方向。',
    intro: '如果你想先看台灣常見的公股與大型商業銀行是否支援 TWQR、該怎麼掃碼，這個分類頁可以先快速縮小範圍。',
    filter: (bank) => Number(bank.code) < 100 || ['803', '805', '812', '822'].includes(bank.code),
    faq: [
      {
        question: '公股銀行和大型商業銀行掃 TWQR 的方式會不同嗎？',
        answer: '大方向相同，都是從銀行 App 的掃碼轉帳或 TWQR 功能進入，但實際選單名稱與位置仍可能因銀行而異。',
      },
      {
        question: '如果我的銀行在這個分類裡，還需要看個別銀行頁嗎？',
        answer: '需要。分類頁主要幫你快速定位，個別銀行頁會有更細的狀態、FAQ 與注意事項。',
      },
    ],
  },
  {
    slug: 'regional-and-credit-cooperatives',
    title: '地方銀行與信用合作社 TWQR 列表',
    shortTitle: '地方銀行與信用合作社',
    description: '整理地方型銀行、信用合作社與區域性金融機構的 TWQR 狀態與查詢入口。',
    intro: '這個主題頁適合查詢地方型銀行與信用合作社的 TWQR 支援情況，幫助你快速找到較少見的銀行頁。',
    filter: (bank) => {
      const code = Number(bank.code);
      return code >= 100 && code < 300;
    },
    faq: [
      {
        question: '地方銀行或信用合作社也能掃 TWQR 嗎？',
        answer: '有些可以、有些仍需要實測。建議先進入個別銀行頁查看目前狀態，再用小額轉帳測試。',
      },
      {
        question: '為什麼這類銀行更需要分類頁？',
        answer: '因為使用者通常不熟悉代碼與完整名稱，先用分類頁縮小範圍，比從完整 266 筆列表中逐一搜尋更有效率。',
      },
    ],
  },
  {
    slug: 'payments-and-digital-wallets',
    title: '支付機構與數位錢包 TWQR 列表',
    shortTitle: '支付機構與數位錢包',
    description: '整理全支付、悠遊付、iPassMoney、街口等支付機構代碼，方便查詢是否可作為 TWQR 掃碼對象。',
    intro: '除了銀行，部分支付機構與數位錢包也會出現在 TWQR 代碼查詢中。這個分類頁適合快速查看支付型代碼與相關頁面。',
    filter: (bank) => {
      const code = Number(bank.code);
      return code >= 388 && code <= 398;
    },
    faq: [
      {
        question: '支付機構和銀行頁有什麼不同？',
        answer: '支付機構的 App 流程與銀行不一定相同，但仍可以透過這些頁面先確認代碼與基本狀態，再進一步測試。',
      },
      {
        question: '支付機構頁也適合做 TWQR SEO 嗎？',
        answer: '適合，尤其當使用者實際會搜尋某個支付品牌加上 TWQR 時，這種分類能幫助整理相關頁面。',
      },
    ],
  },
  {
    slug: 'verified-banks',
    title: '已有使用回報銀行 TWQR 列表',
    shortTitle: '已有使用回報銀行',
    description: '整理目前在 PayMe.tw 資料中具有較正向訊號的銀行，適合想先找相對穩定 TWQR 對象的使用者。',
    intro: '如果你希望先從相對穩定、已有正向訊號的銀行開始測試 TWQR，這個主題頁可以先幫你篩出已有使用回報的銀行。',
    filter: (bank) => bank.status === 'verified',
    faq: [
      {
        question: '已有使用回報代表什麼？',
        answer: '代表目前 PayMe.tw 整理到的資料中，有較正向的可用訊號；但仍不代表銀行官方保證，首次使用還是建議小額測試。',
      },
      {
        question: '已有使用回報就一定不會出錯嗎？',
        answer: '不一定。銀行 App 更新、掃碼入口調整或使用情境不同，都可能影響結果，所以仍建議實際測試。',
      },
    ],
  },
];

export function getBankTopics(): BankTopic[] {
  return BANK_TOPICS;
}

export function getBankTopicBySlug(slug: string): BankTopic | undefined {
  return BANK_TOPICS.find((topic) => topic.slug === slug);
}

export function getBanksForTopic(topic: BankTopic, banks: BankExtended[] = getBanks()): BankExtended[] {
  if (topic.bankCodes) {
    const bankMap = new Map(banks.map((bank) => [bank.code, bank]));
    return topic.bankCodes.map((code) => bankMap.get(code)).filter((bank): bank is BankExtended => Boolean(bank));
  }

  if (topic.filter) {
    return banks.filter(topic.filter);
  }

  return [];
}
