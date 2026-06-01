import QRCode from "qrcode";

/**
 * Server-side QR generation. Returns a base64 data URL that can be
 * dropped directly into an <img src={...} /> tag. Keeps the qrcode
 * dependency out of the client bundle (called only from Server
 * Components / Server Actions).
 */
export async function generateQrDataUrl(
  url: string,
  size: number = 300,
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/** Returns the absolute URL of the punch page for a given token. */
export function buildPunchUrl(token: string): string {
  const base = (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  return `${base}/punch/${token}`;
}
