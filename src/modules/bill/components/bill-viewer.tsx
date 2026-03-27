import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { BillData } from '@/types/bill';
import { calculateMemberAmount } from '../core/calculator';
import { Check, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BillViewerProps {
  form: UseFormReturn<TwqrFormValues>;
  billData: BillData;
}

export function BillViewer({ form, billData }: BillViewerProps) {
  const { setValue } = form;
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);

  // 初始化：清空金額，避免一進來就顯示總金額的 QR Code
  useEffect(() => {
    setValue('amount', '', { shouldValidate: true });
  }, [setValue]);

  // 當使用者選擇成員時，計算該成員應付金額
  useEffect(() => {
    if (selectedMemberIndex === null) return;
    if (selectedMemberIndex < 0 || selectedMemberIndex >= billData.m.length) return;

    const memberName = billData.m[selectedMemberIndex];
    
    // 使用核心邏輯計算金額
    const memberTotal = calculateMemberAmount(billData, selectedMemberIndex);

    // 更新表單與 QR Code
    setValue('amount', memberTotal.toString(), { shouldValidate: true });
    
    // 更新備註（截斷至 20 字以符合 schema 限制）
    // 範例: [週五燒肉局] 分帳 (Alex)
    const titleText = billData.t ? `[${billData.t}] ` : '';
    const fullComment = `${titleText}分帳 (${memberName})`;
    setValue('comment', fullComment.slice(0, 20), { shouldValidate: true });

  }, [selectedMemberIndex, billData, setValue, form]);

  return (
    <Card className="h-fit border-l-4 border-l-purple-500 bg-white/85 border-slate-200 shadow-sm shadow-sky-100/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-400">
           <span>🧾</span> 帳單明細 (唯讀)
        </CardTitle>
        <p className="text-sm text-slate-600">
           {billData.t || '未命名帳單'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* 1. 身份認領區 */}
        <div className="space-y-3">
           <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">1</span>
              <h4 className="font-medium text-slate-900">請問您是哪一位？</h4>
           </div>
           
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {billData.m.map((member, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMemberIndex(idx)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium",
                    selectedMemberIndex === idx
                      ? "bg-purple-500 text-white border-purple-500 shadow-glow-purple active:scale-[0.98]"
                      : "bg-white/80 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {selectedMemberIndex === idx ? <Check size={16} /> : <User size={16} />}
                  {member}
                </button>
              ))}
           </div>
        </div>

        {/* 2. 帳單明細預覽 */}
        <div className="space-y-3 pt-4 border-t border-slate-200 opacity-90">
           <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">2</span>
              <h4 className="font-medium text-slate-700 text-sm">消費內容</h4>
           </div>
           
           <div className="space-y-2 text-sm">
             {billData.i.map((item, idx) => {
                const isMine = selectedMemberIndex !== null && item.o.includes(selectedMemberIndex);
                return (
                  <div key={idx} className={cn(
                    "flex justify-between items-center p-2 rounded",
                    isMine ? "bg-purple-500/10" : "transparent"
                  )}>
                    <div className="flex items-center gap-2">
                       <span className="text-slate-800">{item.n}</span>
                       {isMine && <Badge variant="secondary" className="text-[10px] h-4 px-1">我也有份</Badge>}
                    </div>
                    <span className="font-mono text-slate-600">${item.p}</span>
                  </div>
                )
             })}
             
             {billData.s && (
               <div className="flex justify-between items-center p-2 text-slate-500 italic">
                 <span>+ 10% 服務費</span>
               </div>
             )}
           </div>
        </div>

        {/* 3. 應付金額 */}
        {selectedMemberIndex !== null && (
           <div className="pt-4 border-t border-slate-200 text-center animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm text-purple-300 mb-1">您應支付的金額</p>
              <p className="text-4xl font-bold text-slate-900">
                 ${form.watch('amount')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                 右側 QR Code 已自動更新
              </p>
           </div>
        )}

      </CardContent>
    </Card>
  );
}
