const fs = require('fs');
const path = require('path');
const banks = require('../src/data/banks.json');

const BASE_URL = 'https://payme.tw';

function generateSitemapXml() {
  const urls = [
    { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${BASE_URL}/banks`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${BASE_URL}/twqr`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${BASE_URL}/features`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${BASE_URL}/safety`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${BASE_URL}/guide`, priority: '0.7', changefreq: 'monthly' },
    ...banks.map((bank) => ({
      loc: `${BASE_URL}/banks/${bank.code}`,
      priority: '0.6',
      changefreq: 'monthly',
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

// Export for testing
module.exports = { generateSitemapXml };

// CLI entry point
if (require.main === module) {
  const xml = generateSitemapXml();
  fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml, 'utf-8');
  console.log(`✅ Sitemap generated with ${banks.length + 6} URLs`);
}
