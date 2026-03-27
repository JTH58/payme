import Link from 'next/link'
import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: '找不到頁面 | PayMe.tw',
  description: '您所尋找的頁面不存在，請回到首頁使用 PayMe.tw 台灣通用收款碼。',
}

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4 text-center">
        <h2 className="text-3xl font-bold text-slate-900">404 - Page Not Found</h2>
        <p className="text-slate-600">找不到您要的頁面</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-900 transition-colors shadow-sm shadow-sky-100/70"
          >
            建立收款碼
          </Link>
          <Link
            href="/banks"
            className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-900 transition-colors shadow-sm shadow-sky-100/70"
          >
            支援銀行
          </Link>
          <Link
            href="/safety"
            className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-900 transition-colors shadow-sm shadow-sky-100/70"
          >
            防詐資訊
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
