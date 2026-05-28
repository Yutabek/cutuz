const API_URL =
  import.meta.env.VITE_API_URL || "https://cutuz.onrender.com";

async function fetchBarbers({ q = "", area = "", service = "" } = {}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (area && area !== "Hammasi") params.set("area", area);
  if (service && service !== "Hammasi") params.set("service", service);

  const url = `${API_URL.replace(/\/$/, "")}/api/barbers${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Barber API error ${res.status}: ${text}`);
  }

  const json = await res.json();

  return Array.isArray(json) ? json : json.data || [];
}
