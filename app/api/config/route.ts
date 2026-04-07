import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig, AppConfig } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getConfig();
    // Don't expose API key fully
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Erreur lecture config' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AppConfig;
    saveConfig(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: 'Erreur sauvegarde config' }, { status: 500 });
  }
}
