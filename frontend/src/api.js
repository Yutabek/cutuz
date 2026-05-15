const API_URL = "https://cutuz.onrender.com";

export async function api(path, options = {}) {
  const url = `${API_URL}${path}`;

  console.log("API REQUEST:", url);

  try {
    const res = await fetch(url, {
      ...options,
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await res.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      console.error("API ERROR RESPONSE:", res.status, data);
      throw new Error(
        typeof data === "object"
          ? data?.error || data?.details || `API error ${res.status}`
          : `API error ${res.status}: ${data}`
      );
    }

    return data;
  } catch (error) {
    console.error("API FETCH FAILED:", url, error);
    throw new Error(`Fetch failed: ${url}`);
  }
}

export function track(eventName, payload = {}) {
  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id?.toString();

  return api("/api/events", {
    method: "POST",
    body: JSON.stringify({
      telegram_user_id: userId,
      event_name: eventName,
      payload,
    }),
  }).catch(() => null);
}
