import type { OpenApiDocument, OpenApiOperation, OpenApiParameter } from '@/lib/api/openapi';

/**
 * Pembantu halaman /developers: mengubah dokumen OpenAPI menjadi tabel kolom dan contoh curl. Fungsi murni
 * (diuji), supaya dokumentasi yang tampil dihasilkan dari spesifikasi yang sama dengan yang divalidasi tes,
 * bukan ditulis tangan terpisah.
 */

type JsonSchema = Record<string, unknown>;

export interface FieldRow {
  /** Jalur kolom, mis. `answers.*` atau `triggers[]`. */
  path: string;
  type: string;
  required: boolean;
  description: string;
  /** Batasan yang berguna dibaca manusia: enum, min, max, panjang, format. */
  constraints: string;
}

const MAX_DEPTH = 3;

function typeOf(schema: JsonSchema): string {
  const type = schema.type;
  if (Array.isArray(type)) return type.join(' | ');
  if (typeof type === 'string') return type;
  if (schema.const !== undefined) return 'const';
  if (Array.isArray(schema.enum)) return 'enum';
  return 'object';
}

function constraintsOf(schema: JsonSchema): string {
  const parts: string[] = [];
  if (Array.isArray(schema.enum)) parts.push(`salah satu: ${schema.enum.map(String).join(', ')}`);
  if (schema.const !== undefined) parts.push(`harus ${JSON.stringify(schema.const)}`);
  if (typeof schema.format === 'string') parts.push(`format ${schema.format}`);
  if (typeof schema.minimum === 'number') parts.push(`min ${schema.minimum}`);
  if (typeof schema.maximum === 'number') parts.push(`maks ${schema.maximum}`);
  if (typeof schema.minLength === 'number') parts.push(`panjang min ${schema.minLength}`);
  if (typeof schema.maxLength === 'number') parts.push(`panjang maks ${schema.maxLength}`);
  if (typeof schema.maxItems === 'number') parts.push(`maks ${schema.maxItems} item`);
  if (typeof schema.minItems === 'number') parts.push(`min ${schema.minItems} item`);
  if (schema.default !== undefined) parts.push(`bawaan ${JSON.stringify(schema.default)}`);
  return parts.join('; ');
}

/** Meratakan JSON Schema objek menjadi baris tabel (kedalaman terbatas). */
export function flattenSchema(
  schema: JsonSchema,
  prefix = '',
  depth = 0,
  requiredHere: ReadonlySet<string> = new Set(),
  name = '',
): FieldRow[] {
  const rows: FieldRow[] = [];
  const isRoot = name === '' && prefix === '';

  if (!isRoot) {
    rows.push({
      path: prefix,
      type: typeOf(schema),
      required: requiredHere.has(name),
      description: typeof schema.description === 'string' ? schema.description : '',
      constraints: constraintsOf(schema),
    });
  }
  if (depth >= MAX_DEPTH) return rows;

  const properties = schema.properties as Record<string, JsonSchema> | undefined;
  if (properties) {
    const required = new Set((schema.required ?? []) as string[]);
    for (const [key, child] of Object.entries(properties)) {
      rows.push(
        ...flattenSchema(child, prefix ? `${prefix}.${key}` : key, depth + 1, required, key),
      );
    }
  }
  const items = schema.items as JsonSchema | undefined;
  if (items && typeof items === 'object') {
    const itemPath = `${prefix}[]`;
    const nested = flattenSchema(items, itemPath, depth + 1, new Set(), '');
    // Item sederhana (bukan objek) cukup dijelaskan di baris induknya lewat tipe.
    if (items.properties) rows.push(...nested.filter((row) => row.path !== itemPath));
  }
  const additional = schema.additionalProperties as JsonSchema | boolean | undefined;
  if (additional && typeof additional === 'object' && !properties) {
    rows.push(...flattenSchema(additional, `${prefix}.*`, depth + 1, new Set(), ''));
  }
  return rows;
}

export interface CurlOptions {
  baseUrl: string;
  path: string;
  method: string;
  auth: 'public' | 'bearer' | 'apiKey';
  body?: unknown;
  query?: Record<string, string>;
  pathParams?: Record<string, string>;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

/** Perintah curl siap salin. Kredensial memakai variabel lingkungan, tidak pernah nilai asli. */
export function buildCurl(options: CurlOptions): string {
  let path = options.path;
  for (const [name, value] of Object.entries(options.pathParams ?? {})) {
    path = path.replace(`{${name}}`, encodeURIComponent(value));
  }
  const url = new URL(`${options.baseUrl.replace(/\/+$/, '')}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);

  const lines = [
    `curl ${options.method === 'GET' ? '' : `-X ${options.method} `}${shellQuote(url.toString())}`.replace(
      'curl  ',
      'curl ',
    ),
  ];
  if (options.auth === 'bearer') lines.push(`-H "Authorization: Bearer $MINDRA_TOKEN"`);
  if (options.auth === 'apiKey') lines.push(`-H "X-API-Key: $MINDRA_API_KEY"`);
  if (options.body !== undefined) {
    lines.push(`-H 'Content-Type: application/json'`);
    lines.push(`-d ${shellQuote(JSON.stringify(options.body))}`);
  }
  return lines.join(' \\\n  ');
}

export interface DocOperation {
  method: string;
  path: string;
  operation: OpenApiOperation;
}

/** Operasi dikelompokkan per tag, mengikuti urutan tag di dokumen. */
export function groupOperations(
  doc: OpenApiDocument,
): Array<{ tag: string; description: string; operations: DocOperation[] }> {
  const all: DocOperation[] = Object.entries(doc.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      operation,
    })),
  );
  return doc.tags
    .map((tag) => ({
      tag: tag.name,
      description: tag.description,
      operations: all.filter((item) => item.operation.tags.includes(tag.name)),
    }))
    .filter((group) => group.operations.length > 0);
}

export const ANCHOR = (operationId: string) => `op-${operationId}`;

/** Parameter jalur/query sebagai baris tabel yang sama bentuknya dengan kolom badan permintaan. */
export function parameterRows(parameters: readonly OpenApiParameter[] | undefined): FieldRow[] {
  return (parameters ?? []).map((parameter) => ({
    path: parameter.name,
    type: typeOf(parameter.schema),
    required: parameter.required,
    description: parameter.description ?? '',
    constraints: constraintsOf(parameter.schema),
  }));
}
