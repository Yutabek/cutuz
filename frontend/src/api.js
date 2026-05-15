const API_URL = "https://cutuz.onrender.com";

export async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.details || "Request failed");
  }

  return data;
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
