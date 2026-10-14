/**
 * Klien Supabase palsu untuk menguji lapisan server (lib/server/*) dan Server Action. Tidak menyaring
 * baris seperti database sungguhan: tujuannya memeriksa APA yang diminta kode (tabel, operasi, kolom
 * penyaring, isi tulisan, urutan), bukan hasil kueri. Penyaringan sungguhan (RLS, `can_view`, trigger)
 * diuji di tests/db/* memakai Postgres.
 */

export type QueryOp = 'select' | 'insert' | 'update' | 'delete';

export interface RecordedQuery {
  table: string;
  op: QueryOp;
  /** Isi `insert(...)` atau `update(...)`. */
  payload?: unknown;
  filters: Array<{ op: string; column: string; value: unknown }>;
  orders: Array<{ column: string; ascending: boolean }>;
  limit?: number;
}

export interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
  /** Hasil `select(..., { count: 'exact' })`. Bawaan: jumlah baris tabel yang dikonfigurasi. */
  count?: number;
}

export interface FakeSupabaseOptions {
  /** Baris per tabel yang dikembalikan untuk kueri `select` ke tabel itu. */
  tables?: Record<string, unknown[]>;
  /** Hasil `rpc(nama)`. */
  rpcs?: Record<string, unknown>;
  /** Tabel yang kuerinya menghasilkan galat. */
  failTables?: readonly string[];
  /** Hasil khusus per "tabel:operasi", mis. `'care_links:update'`. Menimpa perilaku bawaan. */
  results?: Record<string, QueryResult>;
}

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const queries: RecordedQuery[] = [];
  /** Urutan kejadian (untuk memeriksa "catat dulu, baru baca"). Pemanggil boleh menambah entri sendiri. */
  const log: string[] = [];
  /** Panggilan RPC beserta argumennya. */
  const rpcCalls: Array<{ name: string; args: unknown }> = [];

  class Query implements PromiseLike<QueryResult> {
    private readonly record: RecordedQuery;
    constructor(private readonly table: string) {
      this.record = { table, op: 'select', filters: [], orders: [] };
      queries.push(this.record);
      log.push(`from:${table}`);
    }
    private result(): QueryResult {
      const custom = options.results?.[`${this.table}:${this.record.op}`];
      if (custom) return custom;
      if (options.failTables?.includes(this.table)) {
        return { data: null, error: { message: 'gagal' } };
      }
      if (this.record.op === 'select') {
        const rows = options.tables?.[this.table] ?? [];
        return { data: rows, error: null, count: rows.length };
      }
      return { data: [], error: null };
    }
    private filter(op: string, column: string, value: unknown) {
      this.record.filters.push({ op, column, value });
      return this;
    }
    private write(op: QueryOp, payload?: unknown) {
      this.record.op = op;
      this.record.payload = payload;
      return this;
    }
    select() {
      return this;
    }
    insert(payload: unknown) {
      return this.write('insert', payload);
    }
    update(payload: unknown) {
      return this.write('update', payload);
    }
    delete() {
      return this.write('delete');
    }
    eq(column: string, value: unknown) {
      return this.filter('eq', column, value);
    }
    in(column: string, value: unknown) {
      return this.filter('in', column, value);
    }
    is(column: string, value: unknown) {
      return this.filter('is', column, value);
    }
    gte(column: string, value: unknown) {
      return this.filter('gte', column, value);
    }
    or(expression: string) {
      return this.filter('or', 'or', expression);
    }
    order(column: string, options?: { ascending?: boolean }) {
      this.record.orders.push({ column, ascending: options?.ascending ?? true });
      return this;
    }
    limit(count: number) {
      this.record.limit = count;
      return this;
    }
    private first() {
      const { data, error } = this.result();
      return { data: Array.isArray(data) ? (data[0] ?? null) : (data ?? null), error };
    }
    async maybeSingle() {
      return this.first();
    }
    async single() {
      return this.first();
    }
    then<TResult1, TResult2>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(this.result()).then(onfulfilled, onrejected);
    }
  }

  const client = {
    from: (table: string) => new Query(table),
    rpc: async (name: string, args?: unknown) => {
      log.push(`rpc:${name}`);
      rpcCalls.push({ name, args });
      const custom = options.results?.[`rpc:${name}`];
      if (custom) return custom;
      return { data: options.rpcs?.[name] ?? null, error: null };
    },
  };

  return {
    client,
    queries,
    log,
    rpcCalls,
    /** Tabel yang diminta, berurutan. */
    tablesQueried: () => queries.map((query) => query.table),
    /** Kueri ke satu tabel (bisa lebih dari satu). */
    queriesTo: (table: string) => queries.filter((query) => query.table === table),
    /** Kueri tulis (insert/update/delete) saja. */
    writes: () => queries.filter((query) => query.op !== 'select'),
  };
}
