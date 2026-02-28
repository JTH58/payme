import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TwqrFormValues } from '@/modules/core/utils/validators';
import { BillData, BillItem, SimpleData } from '@/types/bill';
import { FormSubMode, InputMethod, FORM_SUB_MODE_CONFIG, ALL_SUB_MODES } from '@/config/form-modes';
import { calculateSimpleSplit } from '@/modules/payment/utils/calculator';
import { SERVICE_CHARGE_MULTIPLIER } from '@/config/constants';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';
import { STORAGE_KEY } from '@/config/storage-keys';
import {
  Minus, Plus, RotateCcw, Trash2, User, UserPlus, X,
  FileUp, Info, Wallet, Sparkles,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────
interface SubModeSnapshot {
  items: BillItem[];
  hasServiceCharge: boolean;
  inputMethod: InputMethod;
}

interface UnifiedFormProps {
  form: UseFormReturn<TwqrFormValues>;
  subMode: FormSubMode;
  onSubModeChange: (subMode: FormSubMode) => void;
  reset: () => void;
  // Data callbacks
  onSplitDataChange?: (data: SimpleData | undefined) => void;
  onBillDataChange?: (data: BillData) => void;
  // Initial data (from share links or templates)
  initialSplitData?: SimpleData;
  initialBillData?: BillData;
  defaultSplitEnabled?: boolean;
  // Shared mode (read-only)
  isSharedMode?: boolean;
  // Template
  isTemplateActive?: boolean;
  onShowTemplateSubmit?: () => void;
  // Sheet triggers
  onShowAccountSheet?: () => void;
  onShowTemplateSheet?: () => void;
  // Confirm action
  onConfirm: () => void;
}

// ─── Sub-components ──────────────────────────────────────

/** 三選一 pill selector */
function SubModeSelector({
  value,
  onChange,
}: {
  value: FormSubMode;
  onChange: (v: FormSubMode) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-white/50 uppercase tracking-wider">收款類型</Label>
        <button
          type="button"
          className="text-white/30 hover:text-white/60 transition-colors"
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="說明"
        >
          <Info size={14} />
        </button>
      </div>

      {showTooltip && (
        <div className="text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg p-3 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {ALL_SUB_MODES.map(m => (
            <p key={m}><span className="text-white/80 font-medium">{FORM_SUB_MODE_CONFIG[m].label}</span>：{FORM_SUB_MODE_CONFIG[m].description}</p>
          ))}
        </div>
      )}

      <div className="bg-white/10 p-1 rounded-full flex items-center backdrop-blur-md">
        {ALL_SUB_MODES.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={value === m}
            className={cn(
              "flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all duration-300 active:scale-[0.98]",
              value === m
                ? 'bg-white text-black shadow-sm'
                : 'text-white/60 hover:text-white'
            )}
          >
            {FORM_SUB_MODE_CONFIG[m].label}
          </button>
        ))}
      </div>
    </div>
  );
}


/** CSS Grid 高度過渡：0fr ↔ 1fr，關閉後延遲卸載子節點 */
function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [shouldRender, setShouldRender] = useState(open);

  // 展開時同步掛載（render-time setState，避免多一幀空白）
  if (open && !shouldRender) {
    setShouldRender(true);
  }

  // 收合後延遲卸載（等動畫結束）
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div className={cn(
      "grid transition-[grid-template-rows] duration-300 ease-out",
      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
    )}>
      <div className="overflow-hidden min-h-0">
        {shouldRender && children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export function UnifiedForm({
  form,
  subMode,
  onSubModeChange,
  reset,
  onSplitDataChange,
  onBillDataChange,
  initialSplitData,
  initialBillData,
  defaultSplitEnabled = false,
  isSharedMode = false,
  isTemplateActive = false,
  onShowTemplateSubmit,
  onShowAccountSheet,
  onShowTemplateSheet,
  onConfirm,
}: UnifiedFormProps) {
  const { register, setValue, formState: { errors } } = form;
  const config = FORM_SUB_MODE_CONFIG[subMode];

  // ─── Snapshot cache for sub-mode isolation ────────
  const snapshotCacheRef = useRef<Partial<Record<FormSubMode, SubModeSnapshot>>>({});

  // ─── Input Method ──────────────────────────────────
  const [inputMethod, setInputMethod] = useState<InputMethod>(config.defaultInputMethod);

  // ─── Split state (personal/split + total mode) ────
  const [totalAmount, setTotalAmount] = useState<string>(initialSplitData?.ta || '');
  const [peopleCount, setPeopleCount] = useState<number>(initialSplitData?.pc || 2);
  const [hasServiceCharge, setHasServiceCharge] = useState<boolean>(
    initialSplitData?.sc || initialBillData?.s || false
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Items state (personal/split + items mode, or itemized) ────
  const [items, setItems] = useState<BillItem[]>(
    initialBillData?.i || [{ n: '', p: 0, o: [] }]
  );
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dirtyItemsRef = useRef<Set<number>>(
    new Set(initialBillData?.i ? initialBillData.i.map((_, idx) => idx) : [])
  );

  // ─── Bill state (itemized mode) ───────────────────
  const [members, setMembers] = useState<string[]>(initialBillData?.m || ['我']);
  const [newMemberName, setNewMemberName] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [title, setTitle] = useState(initialBillData?.t || '');

  // ─── Comment (personal/split only) ────────────────
  // In itemized mode, comment is auto-generated
  // Split mode: auto-generated until user manually edits
  const splitCommentDirtyRef = useRef(false);

  // ─── SubMode snapshot save/restore ─────────────────
  // 切換 subMode 時保存/還原各模式工作狀態
  // 使用 render-time setState（getDerivedStateFromProps 模式）
  // 確保 state 在 effects 執行前就已同步更新，避免中繼狀態觸發錯誤的計算
  const prevSubModeRef = useRef(subMode);
  if (prevSubModeRef.current !== subMode) {
    const prevMode = prevSubModeRef.current;
    prevSubModeRef.current = subMode;

    // ① 離開時保存快照
    snapshotCacheRef.current[prevMode] = {
      items: items.map(item => ({ ...item })),
      hasServiceCharge,
      inputMethod,
    };

    // ② 進入時還原快照（itemized 由 sync effect 處理 items/serviceCharge）
    const cached = snapshotCacheRef.current[subMode];
    if (cached) {
      setInputMethod(cached.inputMethod);
      if (subMode !== 'itemized') {
        setItems(cached.items);
        setHasServiceCharge(cached.hasServiceCharge);
      }
    } else {
      // 首次進入該模式 → 用預設值
      const newConfig = FORM_SUB_MODE_CONFIG[subMode];
      setInputMethod(newConfig.defaultInputMethod);
      if (subMode !== 'itemized') {
        setItems([{ n: '', p: 0, o: [] }]);
        setHasServiceCharge(false);
      }
    }
  }

  // ─── Itemized state sync (因為不再 remount) ──────
  // 進入 itemized 時，從 parent 傳入的 billData 同步內部 state
  // 使用 ref 確保每次 subMode 轉場只同步一次，避免 user 編輯後被覆蓋
  const syncedForSubModeRef = useRef<string | null>(null);

  useEffect(() => {
    // 進入 itemized 且 billData 已就緒 → 同步一次
    if (subMode === 'itemized' && initialBillData && syncedForSubModeRef.current !== 'itemized') {
      syncedForSubModeRef.current = 'itemized';
      setItems(initialBillData.i || [{ n: '', p: 0, o: [] }]);
      setMembers(initialBillData.m || ['我']);
      setTitle(initialBillData.t || '');
      setHasServiceCharge(initialBillData.s || false);
      dirtyItemsRef.current = new Set(
        initialBillData.i ? initialBillData.i.map((_: BillItem, idx: number) => idx) : []
      );
    }
    // 離開 itemized 時 reset flag，讓下次進入能重新同步
    if (subMode !== 'itemized') {
      syncedForSubModeRef.current = null;
    }
  }, [subMode, initialBillData]);

  // Initialize from localStorage (mount-only)
  // Guard ref 防止 initialSplitData 從 truthy → undefined 時重新觸發
  // （personal+total effect 呼叫 onSplitDataChange(undefined) 會改變 initialSplitData prop）
  const hasInitializedSplitRef = useRef(false);
  useEffect(() => {
    if (hasInitializedSplitRef.current) return;
    hasInitializedSplitRef.current = true;
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
      } catch { /* ignore */ }
    }
    setIsLoaded(true);
  }, [isSharedMode, initialSplitData]);

  // ─── Members auto-assign (itemized) ───────────────
  useEffect(() => {
    if (subMode !== 'itemized') return;
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
  }, [members, subMode]);

  // ─── Calculation effects ──────────────────────────

  // Split mode + total: calculate per-person
  useEffect(() => {
    if (subMode !== 'split' || inputMethod !== 'total') return;
    if (!isSharedMode && !isLoaded) return;

    if (!isSharedMode) {
      safeSetItem(STORAGE_KEY.simpleInputs, JSON.stringify({
        totalAmount, peopleCount, hasServiceCharge, isSplitEnabled: true,
      }));
    }

    if (onSplitDataChange) {
      onSplitDataChange({ ta: totalAmount, pc: peopleCount, sc: hasServiceCharge });
    }

    const result = calculateSimpleSplit(totalAmount, peopleCount, hasServiceCharge);
    if (!result) return;

    setValue('amount', result.perPersonAmount.toString(), { shouldValidate: true });
    if (!splitCommentDirtyRef.current) {
      setValue('comment', result.comment, { shouldValidate: true });
    }
  }, [totalAmount, peopleCount, hasServiceCharge, subMode, inputMethod, setValue, onSplitDataChange, isLoaded, isSharedMode]);

  // Split mode + items: sum items, then split
  useEffect(() => {
    if (subMode !== 'split' || inputMethod !== 'items') return;

    const itemTotal = items.reduce((sum, item) => sum + (Number(item.p) || 0), 0);
    const finalTotal = hasServiceCharge ? Math.round(itemTotal * SERVICE_CHARGE_MULTIPLIER) : itemTotal;
    const perPerson = peopleCount > 0 ? Math.round(finalTotal / peopleCount) : 0;

    const serviceText = hasServiceCharge ? '(含服務費)' : '';
    const comment = `均分$${finalTotal}${serviceText}/${peopleCount}人`.slice(0, 20);

    setValue('amount', perPerson.toString(), { shouldValidate: true });
    if (!splitCommentDirtyRef.current) {
      setValue('comment', comment, { shouldValidate: true });
    }

    if (onSplitDataChange) {
      onSplitDataChange({ ta: itemTotal.toString(), pc: peopleCount, sc: hasServiceCharge });
    }
  }, [items, peopleCount, hasServiceCharge, subMode, inputMethod, setValue, onSplitDataChange]);

  // Personal + items: sum items into amount
  useEffect(() => {
    if (subMode !== 'personal' || inputMethod !== 'items') return;

    const itemTotal = items.reduce((sum, item) => sum + (Number(item.p) || 0), 0);
    const finalTotal = hasServiceCharge ? Math.round(itemTotal * SERVICE_CHARGE_MULTIPLIER) : itemTotal;

    setValue('amount', finalTotal.toString(), { shouldValidate: true });
  }, [items, hasServiceCharge, subMode, inputMethod, setValue]);

  // Personal + total: clear split data
  useEffect(() => {
    if (subMode !== 'personal') return;
    if (onSplitDataChange) onSplitDataChange(undefined);
  }, [subMode, onSplitDataChange]);

  // Itemized mode: full BillData calculation
  const onBillDataChangeRef = useRef(onBillDataChange);
  onBillDataChangeRef.current = onBillDataChange;

  useEffect(() => {
    if (subMode !== 'itemized') return;

    const subtotal = items.reduce((sum, item) => sum + (Number(item.p) || 0), 0);
    const total = hasServiceCharge ? Math.round(subtotal * SERVICE_CHARGE_MULTIPLIER) : subtotal;

    setValue('amount', total.toString());

    const serviceText = hasServiceCharge ? '(含10%服務費)' : '';
    const titleText = title ? `[${title}] ` : '';
    setValue('comment', `${titleText}分帳: 總額$${total}${serviceText}`.slice(0, 20));

    if (onBillDataChangeRef.current) {
      onBillDataChangeRef.current({
        t: title,
        m: members,
        i: items,
        s: hasServiceCharge,
      });
    }
  }, [title, members, items, hasServiceCharge, subMode, setValue]);

  // ─── Handlers ─────────────────────────────────────

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
    const allMemberIndices = subMode === 'itemized' ? members.map((_, i) => i) : [];
    const newItems = [...items, { n: '', p: 0, o: allMemberIndices }];
    setItems(newItems);
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

  const updateItem = (index: number, field: keyof BillItem, value: string | number | number[]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const toggleItemOwner = (itemIndex: number, memberIndex: number) => {
    dirtyItemsRef.current.add(itemIndex);
    const item = items[itemIndex];
    const newOwners = item.o.includes(memberIndex)
      ? item.o.filter(i => i !== memberIndex)
      : [...item.o, memberIndex];
    updateItem(itemIndex, 'o', newOwners);
  };

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleReset = () => {
    reset();
    setTotalAmount('');
    setPeopleCount(2);
    setHasServiceCharge(false);
    setItems([{ n: '', p: 0, o: [] }]);
    setMembers(['我']);
    setNewMemberName('');
    setTitle('');
    dirtyItemsRef.current = new Set();
    splitCommentDirtyRef.current = false;
    // 清除當前模式的快照，避免 reset 後切回時還原舊資料
    delete snapshotCacheRef.current[subMode];
  };

  // ─── Derived state ────────────────────────────────
  const useItemsCheckbox = inputMethod === 'items';
  const showCheckbox = subMode !== 'itemized';
  const showItemsList = inputMethod === 'items';
  const showSplitSection = subMode === 'split' || subMode === 'itemized';
  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.p) || 0), 0);

  // ─── Render ───────────────────────────────────────

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
      {/* 1. Sub-mode selector */}
      <SubModeSelector value={subMode} onChange={onSubModeChange} />

      <div className="border-t border-white/[0.06]" />

      {/* 2. Checkbox: 使用明細計算 (personal/split only) */}
      {showCheckbox && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useItemsCalc"
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={useItemsCheckbox}
            onChange={(e) => {
              const next = e.target.checked ? 'items' : 'total';
              setInputMethod(next);
              // 個人模式從明細切回直接輸入時，清除 items 計算殘留的 '0' 金額
              // amount 在 personal 模式為選填，留空即可產生 QR
              if (next === 'total' && subMode === 'personal') {
                form.setValue('amount', '', { shouldValidate: true });
              }
            }}
          />
          <Label htmlFor="useItemsCalc" className="text-sm font-normal cursor-pointer select-none">
            使用明細計算
          </Label>
        </div>
      )}

      {/* 2.5 Members management (itemized — above items so user adds people first) */}
      {subMode === 'itemized' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Label>分帳成員 ({members.length}人)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {members.map((m, i) => (
              <Badge key={i} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                <User size={12} className="opacity-50" />
                {m}
                {i > 0 && (
                  <button onClick={() => removeMember(i)} className="ml-1 hover:text-red-400">
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
              className="h-10 text-sm"
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
      )}

      {/* 3. Amount / Items section */}
      <div className="space-y-3">
        {/* ── Amount input (collapses when items mode active) ── */}
        {subMode === 'split' && (
          <AnimatedCollapse open={!showItemsList}>
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
            </div>
          </AnimatedCollapse>
        )}

        {subMode === 'personal' && (
          <AnimatedCollapse open={!showItemsList}>
            <div className="space-y-2">
              <Label htmlFor="amount">轉帳金額 (選填)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-white/50">$</span>
                <Input
                  id="amount"
                  className={cn(
                    "pl-7 text-lg font-medium transition-transform",
                    errors.amount && 'border-red-500/50 animate-shake'
                  )}
                  placeholder="0"
                  type="number"
                  inputMode="numeric"
                  {...register('amount')}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">{errors.amount.message}</p>}
            </div>
          </AnimatedCollapse>
        )}

        {/* ── Items list (collapses when total mode active) ── */}
        {subMode !== 'itemized' && (
          <AnimatedCollapse open={showItemsList}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>消費明細</Label>
                <Button size="sm" variant="ghost" onClick={addItem} type="button" className="text-purple-400 hover:text-purple-300 h-9 px-2">
                  <Plus size={14} className="mr-1" /> 新增項目
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {items.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex gap-2 items-center group">
                      {/* Item name */}
                      <Input
                        ref={(el) => { itemInputRefs.current[idx] = el; }}
                        value={item.n}
                        onChange={(e) => updateItem(idx, 'n', e.target.value)}
                        className="h-10 text-sm flex-1 bg-white/5 border-white/10 focus:border-white/30 focus:bg-white/10 placeholder:text-white/20 transition-all duration-200"
                        placeholder="項目名稱"
                        aria-label={`項目 ${idx + 1} 名稱`}
                      />

                      {/* Item price */}
                      <div className="relative w-28 flex-shrink-0">
                        <span className="absolute left-3 top-3 text-xs text-white/40 font-bold">$</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={item.p || ''}
                          onChange={(e) => updateItem(idx, 'p', Number(e.target.value))}
                          className="h-10 text-sm pl-6 bg-white/10 border-white/20 focus:bg-white/20 text-right font-medium placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-200"
                          placeholder="0"
                          aria-label={`項目 ${idx + 1} 金額`}
                        />
                      </div>

                      {/* Delete button */}
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
                  </div>
                ))}
              </div>

              {/* Items sum */}
              <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm">
                <span className="text-white/50">{items.length} 筆項目小計</span>
                <span className="text-white font-medium">${itemsTotal}</span>
              </div>
            </div>
          </AnimatedCollapse>
        )}

        {/* ── Items list (itemized — always visible, no collapse) ── */}
        {subMode === 'itemized' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <Label>消費明細</Label>
              <Button size="sm" variant="ghost" onClick={addItem} type="button" className="text-purple-400 hover:text-purple-300 h-9 px-2">
                <Plus size={14} className="mr-1" /> 新增項目
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex gap-2 items-center group">
                    {/* Item name */}
                    <Input
                      ref={(el) => { itemInputRefs.current[idx] = el; }}
                      value={item.n}
                      onChange={(e) => updateItem(idx, 'n', e.target.value)}
                      className="h-10 text-sm flex-1 bg-white/5 border-white/10 focus:border-white/30 focus:bg-white/10 placeholder:text-white/20 transition-all duration-200"
                      placeholder="項目名稱"
                      aria-label={`項目 ${idx + 1} 名稱`}
                    />

                    {/* Item price */}
                    <div className="relative w-28 flex-shrink-0">
                      <span className="absolute left-3 top-3 text-xs text-white/40 font-bold">$</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={item.p || ''}
                        onChange={(e) => updateItem(idx, 'p', Number(e.target.value))}
                        className="h-10 text-sm pl-6 bg-white/10 border-white/20 focus:bg-white/20 text-right font-medium placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-200"
                        placeholder="0"
                        aria-label={`項目 ${idx + 1} 金額`}
                      />
                    </div>

                    {/* Delete button */}
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

                  {/* Inline member chips (itemized only) */}
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

            {/* Items sum */}
            <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm">
              <span className="text-white/50">{items.length} 筆項目小計</span>
              <span className="text-white font-medium">${itemsTotal}</span>
            </div>
          </div>
        )}

        {/* Service charge checkbox */}
        <div className="flex items-center gap-2">
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

      {/* 4. Split section (conditional) */}
      {subMode === 'split' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* People counter */}
          <Label>分攤人數</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
              className="h-10 w-10 rounded-full border-white/20 hover:bg-white/10"
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
              className="h-10 w-10 rounded-full border-white/20 hover:bg-white/10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Per-person preview */}
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center space-y-1">
            <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold">每人應付</p>
            <p className="text-3xl font-bold text-white">
              ${form.watch('amount') || 0}
            </p>
            {hasServiceCharge && (
              <p className="text-xs text-white/30">(已包含服務費)</p>
            )}
          </div>
        </div>
      )}

      {/* Personal: 總額 preview (collapses when total mode) */}
      {subMode === 'personal' && (
        <AnimatedCollapse open={showItemsList}>
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center space-y-1">
            <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold">總額</p>
            <p className="text-3xl font-bold text-white">
              ${form.watch('amount') || 0}
            </p>
            {hasServiceCharge && (
              <p className="text-xs text-white/30">(已包含服務費)</p>
            )}
          </div>
        </AnimatedCollapse>
      )}

      {subMode === 'itemized' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Title */}
          <div className="space-y-2">
            <Label>活動標題</Label>
            <Input
              placeholder="例如：週五燒肉局"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Summary stats */}
          <div className="pt-4 border-t border-white/10 text-xs text-white/50 space-y-1">
            <p>總計 {items.length} 筆項目</p>
            <p>{members.length} 人分攤</p>
          </div>

          {/* 總額 preview card */}
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center space-y-1">
            <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold">總額</p>
            <p className="text-3xl font-bold text-white">
              ${form.watch('amount')}
            </p>
            {hasServiceCharge && (
              <p className="text-xs text-white/30">(已包含服務費)</p>
            )}
          </div>
        </div>
      )}

      {/* 5. Comment (personal: editable / split: readOnly auto-generated) */}
      {subMode === 'personal' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Label htmlFor="comment">轉帳備註 (選填)</Label>
          <Input
            id="comment"
            placeholder="例如：聚餐費"
            className={cn(
              "transition-transform",
              errors.comment && 'border-red-500/50 animate-shake'
            )}
            {...register('comment')}
          />
          {errors.comment && <p className="text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">{errors.comment.message}</p>}
        </div>
      )}

      {subMode === 'split' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Label htmlFor="comment">轉帳備註 (選填)</Label>
          <Input
            id="comment"
            placeholder="自動產生"
            className={cn(
              "transition-transform",
              !splitCommentDirtyRef.current && 'opacity-60'
            )}
            {...register('comment', {
              onChange: () => { splitCommentDirtyRef.current = true; },
            })}
          />
        </div>
      )}

      {/* 6. Action buttons */}
      <div className="border-t border-white/[0.06] pt-4 space-y-3">
        <Button
          type="button"
          className="w-full bg-white text-black hover:bg-white/90 active:scale-[0.98] transition-transform font-medium"
          onClick={handleConfirm}
        >
          確定
        </Button>

        <div className="flex items-center gap-2">
          {onShowAccountSheet && (
            <button
              type="button"
              onClick={onShowAccountSheet}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-white/60 hover:text-white/90 border border-white/10 hover:border-white/20 rounded-lg transition-all active:scale-[0.98]"
            >
              <Wallet className="w-3 h-3" />
              帳戶設定
            </button>
          )}

          {onShowTemplateSheet && (
            <button
              type="button"
              onClick={onShowTemplateSheet}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-white/60 hover:text-white/90 border border-white/10 hover:border-white/20 rounded-lg transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3 h-3" />
              使用模板
            </button>
          )}

          {onShowTemplateSubmit && (
            <button
              type="button"
              onClick={onShowTemplateSubmit}
              disabled={isTemplateActive}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2 text-xs border rounded-lg transition-all active:scale-[0.98]",
                isTemplateActive
                  ? 'text-white/20 border-white/5 cursor-not-allowed'
                  : 'text-white/60 border-white/10 hover:text-white/90 hover:border-white/20'
              )}
              title={isTemplateActive ? '請先修改模板內容再投稿' : undefined}
            >
              <FileUp className="w-3 h-3" />
              投稿模板
            </button>
          )}

          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-white/60 hover:text-white/90 border border-white/10 hover:border-white/20 rounded-lg transition-all active:scale-[0.98]"
            onClick={handleReset}
          >
            <RotateCcw className="w-3 h-3" />
            清除全部
          </button>
        </div>
      </div>
    </div>
  );
}
