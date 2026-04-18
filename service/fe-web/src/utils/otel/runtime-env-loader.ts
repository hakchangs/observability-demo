export function runtimeEnv(key: string, fallback: string): string {
    const val = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key];
    if (val && !val.startsWith('${')) return val;
    return (import.meta.env[key] as string | undefined) ?? fallback;
}