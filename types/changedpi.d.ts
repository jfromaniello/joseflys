declare module 'changedpi' {
  export function changeDpiDataUrl(dataUrl: string, dpi: number): string;
  export function changeDpiBlob(blob: Blob, dpi: number): Promise<Blob>;
}
