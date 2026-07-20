export function createId(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.randomUUID) throw new Error('当前环境不支持安全记录 ID');
  return cryptoApi.randomUUID();
}

