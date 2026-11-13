export const PRESETS = [
  { id: 'custom', name: 'Custom dimensions', width: null, height: null, unit: 'px', dpi: 72 },
  { id: 'signature', name: 'Signature (400 × 150 px)', width: 400, height: 150, unit: 'px', dpi: 200, desc: 'Digital portal signature' },
  { id: 'passport-us', name: 'Passport Photo US (2 × 2 in @ 300 DPI)', width: 2.0, height: 2.0, unit: 'in', dpi: 300, pixelWidth: 600, pixelHeight: 600, desc: 'US 2×2 in print standard' },
  { id: 'passport-uk', name: 'Passport Photo UK/EU (3.5 × 4.5 cm @ 300 DPI)', width: 3.5, height: 4.5, unit: 'cm', dpi: 300, pixelWidth: 413, pixelHeight: 531, desc: 'UK / EU 35×45 mm print' },
  { id: 'a4-doc', name: 'A4 Document (8.27 × 11.69 in @ 300 DPI)', width: 8.27, height: 11.69, unit: 'in', dpi: 300, pixelWidth: 2480, pixelHeight: 3508, desc: '210 × 297 mm print' },
  { id: '1200x630', name: 'Web / OpenGraph Banner (1200 × 630)', width: 1200, height: 630, unit: 'px', dpi: 72, desc: 'Social share banner' },
  { id: '1920x1080', name: 'Full HD Hero (1920 × 1080)', width: 1920, height: 1080, unit: 'px', dpi: 72, desc: '16:9 Full HD' },
  { id: '1080x1080', name: 'Square Post (1080 × 1080)', width: 1080, height: 1080, unit: 'px', dpi: 72, desc: '1:1 Square' },
  { id: '600x300', name: 'Email Header (600 × 300)', width: 600, height: 300, unit: 'px', dpi: 72, desc: '2:1 Email hero' },
];
