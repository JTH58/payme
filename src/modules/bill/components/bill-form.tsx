import React, { useState, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { BillData, BillItem } from '@/types/bill';
import { Plus, Trash2, User, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SERVICE_CHARGE_MULTIPLIER } from '@/config/constants';
import { HelpDialog } from '@/components/help-dialog';

interface BillFormProps {
  form: UseFormReturn<TwqrFormValues>;
  onBillDataChange: (data: BillData) => void;
  initialData?: BillData;
}

export function BillForm({ form, onBillDataChange, initialData }: BillFormProps) {
  const { setValue } = form;

  // Local State for Bill Logic
  const [title, setTitle] = useState(initialData?.t || '');
  const [hasServiceCharge, setHasServiceCharge] = useState(initialData?.s || false);

  // 成員列表 (預設只有自己)
  const [members, setMembers] = useState<string[]>(initialData?.m || ['我']);
  const [newMemberName, setNewMemberName] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  // 項目列表（預設全選所有成員）
  const [items, setItems] = useState<BillItem[]>(initialData?.i || [
    { n: '', p: 0, o: members.map((_, i) => i) }
  ]);

  const [helpOpen, setHelpOpen] = useState(false);

  // 用於自動 Focus 新增的項目
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 追蹤被手動修改過的項目索引（dirty = 不再自動全選）
  const dirtyItemsRef = useRef<Set<number>>(
    new Set(initialData?.i ? initialData.i.map((_, idx) => idx) : [])
  );

  // 成員變更時，自動全選未被手動修改過的項目
  useEffect(() => {
    const allIndices = members.map((_, i) => i);
    setItems(prev => {
      let changed = false;
      const next = prev.map((item, idx) => {
        if (dirtyItemsRef.current.has(idx)) return item;
        const sorted = [...item.o].sort((a, b) => a - b);
        if (sorted.length === allIndices.length && sorted.every((v, i) => v === allIndices[i])) return item;
        changed = true;
        return { ...item, o: allIndices };
      });
      return changed ? next : prev;
    });
  }, [members]);

  // 計算邏輯
  useEffect(() => {
    // 1. 計算總金額 (包含服務費)
    const subtotal = items.reduce((sum, item) => sum + (Number(item.p) || 0), 0);
    const total = hasServiceCharge ? Math.round(subtotal * SERVICE_CHARGE_MULTIPLIER) : subtotal;

    // 2. 更新主表單的 Amount (這裡顯示總收款額，讓 Host 知道總共要收多少)
    setValue('amount', total.toString());

    // 3. 更新主表單的 Comment
    const serviceText = hasServiceCharge ? '(含10%服務費)' : '';
    const titleText = title ? `[${title}] ` : '';
    setValue('comment', `${titleText}分帳: 總額$${total}${serviceText}`);

    // 4. 將完整資料傳回父元件 (以便打包分享)
    onBillDataChange({
      t: title,
      m: members,
      i: items,
      s: hasServiceCharge
    });

  }, [title, members, items, hasServiceCharge, setValue, onBillDataChange]);

  // Handlers
  const addMember = () => {
    const name = newMemberName.trim();
    if (name) {
      if (members.includes(name)) {
        setDuplicateError('成員名稱不能重複');
        setTimeout(() => setDuplicateError(''), 3000);
        return;
      }
      setMembers([...members, name]);
      setNewMemberName('');
    }
  };

  const removeMember = (memberIndex: number) => {
    setMembers(members.filter((_, idx) => idx !== memberIndex));
    setItems(prev => prev.map(item => ({
      ...item,
      o: item.o
        .filter(i => i !== memberIndex)
        .map(i => i > memberIndex ? i - 1 : i)
    })));
  };

  const addItem = () => {
    // 預設將所有人加入分攤名單 (全選)
    const allMemberIndices = members.map((_, i) => i);
    const newItems = [...items, { n: '', p: 0, o: allMemberIndices }];
    setItems(newItems);

    // 等待 Render 完成後，將焦點移至新項目的輸入框
    setTimeout(() => {
      const newIndex = newItems.length - 1;
      itemInputRefs.current[newIndex]?.focus();
    }, 0);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    const newDirty = new Set<number>();
    dirtyItemsRef.current.forEach(i => {
      if (i < index) newDirty.add(i);
      else if (i > index) newDirty.add(i - 1);
    });
    dirtyItemsRef.current = newDirty;
  };

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const toggleItemOwner = (itemIndex: number, memberIndex: number) => {
    dirtyItemsRef.current.add(itemIndex);
    const item = items[itemIndex];
    const newOwners = item.o.includes(memberIndex)
      ? item.o.filter(i => i !== memberIndex) // Remove
      : [...item.o, memberIndex]; // Add

    updateItem(itemIndex, 'o', newOwners);
  };

  return (
    <Card className="h-fit border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🧾</span> 分帳模式
          {/* TODO: 如何使用暫時隱藏，待 guide 內容完善後恢復
          <button type="button" onClick={() => setHelpOpen(true)} className="text-xs text-blue-400 hover:underline font-normal">如何使用？</button>
          */}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* 標題與服務費 */}
        <div className="space-y-2">
          <Label>活動標題</Label>
          <div className="flex gap-2">
            <Input
              placeholder="例如：週五燒肉局"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <div className="flex items-center gap-2 border border-white/10 rounded-md px-3 bg-white/5">
              <input
                type="checkbox"
                id="billService"
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0"
                checked={hasServiceCharge}
                onChange={(e) => setHasServiceCharge(e.target.checked)}
              />
              <Label htmlFor="billService" className="text-sm cursor-pointer whitespace-nowrap">
                +10%
              </Label>
            </div>
          </div>
        </div>

        {/* 成員管理 */}
        <div className="space-y-2">
          <Label>分帳成員 ({members.length}人)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {members.map((m, i) => (
              <Badge key={i} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                <User size={12} className="opacity-50" />
                {m}
                {i > 0 && ( // 不允許刪除自己 (Host)
                  <button
                    onClick={() => removeMember(i)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="輸入朋友名字..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
              className="h-10"
              aria-label="新增成員名稱"
            />
            <Button size="sm" variant="outline" onClick={addMember} type="button">
              <UserPlus size={14} />
            </Button>
          </div>
          {duplicateError && (
            <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">{duplicateError}</p>
          )}
        </div>

        {/* 項目清單 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>消費明細</Label>
            <Button size="sm" variant="ghost" onClick={addItem} type="button" className="text-purple-400 hover:text-purple-300 h-9 px-2">
              <Plus size={14} className="mr-1" /> 新增項目
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                {/* Row 1: Name + Price + Delete */}
                <div className="flex gap-2 items-center group">
                  <Input
                    ref={(el) => { itemInputRefs.current[idx] = el; }}
                    value={item.n}
                    onChange={(e) => updateItem(idx, 'n', e.target.value)}
                    className="h-10 flex-1 bg-white/5 border-white/10 focus:border-white/30 focus:bg-white/10 placeholder:text-white/20 transition-all duration-200"
                    placeholder="項目名稱"
                    aria-label={`項目 ${idx + 1} 名稱`}
                  />

                  <div className="relative w-28 flex-shrink-0">
                    <span className="absolute left-3 top-3 text-xs text-white/40 font-bold">$</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={item.p || ''}
                      onChange={(e) => updateItem(idx, 'p', Number(e.target.value))}
                      className="h-10 pl-6 bg-white/10 border-white/20 focus:bg-white/20 text-right font-medium placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-200"
                      placeholder="0"
                      aria-label={`項目 ${idx + 1} 金額`}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-white/5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                {/* Row 2: Inline member chips */}
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {members.map((m, mIdx) => {
                      const isSelected = item.o.includes(mIdx);
                      return (
                        <button
                          key={mIdx}
                          type="button"
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border transition-all duration-150 active:scale-[0.95]",
                            isSelected
                              ? "bg-purple-500/20 text-purple-200 border-purple-500/50"
                              : "text-white/30 border-white/10 hover:text-white/50 hover:border-white/20"
                          )}
                          onClick={() => toggleItemOwner(idx, mIdx)}
                        >
                          {m}{isSelected ? '✓' : ''}
                        </button>
                      );
                    })}
                    {item.o.length < members.length && (
                      <button
                        type="button"
                        className="text-[10px] px-1.5 py-0.5 text-purple-400 hover:underline"
                        onClick={() => { dirtyItemsRef.current.add(idx); updateItem(idx, 'o', members.map((_, i) => i)); }}
                      >
                        全選
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 總結 */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
          <div className="text-xs text-white/50 space-y-1">
            <p>總計 {items.length} 筆項目</p>
            <p>{members.length} 人分攤</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50 mb-1">總收款額</p>
            <p className="text-2xl font-bold text-white">${form.watch('amount')}</p>
          </div>
        </div>

      </CardContent>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} scenarioId="split-bill" />
    </Card>
  );
}
