import type { ScrapedItemWithCodes, QualitativeCode } from '@/types';

function sanitizeCell(value: string): string {
  const dangerousChars = ['=', '+', '-', '@'];
  const cleaned = value.replace(/[\r\n]+/g, ' ');
  if (dangerousChars.some(c => cleaned.startsWith(c))) {
    return `'${cleaned}`;
  }
  return cleaned;
}

function escapeCSV(value: string): string {
  const sanitized = sanitizeCell(value);
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function exportCSV(items: ScrapedItemWithCodes[], codes: QualitativeCode[]) {
  const header = ['タイトル', 'ソース種別', '投稿者', '本文', 'URL', '公開日', '付与タグ', 'メモ', '収集日'];
  const rows = items.map(item => {
    const tagNames = item.codings.map(c => c.code.name).join('; ');
    const memos = item.codings.filter(c => c.memo).map(c => `[${c.code.name}] ${c.memo}`).join('; ');
    return [
      item.title,
      item.source_type,
      item.author_name,
      item.content,
      item.url,
      item.published_at || '',
      tagNames,
      memos,
      item.created_at,
    ].map(escapeCSV).join(',');
  });

  const bom = '\uFEFF';
  const csv = bom + [header.join(','), ...rows].join('\r\n');
  downloadFile(csv, 'research-data.csv', 'text/csv;charset=utf-8');
}

export function exportJSON(items: ScrapedItemWithCodes[], codes: QualitativeCode[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    codes,
    items: items.map(item => ({
      ...item,
      tags: item.codings.map(c => ({
        code: c.code.name,
        color: c.code.color_hex,
        memo: c.memo,
      })),
    })),
  };
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'research-data.json', 'application/json;charset=utf-8');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
