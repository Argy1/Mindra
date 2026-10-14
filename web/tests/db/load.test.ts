// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyHardeningMigration,
  applyWebMigration,
  createBaseDatabase,
  hasMigrations,
} from './harness';

describe.skipIf(!hasMigrations)('harness: migrasi dapat dimuat', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createBaseDatabase();
  }, 60_000);
  afterAll(async () => {
    await db.close();
  });

  it('migrasi Flutter termuat (tabel inti ada)', async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from pg_tables where schemaname = 'public'`,
    );
    expect(rows[0]?.n).toBeGreaterThanOrEqual(19);
  });

  it('migrasi web termuat di atasnya tanpa galat', async () => {
    await applyWebMigration(db);
    const { rows } = await db.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' and tablename in
        ('care_links','crisis_alerts','data_access_logs','facilities','facility_admins','api_clients')
        order by 1`,
    );
    expect(rows.map((r) => r.tablename)).toHaveLength(6);
  });

  it('migrasi pengerasan pendamping termuat di atasnya tanpa galat dan bisa diulang', async () => {
    await applyHardeningMigration(db);
    await applyHardeningMigration(db);
    const { rows } = await db.query<{ proname: string }>(
      `select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and proname in ('accept_caregiver_invite','decline_caregiver_invite','caregiver_patient_names')
        order by 1`,
    );
    expect(rows).toHaveLength(3);
  });
});
