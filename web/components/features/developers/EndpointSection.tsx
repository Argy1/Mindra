import { CodeBlock } from '@/components/features/developers/CodeBlock';
import { FieldTable } from '@/components/features/developers/FieldTable';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ANCHOR, buildCurl, flattenSchema, parameterRows, type DocOperation } from '@/lib/api/docs';
import type { RouteDefinition } from '@/lib/api/handler';
import { cn } from '@/lib/utils/cn';

const METHOD_CLASS: Readonly<Record<string, string>> = {
  GET: 'bg-sage-50 text-sage-800',
  POST: 'bg-biru-50 text-biru-800',
  DELETE: 'bg-danger-50 text-danger-800',
};

const AUTH_LABEL = {
  public: 'Publik, tanpa kredensial',
  bearer: 'Bearer: token pengguna',
  apiKey: 'Kunci API: header X-API-Key',
} as const;

interface EndpointSectionProps {
  item: DocOperation;
  config: RouteDefinition['config'];
  baseUrl: string;
}

/** Satu operasi: ringkasan, autentikasi, parameter, badan permintaan, contoh curl, dan kemungkinan respons. */
export function EndpointSection({ item, config, baseUrl }: EndpointSectionProps) {
  const { operation } = item;
  const id = ANCHOR(operation.operationId);

  const pathParams = parameterRows(operation.parameters?.filter((p) => p.in === 'path'));
  const queryParams = parameterRows(operation.parameters?.filter((p) => p.in === 'query'));
  const requestContent = (
    operation.requestBody as
      | { content: { 'application/json': { schema: Record<string, unknown>; example?: unknown } } }
      | undefined
  )?.content['application/json'];
  const bodyRows = requestContent ? flattenSchema(requestContent.schema) : [];

  const curl = buildCurl({
    baseUrl,
    path: item.path,
    method: item.method,
    auth: config.auth,
    ...(config.example?.body !== undefined ? { body: config.example.body } : {}),
    ...(config.example?.query ? { query: config.example.query } : {}),
    ...(config.example?.path ? { pathParams: config.example.path } : {}),
  });

  const statuses = Object.entries(operation.responses).map(([status, response]) => ({
    status,
    description: (response as { description: string }).description,
  }));

  return (
    <Card as="article" aria-labelledby={`${id}-judul`} id={id} className="scroll-mt-6">
      <h3 id={`${id}-judul`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 h3">
        <span
          className={cn(
            'rounded-sm px-2 py-0.5 font-mono text-[0.8125rem] font-bold',
            METHOD_CLASS[item.method] ?? 'bg-neutral-100 text-fg-2',
          )}
        >
          {item.method}
        </span>
        <code className="font-mono text-base break-all">{item.path}</code>
      </h3>
      <p className="mt-2 font-semibold text-fg-1">{operation.summary}</p>
      <p className="mt-2">
        <Badge tone={config.auth === 'public' ? 'neutral' : 'sage'}>
          {AUTH_LABEL[config.auth]}
        </Badge>
        {config.scope ? (
          <span className="ml-2 font-mono text-sm text-fg-3">cakupan {config.scope}</span>
        ) : null}
      </p>
      {operation.description ? <p className="mt-3 body-m">{operation.description}</p> : null}

      <div className="mt-5 grid grid-cols-1 gap-5">
        {pathParams.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-fg-1">Parameter jalur</h4>
            <FieldTable caption={`Parameter jalur ${item.method} ${item.path}`} rows={pathParams} />
          </div>
        ) : null}
        {queryParams.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-fg-1">Parameter query</h4>
            <FieldTable
              caption={`Parameter query ${item.method} ${item.path}`}
              rows={queryParams}
            />
          </div>
        ) : null}
        {bodyRows.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-fg-1">Badan permintaan (JSON)</h4>
            <FieldTable caption={`Badan permintaan ${item.method} ${item.path}`} rows={bodyRows} />
            {requestContent?.example !== undefined ? (
              <div className="mt-3">
                <CodeBlock
                  label={`Contoh badan ${item.method} ${item.path}`}
                  code={JSON.stringify(requestContent.example, null, 2)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <h4 className="mb-2 text-sm font-semibold text-fg-1">Contoh</h4>
          <CodeBlock label={`Contoh curl ${item.method} ${item.path}`} code={curl} />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-fg-1">Respons</h4>
          <dl className="grid gap-1.5 text-sm">
            {statuses.map(({ status, description }) => (
              <div key={status} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
                <dt className="font-mono font-semibold text-fg-1">{status}</dt>
                <dd className="text-fg-2">{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}
