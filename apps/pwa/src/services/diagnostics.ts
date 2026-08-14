type DiagnosticLevel = 'info' | 'warn' | 'error';

type DiagnosticDetails = Record<string, boolean | number | string | null | undefined>;

const prefix = '[Mentor AI diagnostics]';

export function logDiagnostic(
  event: string,
  details: DiagnosticDetails = {},
  level: DiagnosticLevel = 'info',
): void {
  const entry = {
    event,
    at: new Date().toISOString(),
    ...details,
  };

  if (level === 'error') {
    console.error(prefix, entry);
    return;
  }

  if (level === 'warn') {
    console.warn(prefix, entry);
    return;
  }

  console.info(prefix, entry);
}
