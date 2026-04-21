import { NextRequest, NextResponse } from 'next/server';
import { parseRapportFromPdf } from '@/lib/pdfParser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Find and return raw budget section text
    const lo = text.toLowerCase();
    const pos = lo.search(/(?:^|\n)budget(?:\s|$|\s*[-–]|\s*pr)/m);
    let budgetRaw = '';
    if (pos !== -1) {
      const lineStart = text[pos] === '\n' ? pos + 1 : pos;
      const rest = lo.slice(lineStart + 6);
      const endPatterns = [
        /\nliste des factures\b/,
        /\nbordereau de (paiement|transmission)\b/,
        /\ntableau récapitulatif\b/,
        /\ndate facture\b/,
      ];
      let endOffset = rest.length;
      for (const ep of endPatterns) {
        const m = rest.search(ep);
        if (m !== -1 && m < endOffset) endOffset = m;
      }
      budgetRaw = text.slice(lineStart, lineStart + 6 + endOffset);
    }

    const parsed = parseRapportFromPdf(text, file.name);

    return NextResponse.json({
      totalChars: text.length,
      totalLines: text.split('\n').length,
      budgetRawText: budgetRaw,
      budgetRawLines: budgetRaw.split('\n').map((l, i) => `${i + 1}: ${l}`),
      budget: parsed.budget ?? null,
      fullTextFirst200Lines: text.split('\n').slice(0, 200).map((l, i) => `${i + 1}: ${l}`),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
