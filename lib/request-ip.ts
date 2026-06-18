import { isIP } from "node:net";

export function normalizeIp(value: string | null | undefined) {
  let ip = value?.trim();
  if (!ip) return null;

  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice("::ffff:".length);
  }

  if (ip === "::1") return "127.0.0.1";
  return isIP(ip) ? ip : null;
}

function getForwardedHeaderIp(value: string | null) {
  const firstForwarded = value?.split(",")[0];
  const forPart = firstForwarded
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("for="));

  return forPart?.slice(4).replace(/^"|"$/g, "");
}

export function getClientIpCandidates(headers: Headers) {
  const rawCandidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-client-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    getForwardedHeaderIp(headers.get("forwarded")),
  ];

  return Array.from(
    new Set(rawCandidates.map(normalizeIp).filter((ip): ip is string => !!ip)),
  );
}

export function getPrimaryClientIp(headers: Headers) {
  return getClientIpCandidates(headers)[0] || null;
}
