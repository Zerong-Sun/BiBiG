type TestResult = { ok: boolean; message: string } | null;

export function TestResultBanner({ result }: { result: TestResult }) {
  if (!result) return null;
  return (
    <div className={result.ok ? 'alert-success' : 'alert-error'} role="status">
      <p className="font-medium">{result.ok ? '✓ 连接成功' : '✗ 连接失败'}</p>
      <p className="text-sm mt-1 opacity-90">{result.message}</p>
    </div>
  );
}

export type { TestResult };
