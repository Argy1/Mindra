-- =============================================================================
-- Mindra — integritas hasil asesmen (menutup F6)
-- =============================================================================
-- Masalah (web/docs/TEMUAN-KEAMANAN.md F6): policy "Users manage own assessments" mengizinkan klien
-- menyisipkan `total_score` dan `category` apa saja. Hasil skoring jadi bergantung pada kejujuran
-- klien, dan trigger alert krisis ikut mempercayai `category` kiriman klien.
--
-- Perbaikan: trigger BEFORE INSERT/UPDATE menghitung ulang `total_score` dari `answers` dan
-- menurunkan `category` lewat `classify_assessment`, untuk SESI PENGGUNA saja (service_role, SQL
-- Editor, migrasi, dan seed tidak disentuh). Aturannya sama dengan aplikasi Flutter dan web:
--
--   * `answers` = larik {question_id, score} dengan `score` MENTAH (belum dibalik). Flutter
--     menyimpannya begitu, dan `total_score` adalah skor klinis yang sudah menyesuaikan item terbalik.
--   * PSS-10 item 4, 5, 7, 8 dibalik: skor = 4 − jawaban.
--   * Jawaban harus lengkap (9/7/10/20 butir), tiap butir sekali, bernilai bulat dalam rentang opsi
--     (0–3, 0–3, 0–4, 0–1). Selain itu ditolak dengan check_violation (23514).
--
-- Aplikasi Flutter selalu mengirim jawaban lengkap dan total yang konsisten (assessment_repository.dart,
-- demo_data_seeder.dart), jadi alurnya tidak berubah. Idempotent; tidak ada yang dihapus.
-- =============================================================================

create or replace function public.assessments_enforce_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  c_reverse constant text[] := array['pss10_4', 'pss10_5', 'pss10_7', 'pss10_8'];
  v_expected int;
  v_top      int;
  v_item     jsonb;
  v_id       text;
  v_number   int;
  v_score    numeric;
  v_seen     text[] := '{}';
  v_total    int := 0;
begin
  -- Hanya sesi pengguna. Bentuk `<> 'authenticated'` dengan coalesce: tanpa klaim JWT auth.role()
  -- bernilai NULL dan sesi itu (SQL Editor, migrasi) harus lolos.
  if coalesce((select auth.role()), '') <> 'authenticated' then
    return new;
  end if;

  -- Mengubah hanya penanda pengiriman (sent_to_satusehat) tidak memicu pemeriksaan ulang, sehingga
  -- baris lama yang dibuat sebelum trigger ini tetap bisa diperbarui.
  if tg_op = 'UPDATE'
     and new.type is not distinct from old.type
     and new.answers is not distinct from old.answers
     and new.total_score is not distinct from old.total_score
     and new.category is not distinct from old.category then
    return new;
  end if;

  v_expected := case new.type when 'phq9' then 9 when 'gad7' then 7 when 'pss10' then 10 when 'srq20' then 20 end;
  v_top      := case new.type when 'pss10' then 4 when 'srq20' then 1 else 3 end;

  if v_expected is null then
    raise exception 'Jenis asesmen tidak dikenal.' using errcode = '23514';
  end if;

  if jsonb_typeof(new.answers) is distinct from 'array'
     or jsonb_array_length(new.answers) <> v_expected then
    raise exception 'Jawaban asesmen harus lengkap (% butir).', v_expected using errcode = '23514';
  end if;

  for v_item in select value from jsonb_array_elements(new.answers) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item -> 'question_id') is distinct from 'string'
       or jsonb_typeof(v_item -> 'score') is distinct from 'number' then
      raise exception 'Bentuk jawaban asesmen tidak valid.' using errcode = '23514';
    end if;

    v_id := v_item ->> 'question_id';
    if v_id !~ ('^' || new.type || '_[1-9][0-9]?$') then
      raise exception 'Butir % bukan bagian dari instrumen %.', v_id, new.type using errcode = '23514';
    end if;
    v_number := substr(v_id, length(new.type) + 2)::int;
    if v_number > v_expected or v_id = any (v_seen) then
      raise exception 'Butir % tidak valid atau ganda.', v_id using errcode = '23514';
    end if;
    v_seen := array_append(v_seen, v_id);

    v_score := (v_item ->> 'score')::numeric;
    if v_score <> trunc(v_score) or v_score < 0 or v_score > v_top then
      raise exception 'Nilai jawaban % di luar rentang.', v_id using errcode = '23514';
    end if;

    v_total := v_total + case
      when new.type = 'pss10' and v_id = any (c_reverse) then v_top - v_score::int
      else v_score::int
    end;
  end loop;

  new.total_score := v_total;
  new.category    := public.classify_assessment(new.type, v_total);
  return new;
end;
$$;

drop trigger if exists trg_assessments_enforce_integrity on public.assessments;
create trigger trg_assessments_enforce_integrity
  before insert or update on public.assessments
  for each row execute function public.assessments_enforce_integrity();

revoke execute on function public.assessments_enforce_integrity() from public, anon, authenticated;
