import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { SimpleData } from '@/types/bill';
import { calculateSimpleSplit } from '../utils/calculator';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';
import { STORAGE_KEY } from '@/config/storage-keys';

interface PaymentFormProps {
  form: UseFormReturn<TwqrFormValues>;
  reset: () => void;
  initialSplitData?: SimpleData;
  onSplitDataChange?: (data: SimpleData | undefined) => void;
  isSharedMode?: boolean;
  defaultSplitEnabled?: boolean;
}

export function PaymentForm({
  form,
  reset,
  initialSplitData,
  onSplitDataChange,
  isSharedMode = false,
  defaultSplitEnabled = false,
}: PaymentFormProps) {
  const { register, setValue, formState: { errors } } = form;

  // Toggle 狀態
  const [isSplitEnabled, setIsSplitEnabled] = React.useState(
    defaultSplitEnabled || !!initialSplitData
  );

  // 均分計算器本地狀態
  const [totalAmount, setTotalAmount] = React.useState<string>(initialSplitData?.ta || '');
  const [peopleCount, setPeopleCount] = React.useState<number>(initialSplitData?.pc || 2);
  const [hasServiceCharge, setHasServiceCharge] = React.useState<boolean>(initialSplitData?.sc || false);

  // 防止 Race Condition
  const [isLoaded, setIsLoaded] = React.useState(false);

  // 初始化：從 localStorage 恢復狀態 (僅當不是分享模式時)
  useEffect(() => {
    if (isSharedMode || initialSplitData) {
      setIsLoaded(true);
      return;
    }

    const saved = safeGetItem(STORAGE_KEY.simpleInputs);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.totalAmount) setTotalAmount(parsed.totalAmount);
        if (parsed.peopleCount) setPeopleCount(parsed.peopleCount);
        if (typeof parsed.hasServiceCharge === 'boolean') setHasServiceCharge(parsed.hasServiceCharge);
        if (typeof parsed.isSplitEnabled === 'boolean') setIsSplitEnabled(parsed.isSplitEnabled);
      } catch (e) {
        console.error('Failed to load simple form inputs', e);
      }
    }
    setIsLoaded(true);
  }, [isSharedMode, initialSplitData]);

  // 均分計算邏輯 — 只在 split 開啟時觸發
  useEffect(() => {
    if (!isSplitEnabled) return;
    if (!isSharedMode && !isLoaded) return;

    // 儲存狀態到 localStorage
    if (!isSharedMode) {
      safeSetItem(STORAGE_KEY.simpleInputs, JSON.stringify({
        totalAmount,
        peopleCount,
        hasServiceCharge,
        isSplitEnabled,
      }));
    }

    // 回傳資料給上層 (用於分享)
    if (onSplitDataChange) {
      onSplitDataChange({
        ta: totalAmount,
        pc: peopleCount,
        sc: hasServiceCharge
      });
    }

    const result = calculateSimpleSplit(totalAmount, peopleCount, hasServiceCharge);
    if (!result) return;

    setValue('amount', result.perPersonAmount.toString(), { shouldValidate: true });
    setValue('comment', result.comment, { shouldValidate: true });
  }, [totalAmount, peopleCount, hasServiceCharge, isSplitEnabled, setValue, form, onSplitDataChange, isLoaded, isSharedMode]);

  // Toggle 切換時的持久化 + 清理
  useEffect(() => {
    if (!isLoaded || isSharedMode) return;

    safeSetItem(STORAGE_KEY.simpleInputs, JSON.stringify({
      totalAmount,
      peopleCount,
      hasServiceCharge,
      isSplitEnabled,
    }));

    if (!isSplitEnabled) {
      // 切回直接輸入模式時，清除均分計算的資料
      if (onSplitDataChange) {
        onSplitDataChange(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 僅在 toggle 切換時執行；其餘值的變化已由上方 effect (line 69-98) 處理
  }, [isSplitEnabled, isLoaded, isSharedMode]);

  return (
    <Card className="h-fit border-l-4 border-l-emerald-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>💰</span> 收款資訊
          </span>
          {/* 均分 Toggle */}
          <button
            type="button"
            onClick={() => setIsSplitEnabled(!isSplitEnabled)}
            className="flex items-center gap-2 text-sm font-normal text-white/60 hover:text-white/80 transition-colors"
          >
            <span>均分計算</span>
            <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${isSplitEnabled ? 'bg-blue-500 justify-end' : 'bg-white/20 justify-start'
              }`}>
              <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
            </div>
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {isSplitEnabled ? (
          /* === 均分計算區塊 === */
          <>
            {/* 總金額輸入 */}
            <div className="space-y-2">
              <Label htmlFor="totalAmount">消費總金額</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-white/50">$</span>
                <Input
                  id="totalAmount"
                  className="pl-7 text-lg font-medium"
                  placeholder="0"
                  type="number"
                  inputMode="numeric"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="serviceCharge"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={hasServiceCharge}
                  onChange={(e) => setHasServiceCharge(e.target.checked)}
                />
                <Label htmlFor="serviceCharge" className="text-sm font-normal cursor-pointer select-none">
                  加收 10% 服務費
                </Label>
              </div>
            </div>

            {/* 人數計數器 */}
            <div className="space-y-2">
              <Label>分攤人數</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                  className="h-10 w-10 rounded-full border-white/20 hover:bg-white/10 "
                >
                  <Minus className="w-4 h-4" />
                </Button>

                <div className="flex-1 text-center bg-white/5 rounded-lg py-2 font-mono text-xl">
                  {peopleCount} <span className="text-sm text-white/40">人</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPeopleCount(peopleCount + 1)}
                  className="h-10 w-10 rounded-full border-white/20 hover:bg-white/10 "
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 試算結果預覽 */}
            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center space-y-1">
              <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold">每人應付</p>
              <p className="text-3xl font-bold text-white">
                ${form.watch('amount') || 0}
              </p>
              {hasServiceCharge && (
                <p className="text-xs text-white/30">(已包含服務費)</p>
              )}
            </div>
          </>
        ) : (
          /* === 直接輸入模式 === */
          <>
            {/* 金額輸入 */}
            <div className="space-y-2">
              <Label htmlFor="amount">轉帳金額 (選填)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-white/50">$</span>
                <Input
                  id="amount"
                  className={`pl-7 text-lg font-medium transition-transform ${errors.amount ? 'border-red-500/50 animate-shake' : ''}`}
                  placeholder="0"
                  type="number"
                  inputMode="numeric"
                  {...register('amount')}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">{errors.amount.message}</p>}
            </div>

            {/* 備註輸入 */}
            <div className="space-y-2">
              <Label htmlFor="comment">轉帳備註 (選填)</Label>
              <Input
                id="comment"
                placeholder="例如：聚餐費"
                className={`transition-transform ${errors.comment ? 'border-red-500/50 animate-shake' : ''}`}
                {...register('comment')}
              />
              {errors.comment && <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">{errors.comment.message}</p>}
            </div>
          </>
        )}

        {/* 重置按鈕 */}
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full text-white/50 hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all"
            onClick={reset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            清空所有欄位
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
