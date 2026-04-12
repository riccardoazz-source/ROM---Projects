import { getAllFactures } from '@/lib/data';
import FacturesClient, { FactureResult } from './FacturesClient';

export const dynamic = 'force-dynamic';

export default async function FacturesPage() {
  const factures = await getAllFactures() as FactureResult[];
  return <FacturesClient factures={factures} />;
}
