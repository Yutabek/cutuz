export const API_URL = (
  import.meta.env.VITE_API_URL || "https://cutuz.onrender.com"
).replace(/\/$/, "");

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function track(eventName, payload = {}) {
  try {
    await api("/api/events", {
      method: "POST",
      body: JSON.stringify({
        eventName,
        payload,
        createdAt: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn("Track failed:", err);
  }
}

export async function fetchBarbers({ q = "", area = "", service = "" } = {}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (area && area !== "Hammasi") params.set("area", area);
  if (service && service !== "Hammasi") params.set("service", service);

  const query = params.toString();
  const json = await api(`/api/barbers${query ? `?${query}` : ""}`);

  return Array.isArray(json) ? json : json.data || [];
}
