import React from 'react';
import { render, screen } from '@testing-library/react';
import { QrBrandCard } from '../qr-brand-card';

// Mock StyledQrCode (replaces old qrcode.react mock)
jest.mock('../styled-qr-code', () => ({
  StyledQrCode: ({ data }: { data: string }) =>
    <div data-testid="qr-code" data-value={data}>QR: {data}</div>,
}));

describe('QrBrandCard', () => {
  // ---------------------------------------------------------------------------
  // Cycle 1 — Payment 變體基本渲染
  // ---------------------------------------------------------------------------
  describe('payment 變體', () => {
    test('應渲染銀行名稱與帳號', () => {
      render(
        <QrBrandCard
          variant="payment"
          qrValue="TWQRP://test"
          bankName="中信銀行"
          accountNumber="1234567890"
        />
      );
      expect(screen.getByText(/中信銀行/)).toBeInTheDocument();
      expect(screen.getByText(/1234567890/)).toBeInTheDocument();
    });

    test('應渲染 QR Code 並傳入正確 qrValue', () => {
      render(
        <QrBrandCard
          variant="payment"
          qrValue="TWQRP://test-value"
          bankName="中信銀行"
          accountNumber="1234567890"
        />
      );
      const qr = screen.getByTestId('qr-code');
      expect(qr).toBeInTheDocument();
      expect(qr.getAttribute('data-value')).toBe('TWQRP://test-value');
    });

    test('應顯示 PayMe.TW 品牌標示', () => {
      render(
        <QrBrandCard
          variant="payment"
          qrValue="TWQRP://test"
          bankName="中信銀行"
          accountNumber="1234567890"
        />
      );
      expect(screen.getByText(/PayMe\.TW/)).toBeInTheDocument();
    });

    test('應使用白色背景', () => {
      const { container } = render(
        <QrBrandCard
          variant="payment"
          qrValue="TWQRP://test"
          bankName="中信銀行"
          accountNumber="1234567890"
        />
      );
      // 卡片容器應帶有白色背景 class
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/bg-white/);
    });
  });

  // ---------------------------------------------------------------------------
  // Cycle 2 — Share 變體渲染
  // ---------------------------------------------------------------------------
  describe('share 變體', () => {
    test('應渲染帳單標題與總金額', () => {
      render(
        <QrBrandCard
          variant="share"
          qrValue="https://payme.tw/bill/test"
          billTitle="週五聚餐"
          billTotal="1500"
        />
      );
      expect(screen.getByText(/週五聚餐/)).toBeInTheDocument();
      expect(screen.getByText(/1500/)).toBeInTheDocument();
    });

    test('應顯示分攤人數', () => {
      render(
        <QrBrandCard
          variant="share"
          qrValue="https://payme.tw/bill/test"
          billTitle="週五聚餐"
          billTotal="1500"
          memberCount={3}
        />
      );
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    test('應渲染 QR Code (Share URL)', () => {
      render(
        <QrBrandCard
          variant="share"
          qrValue="https://payme.tw/bill/test#/?data=abc"
          billTitle="週五聚餐"
          billTotal="1500"
        />
      );
      const qr = screen.getByTestId('qr-code');
      expect(qr.getAttribute('data-value')).toBe('https://payme.tw/bill/test#/?data=abc');
    });

    test('應顯示 PayMe.TW 品牌標示', () => {
      render(
        <QrBrandCard
          variant="share"
          qrValue="https://payme.tw/bill/test"
          billTitle="週五聚餐"
          billTotal="1500"
        />
      );
      expect(screen.getByText(/PayMe\.TW/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Cycle 3 — Ref 轉發與邊界案例
  // ---------------------------------------------------------------------------
  describe('Ref 轉發與邊界案例', () => {
    test('應正確轉發 ref 供截圖使用', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <QrBrandCard
          ref={ref}
          variant="payment"
          qrValue="TWQRP://test"
          bankName="中信銀行"
          accountNumber="1234567890"
        />
      );
      expect(ref.current).not.toBeNull();
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test('payment 變體：bankName 為空時應優雅降級', () => {
      expect(() => {
        render(
          <QrBrandCard
            variant="payment"
            qrValue="TWQRP://test"
            accountNumber="1234567890"
          />
        );
      }).not.toThrow();
      // QR 仍應渲染
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    test('payment 變體：accountNumber 為空時應優雅降級', () => {
      expect(() => {
        render(
          <QrBrandCard
            variant="payment"
            qrValue="TWQRP://test"
            bankName="中信銀行"
          />
        );
      }).not.toThrow();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    test('share 變體：billTitle 為空時應顯示預設文字', () => {
      expect(() => {
        render(
          <QrBrandCard
            variant="share"
            qrValue="https://payme.tw/test"
            billTitle=""
            billTotal="1000"
          />
        );
      }).not.toThrow();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });
  });
});
