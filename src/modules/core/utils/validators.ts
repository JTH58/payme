import { z } from "zod";

/**
 * 單一銀行帳號設定
 */
export const accountSchema = z.object({
  id: z.string(),
  bankCode: z
    .string()
    .length(3, { message: "銀行代碼必須為 3 碼" })
    .regex(/^\d+$/, { message: "銀行代碼只能包含數字" }),
  accountNumber: z
    .string()
    .regex(/^\d{10,16}$/, { message: "帳號長度必須介於 10 到 16 碼數字之間" }),
  isShared: z.boolean().default(true), // 控制是否包含在分享連結中
});

export type AccountSetting = z.infer<typeof accountSchema>;

/**
 * TWQR 表單驗證 Schema
 * 依照使用者提供的規格書定義：
 * 
 * 1. D5 轉入行庫代碼：固定 3 碼數字
 * 2. D6 轉入帳號：10~16 碼數字 (Regex: ^\d{10,16}$)
 * 3. D1 交易金額：大於 0 的整數 (Integer)
 * 4. D9 備註：長度限制 (通常建議 20 字以內以免 URL 過長)
 */
export const twqrFormSchema = z.object({
  // 當前主要/預覽的帳號 (相容舊邏輯)
  bankCode: z
    .string()
    .length(3, { message: "銀行代碼必須為 3 碼" })
    .regex(/^\d+$/, { message: "銀行代碼只能包含數字" }),
    
  accountNumber: z
    .string()
    .regex(/^\d{10,16}$/, { message: "帳號長度必須介於 10 到 16 碼數字之間" }),
    
  amount: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true; // 選填
      const num = Number(val);
      return Number.isInteger(num) && num > 0 && num <= 10000000;
    }, {
      message: "金額必須為大於 0 的整數",
    }),
    
  comment: z
    .string()
    .max(20, { message: "備註建議在 20 字以內" })
    .optional(),
});

export type TwqrFormValues = z.infer<typeof twqrFormSchema>;