import LZString from 'lz-string';
import {
  base64urlEncode,
  base64urlDecode,
  encrypt,
  decrypt,
  isCryptoAvailable,
  SALT_LENGTH,
  IV_LENGTH,
} from './crypto';

// ─── Group 1: base64url helpers ──────────────────────────────────

describe('base64url helpers', () => {
  test('round-trip encode/decode binary data', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = base64urlEncode(original);
    const decoded = base64urlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  test('handle empty Uint8Array', () => {
    const original = new Uint8Array([]);
    const encoded = base64urlEncode(original);
    const decoded = base64urlDecode(encoded);
    expect(decoded.length).toBe(0);
    expect(decoded).toEqual(original);
  });

  test('produce URL-safe characters only', () => {
    // Fill with all byte values 0-255
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) allBytes[i] = i;

    const encoded = base64urlEncode(allBytes);

    // Must not contain standard base64 chars that are not URL-safe
    expect(encoded).not.toMatch(/[+/=]/);
    // Must only contain base64url chars
    expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  test('round-trip all byte values 0x00-0xFF', () => {
    const original = Uint8Array.from({ length: 256 }, (_, i) => i);
    const encoded = base64urlEncode(original);
    const decoded = base64urlDecode(encoded);
    expect(decoded).toEqual(original);
  });
});

// ─── Group 2: encrypt / decrypt round-trip ───────────────────────

describe('encrypt / decrypt round-trip', () => {
  test('simple JSON payload', async () => {
    const password = 'test123';
    const payload = { hello: 'world', count: 42 };
    const plaintext = JSON.stringify(payload);

    const blob = await encrypt(password, plaintext);
    const decrypted = await decrypt(password, blob);

    expect(JSON.parse(decrypted)).toEqual(payload);
  });

  test('CompressedData general mode', async () => {
    const password = 'mySecret';
    const payload = {
      b: '004',
      a: '12345678901234',
      m: '500',
      c: '午餐費',
      mo: 'pay',
    };
    const plaintext = JSON.stringify(payload);

    const blob = await encrypt(password, plaintext);
    const decrypted = await decrypt(password, blob);

    expect(JSON.parse(decrypted)).toEqual(payload);
  });

  test('CompressedData bill mode (nested)', async () => {
    const password = 'billPass!';
    const payload = {
      b: '812',
      a: '9876543210',
      m: '',
      c: '',
      mo: 'bill',
      bd: {
        t: '週五KTV',
        m: ['Alice', 'Bob', 'Charlie'],
        i: [
          { n: '包廂費', p: 3000, o: [0, 1, 2] },
          { n: '飲料', p: 500, o: [0, 2] },
        ],
        s: true,
      },
      ac: [
        { b: '812', a: '9876543210' },
        { b: '004', a: '1111222233' },
      ],
    };
    const plaintext = JSON.stringify(payload);

    const blob = await encrypt(password, plaintext);
    const decrypted = await decrypt(password, blob);

    expect(JSON.parse(decrypted)).toEqual(payload);
  });

  test('empty string password', async () => {
    const password = '';
    const payload = {
      b: '004',
      a: '1234567890',
      m: '100',
      c: '',
      mo: 'pay',
    };
    const plaintext = JSON.stringify(payload);

    const blob = await encrypt(password, plaintext);
    const decrypted = await decrypt(password, blob);

    expect(JSON.parse(decrypted)).toEqual(payload);
  });

  test('Chinese + Emoji payload', async () => {
    const password = '密碼🔑';
    const payload = {
      c: '晚餐🍜 & 飲料🍺',
      b: '822',
      a: '1234567890',
      m: '1000',
      mo: 'pay',
    };
    const plaintext = JSON.stringify(payload);

    const blob = await encrypt(password, plaintext);
    const decrypted = await decrypt(password, blob);

    expect(JSON.parse(decrypted)).toEqual(payload);
  });

  test('long password (1000 chars)', async () => {
    const password = 'a'.repeat(1000);
    const payload = {
      b: '004',
      a: '1234567890',
      m: '50',
      c: '',
      mo: 'pay',
    };
    const plaintext = JSON.stringify(payload);

    const blob = await encrypt(password, plaintext);
    const decrypted = await decrypt(password, blob);

    expect(JSON.parse(decrypted)).toEqual(payload);
  });
});

// ─── Group 3: encryption randomness ─────────────────────────────

describe('encryption randomness', () => {
  test('same input → different blobs', async () => {
    const password = 'samePass';
    const plaintext = JSON.stringify({ msg: 'identical' });

    const blob1 = await encrypt(password, plaintext);
    const blob2 = await encrypt(password, plaintext);

    // Random salt/iv should produce different blobs
    expect(blob1).not.toBe(blob2);

    // Both should decrypt correctly
    const decrypted1 = await decrypt(password, blob1);
    const decrypted2 = await decrypt(password, blob2);
    expect(JSON.parse(decrypted1)).toEqual({ msg: 'identical' });
    expect(JSON.parse(decrypted2)).toEqual({ msg: 'identical' });
  });
});

// ─── Group 4: decryption failure modes ──────────────────────────

describe('decryption failure modes', () => {
  test('wrong password throws', async () => {
    const blob = await encrypt('correct', 'secret data');
    await expect(decrypt('wrong', blob)).rejects.toThrow();
  });

  test('corrupted blob throws', async () => {
    const blob = await encrypt('pass', 'some data');

    // Flip a character in the middle of the blob
    const midIndex = Math.floor(blob.length / 2);
    const flippedChar = blob[midIndex] === 'A' ? 'B' : 'A';
    const corrupted =
      blob.substring(0, midIndex) + flippedChar + blob.substring(midIndex + 1);

    await expect(decrypt('pass', corrupted)).rejects.toThrow();
  });

  test('truncated blob throws (< 28 bytes)', async () => {
    // 20 bytes is less than SALT_LENGTH(16) + IV_LENGTH(12) = 28
    const shortBlob = base64urlEncode(new Uint8Array(20));
    await expect(decrypt('pass', shortBlob)).rejects.toThrow();
  });

  test('empty blob string throws', async () => {
    await expect(decrypt('pass', '')).rejects.toThrow();
  });
});

// ─── Group 5: blob structure validation ─────────────────────────

describe('blob structure validation', () => {
  test('blob decodes to ≥ 28 bytes', async () => {
    const blob = await encrypt('pass', 'hello');
    const decoded = base64urlDecode(blob);
    expect(decoded.byteLength).toBeGreaterThanOrEqual(
      SALT_LENGTH + IV_LENGTH
    );
  });

  test('blob only contains base64url chars', async () => {
    const blob = await encrypt('test', JSON.stringify({ data: '測試中文' }));
    expect(blob).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

// ─── Group 6: URL length estimation (ADR-024) ───────────────────

describe('URL length estimation — ADR-024', () => {
  /**
   * Helper: simulate a full encrypted URL
   * JSON.stringify → LZString.compress → encrypt → build URL
   */
  async function buildMockEncryptedUrl(
    payload: object,
    password: string,
    pathSegment: string
  ): Promise<string> {
    const json = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const blob = await encrypt(password, compressed);
    return `https://payme.tw${pathSegment}/#/?data=1${blob}`;
  }

  // Payload A — Simple mode (minimal)
  const payloadA = {
    b: '004',
    a: '1234567890',
    m: '500',
    c: '',
    mo: 'pay',
  };

  // Payload B — Bill mode (5 items, 4 members, 2 accounts)
  const payloadB = {
    b: '812',
    a: '9876543210',
    m: '',
    c: '聚餐分帳',
    mo: 'bill',
    bd: {
      t: '週五聚餐',
      m: ['王小明', '李大華', '張美玲', '陳志偉'],
      i: [
        { n: '主菜拼盤', p: 1200, o: [0, 1, 2, 3] },
        { n: '火鍋湯底', p: 600, o: [0, 1, 2, 3] },
        { n: '啤酒', p: 800, o: [0, 1] },
        { n: '甜點', p: 400, o: [2, 3] },
        { n: '服務費', p: 300, o: [0, 1, 2, 3] },
      ],
      s: true,
    },
    ac: [
      { b: '812', a: '9876543210' },
      { b: '004', a: '1111222233' },
    ],
  };

  // Payload C — Extreme Bill (10 items, 8 members, 3 accounts)
  const payloadC = {
    b: '822',
    a: '5566778899',
    m: '',
    c: '年終尾牙',
    mo: 'bill',
    bd: {
      t: '公司年終聚餐',
      m: [
        '王小明',
        '李大華',
        '張美玲',
        '陳志偉',
        '林淑芬',
        '黃建宏',
        '吳雅婷',
        '周文傑',
      ],
      i: [
        { n: '前菜沙拉', p: 480, o: [0, 1, 2, 3, 4, 5, 6, 7] },
        { n: '海鮮拼盤', p: 1800, o: [0, 1, 2, 3, 4, 5, 6, 7] },
        { n: '牛排套餐', p: 2400, o: [0, 1, 4, 5] },
        { n: '義大利麵', p: 1200, o: [2, 3, 6, 7] },
        { n: '紅酒', p: 1500, o: [0, 1, 2, 3] },
        { n: '啤酒', p: 800, o: [4, 5, 6, 7] },
        { n: '甜點拼盤', p: 600, o: [0, 1, 2, 3, 4, 5, 6, 7] },
        { n: '咖啡', p: 400, o: [0, 2, 4, 6] },
        { n: '果汁', p: 360, o: [1, 3, 5, 7] },
        { n: '包廂費', p: 2000, o: [0, 1, 2, 3, 4, 5, 6, 7] },
      ],
      s: true,
    },
    ac: [
      { b: '822', a: '5566778899' },
      { b: '812', a: '9876543210' },
      { b: '004', a: '1111222233' },
    ],
  };

  test('Simple mode encrypted URL well under limit', async () => {
    const url = await buildMockEncryptedUrl(
      payloadA,
      'simplePass',
      `/pay/${encodeURIComponent('收款')}`
    );
    expect(url.length).toBeLessThan(2000);
  });

  test('Bill mode encrypted URL under limit', async () => {
    const url = await buildMockEncryptedUrl(
      payloadB,
      'billPass',
      `/bill/${encodeURIComponent('週五聚餐')}`
    );
    expect(url.length).toBeLessThan(2000);
  });

  test('Extreme Bill mode encrypted URL under limit', async () => {
    const url = await buildMockEncryptedUrl(
      payloadC,
      'extremePass',
      `/bill/${encodeURIComponent('年終尾牙')}`
    );
    expect(url.length).toBeLessThan(2000);
  });
});

// ─── Group 7: isCryptoAvailable ─────────────────────────────────

describe('isCryptoAvailable', () => {
  test('returns true when Web Crypto API is available', () => {
    expect(isCryptoAvailable()).toBe(true);
  });
});
