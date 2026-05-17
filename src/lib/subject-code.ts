export const SUBJECT_CODE_PAD_MIN = 1;
export const SUBJECT_CODE_PAD_MAX = 15;

export function clampSubjectCodePadLength(padLength: number): number {
  const n = Math.floor(padLength);
  if (!Number.isFinite(n)) return 3;
  return Math.min(SUBJECT_CODE_PAD_MAX, Math.max(SUBJECT_CODE_PAD_MIN, n));
}

/** Ex.: pad=3, seq=1 -> "001" */
export function formatSequenceDigits(sequence: number, padLength: number): string {
  const pad = clampSubjectCodePadLength(padLength);
  const n = Math.max(1, Math.floor(sequence));
  return String(n).padStart(pad, "0");
}

/** Monta o codigo de registro do participante: prefixo fixo do estudo + numero com zeros a esquerda. */
export function formatSubjectRegistrationCode(
  prefix: string,
  sequence: number,
  padLength: number
): string {
  return `${prefix}${formatSequenceDigits(sequence, padLength)}`;
}
