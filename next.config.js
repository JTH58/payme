/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // 開發模式不設定 output: 'export'，讓 middleware 能攔截 /pay/*, /bill/* 路徑
  // 生產 build 維持靜態匯出
  ...(isDev ? {} : { output: 'export' }),
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_GITHUB_REPO: 'JTH58/payme',
  },
};

module.exports = withPWA(nextConfig);
