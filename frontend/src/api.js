const API_URL = "https://cutuz.onrender.com";

export async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.details || "Request failed");
  }

  return res.json();
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
