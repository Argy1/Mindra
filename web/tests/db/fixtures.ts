import type { PGlite } from '@electric-sql/pglite';

/** ID tetap supaya tes mudah dibaca. Semua berupa UUID v4 valid. */
export const ID = {
  alice: '00000000-0000-4000-8000-0000000000a1', // pengguna biasa, punya data
  bob: '00000000-0000-4000-8000-0000000000b2', // pengguna biasa, punya undangan pendamping pending
  mallory: '00000000-0000-4000-8000-0000000000c3', // penyerang: pengguna biasa tanpa izin apa pun
  rina: '00000000-0000-4000-8000-0000000000d4', // akun psikolog (profile_id)
  ibu: '00000000-0000-4000-8000-0000000000f6', // pendamping Alice
  fia: '00000000-0000-4000-8000-0000000000a7', // admin faskes A
  zed: '00000000-0000-4000-8000-0000000000a8', // admin faskes B
  admin: '00000000-0000-4000-8000-0000000000a9', // admin sistem
  psychologist: '00000000-0000-4000-8000-0000000000e5', // psychologists.id (BUKAN id akun)
  facilityA: '00000000-0000-4000-8000-0000000000f1',
  facilityB: '00000000-0000-4000-8000-0000000000f2',
  careLink: '00000000-0000-4000-8000-0000000000c1',
  aliceRelationship: '00000000-0000-4000-8000-0000000000d1',
  bobInvite: '00000000-0000-4000-8000-0000000000d2',
} as const;

/** Isi database dengan skenario tetap (dijalankan sebagai superuser, tanpa JWT). */
export async function seedFixtures(db: PGlite): Promise<void> {
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ID.alice}',   'alice@t.test',   '{"full_name":"Alice"}'),
      ('${ID.bob}',     'bob@t.test',     '{"full_name":"Bob"}'),
      ('${ID.mallory}', 'mallory@t.test', '{"full_name":"Mallory"}'),
      ('${ID.rina}',    'rina@t.test',    '{"full_name":"Rina Sari"}'),
      ('${ID.ibu}',     'ibu@t.test',     '{"full_name":"Ibu"}'),
      ('${ID.fia}',     'fia@t.test',     '{"full_name":"Admin Faskes A"}'),
      ('${ID.zed}',     'zed@t.test',     '{"full_name":"Admin Faskes B"}'),
      ('${ID.admin}',   'admin@t.test',   '{"full_name":"Admin"}');

    -- Peran diatur sistem (superuser tanpa JWT lolos trigger penjaga).
    update public.profiles set role = 'psychologist'   where id = '${ID.rina}';
    update public.profiles set role = 'caregiver'      where id = '${ID.ibu}';
    update public.profiles set role = 'facility_admin' where id in ('${ID.fia}', '${ID.zed}');
    update public.profiles set role = 'admin'          where id = '${ID.admin}';
    update public.profiles set city = 'Kota Bogor', domicile_province = 'Jawa Barat'
      where id in ('${ID.alice}', '${ID.bob}');

    insert into public.psychologists (id, full_name, profile_id, is_active)
      values ('${ID.psychologist}', 'Rina Sari, M.Psi.', '${ID.rina}', true);

    insert into public.facilities (id, name, type, city, province) values
      ('${ID.facilityA}', 'Puskesmas Bogor Tengah', 'puskesmas', 'Kota Bogor', 'Jawa Barat'),
      ('${ID.facilityB}', 'Puskesmas Lain',         'puskesmas', 'Kota Surabaya', 'Jawa Timur');
    insert into public.facility_admins (profile_id, facility_id) values
      ('${ID.fia}', '${ID.facilityA}'), ('${ID.zed}', '${ID.facilityB}');

    -- Alice memberi izin ke Rina (semua kecuali ringkasan AI).
    insert into public.care_links (id, patient_id, psychologist_id)
      values ('${ID.careLink}', '${ID.alice}', '${ID.psychologist}');

    -- Ibu = pendamping aktif Alice: hanya mood + peringatan darurat.
    insert into public.caregiver_relationships
      (id, patient_id, caregiver_id, invite_code, status, permissions) values
      ('${ID.aliceRelationship}', '${ID.alice}', '${ID.ibu}', 'IBU00001', 'active',
       '{"mood_daily":true,"assessment_results":false,"app_activity":false,"emergency_alerts":true}');

    -- Bob membuat undangan yang belum diterima siapa pun.
    insert into public.caregiver_relationships (id, patient_id, invite_code, status, permissions)
      values ('${ID.bobInvite}', '${ID.bob}', 'PENDING1', 'pending',
       '{"mood_daily":true,"assessment_results":false,"app_activity":false,"emergency_alerts":true}');

    insert into public.assessments (user_id, type, answers, total_score, category) values
      ('${ID.alice}', 'phq9', '[{"question_id":"phq9_1","score":2}]', 11,
        public.classify_assessment('phq9', 11));
    insert into public.mood_entries (user_id, mood_type) values ('${ID.alice}', 'lelah');
    insert into public.sleep_entries (user_id, bedtime, wake_time, quality)
      values ('${ID.alice}', now() - interval '9 hours', now() - interval '2 hours', 3);
  `);
}
