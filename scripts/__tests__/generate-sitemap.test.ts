const { generateSitemapXml } = require('../generate-sitemap');

describe('Sitemap Generator', () => {
  const xml = generateSitemapXml();

  it('should generate valid XML with urlset root', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
  });

  it('should include homepage /', () => {
    expect(xml).toContain('<loc>https://payme.tw/</loc>');
  });

  it('should include /banks listing page', () => {
    expect(xml).toContain('<loc>https://payme.tw/banks</loc>');
  });

  it('should include /safety page', () => {
    expect(xml).toContain('<loc>https://payme.tw/safety</loc>');
  });

  it('should include 266 bank detail pages', () => {
    const bankUrlCount = (xml.match(/<loc>https:\/\/payme\.tw\/banks\/\d{3}<\/loc>/g) || []).length;
    expect(bankUrlCount).toBe(266);
  });

  it('should include specific bank pages', () => {
    expect(xml).toContain('<loc>https://payme.tw/banks/004</loc>');
    expect(xml).toContain('<loc>https://payme.tw/banks/812</loc>');
  });

  it('should have total of 269 URLs (home + banks listing + safety + 266 banks)', () => {
    const totalUrls = (xml.match(/<url>/g) || []).length;
    expect(totalUrls).toBe(269);
  });
});
