'use client';

import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, Unlock } from 'lucide-react';
import LZString from 'lz-string';
import { decrypt, isCryptoAvailable } from '@/lib/crypto';
import { AppMode } from '@/config/routes';
import { CompressedData } from '@/types/bill';

interface DecryptionChallengeProps {
  encryptedBlob: string;
  mode: AppMode | null;
  pathParams: Record<string, string>;
  onDecrypted: (data: CompressedData) => void;
}

export function DecryptionChallenge({
  encryptedBlob,
  onDecrypted,
}: DecryptionChallengeProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cryptoAvailable = isCryptoAvailable();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleDecrypt() {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) return;
    setIsDecrypting(true);
    setError(null);

    // 前檢查：blob 過短代表連結不完整（最小 = salt16 + iv12 + 1byte + tag16 ≈ 60 base64url chars）
    if (!encryptedBlob || encryptedBlob.length < 60) {
      console.error('[DecryptionChallenge] blob 過短，連結可能被截斷', { length: encryptedBlob?.length });
      setError('連結不完整，請確認網址未被截斷，或聯繫分享者重新取得連結');
      setIsDecrypting(false);
      return;
    }

    try {
      const compressed = await decrypt(trimmedPassword, encryptedBlob);
      const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
      if (!jsonString) {
        console.error('[DecryptionChallenge] 解密成功但解壓失敗', { compressedLength: compressed.length });
        throw new Error('DECOMPRESS_FAILED');
      }
      const data = JSON.parse(jsonString) as CompressedData;
      onDecrypted(data);
    } catch (e) {
      console.error('[DecryptionChallenge] 解鎖失敗:', e, { blobLength: encryptedBlob.length });
      if (!cryptoAvailable) {
        setError('您的瀏覽器不支援解密功能，請使用較新的瀏覽器');
      } else if (e instanceof Error && e.message === 'DECOMPRESS_FAILED') {
        setError('連結資料損毀，請聯繫分享者重新取得連結');
      } else {
        setError('密碼錯誤，請重新輸入');
      }
      setPassword('');
      inputRef.current?.focus();
    } finally {
      setIsDecrypting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleDecrypt();
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-panel rounded-3xl p-8 space-y-6">

        {/* Lock Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Lock className={`h-7 w-7 text-blue-400 ${isDecrypting ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-white tracking-tight">
            此收款連結受密碼保護
          </h2>
          <p className="text-sm text-white/50">
            請輸入分享者提供的密碼
          </p>
        </div>

        {/* Loading State */}
        {isDecrypting && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-white/60">解密中...</p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500/60 rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Password Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入密碼"
            disabled={isDecrypting}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`glass-input h-12 rounded-xl w-full pr-12 pl-4 outline-none ${
              isDecrypting ? 'opacity-50 pointer-events-none' : ''
            }`}
            aria-label="密碼"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Unlock Button */}
        <button
          onClick={handleDecrypt}
          disabled={isDecrypting || !password.trim()}
          className={`bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-lg w-full border border-blue-400/20 shadow-lg shadow-blue-900/20 transition-all duration-200 flex items-center justify-center gap-2 ${
            isDecrypting || !password.trim() ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isDecrypting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>解密中...</span>
            </>
          ) : (
            <><Unlock className="h-4 w-4" /><span>解鎖收款單</span></>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="border-t border-white/10 flex-1" />
          <span className="text-white/20 text-xs">或</span>
          <div className="border-t border-white/10 flex-1" />
        </div>

        {/* Secondary CTA */}
        <a
          href="/"
          className="glass-button rounded-lg h-10 w-full text-sm flex items-center justify-center"
        >
          建立我的收款碼
        </a>

        {/* Privacy Notice */}
        <div className="text-xs text-white/30 text-center space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            密碼僅用於本地解密
          </p>
          <p>絕不傳送至任何伺服器</p>
        </div>
      </div>
    </div>
  );
}
