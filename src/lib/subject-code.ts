/** Monta o codigo de registro do participante: prefixo fixo do estudo + numero com zeros a esquerda. */
export function formatSubjectRegistrationCode(
  prefix: string,
  sequence: number,
  padLength: number
): string {
  const pad = Math.min(10, Math.max(1, Math.floor(padLength)));
  const n = Math.max(1, Math.floor(sequence));
  return `${prefix}${String(n).padStart(pad, "0")}`;
}
