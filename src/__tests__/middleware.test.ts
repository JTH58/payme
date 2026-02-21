/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('middleware', () => {
  it('/pay/xxx → rewrite to /', () => {
    const res = middleware(createRequest('/pay/聚餐費'));
    // rewrite 會回傳 response，headers 中包含 x-middleware-rewrite
    expect(res.headers.get('x-middleware-rewrite')).toContain('/');
  });

  it('/bill/friday → rewrite to /', () => {
    const res = middleware(createRequest('/bill/friday'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/');
  });

  it('/backup/abc → rewrite to /', () => {
    const res = middleware(createRequest('/backup/abc'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/');
  });

  it('/banks/004 → passthrough（不 rewrite）', () => {
    const res = middleware(createRequest('/banks/004'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('/safety → passthrough', () => {
    const res = middleware(createRequest('/safety'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('/ → passthrough', () => {
    const res = middleware(createRequest('/'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });
});
