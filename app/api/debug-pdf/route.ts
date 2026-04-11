import { NextRequest, NextResponse } from 'next/server';

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

    // Return full raw text + split into lines for easier reading
    const lines = text.split('\n').map((l, i) => `${i + 1}: ${l}`);

    return NextResponse.json({
      totalChars: text.length,
      totalLines: lines.length,
      rawText: text,
      lines: lines.slice(0, 300), // first 300 lines
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
