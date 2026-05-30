import React, { useEffect, useState } from "react";
import {
  MapPin,
  Star,
  Search,
  Scissors,
  Calendar,
  ArrowLeft,
  Send,
  CheckCircle2,
} from "lucide-react";
import { API_URL, api, fetchBarbers, track } from "./api.js";

const AREAS = [
  "all",
  "Chilonzor",
  "Yunusobod",
  "Mirzo Ulugbek",
  "Shayxontohur",
  "Yakkasaroy",
  "Sergeli",
];

const SERVICES = ["all", "Haircut", "Beard trim", "Haircut + beard", "Styling"];

const TIMES = [
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

function formatPrice(value) {
  const number = Number(value || 0);
  if (!number) return "Narx to‘ldirilmagan";
  return new Intl.NumberFormat("uz-UZ").format(number) + " UZS";
}

function getTodayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getTgUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("cutuz_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;

  if (!value) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON, continue as comma-separated text
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeBarber(barber) {
  return {
    ...barber,
    services: toArray(barber.services),
    portfolio: toArray(barber.portfolio),
    reviews: toArray(barber.reviews),
    photo_url:
      barber.photo_url ||
      barber.image_url ||
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033",
  };
}

function getStatusText(status) {
  return {
    pending: "Profilingiz admin tasdig‘ini kutmoqda",
    approved: "Profilingiz tasdiqlangan va umumiy ro‘yxatda ko‘rinadi",
    rejected: "Profilingiz rad etilgan. Admin bilan bog‘laning",
  }[status] || `Profil statusi: ${status || "pending"}`;
}

function App() {
  const [user, setUser] = useState(getStoredUser);
  const [page, setPage] = useState(() =>
    getStoredUser()?.role === "barber" ? "barber-dashboard" : "home"
  );
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [area, setArea] = useState("all");
  const [service, setService] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
    track("mini_app_opened");
  }, []);

  useEffect(() => {
    loadBarbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, service]);

  async function loadBarbers() {
    setLoading(true);
    setNotice("");

    try {
      const data = await fetchBarbers({
        q: q.trim(),
        area: area === "all" ? "" : area,
        service: service === "all" ? "" : service,
      });

      const normalized = data.map(normalizeBarber);

      setBarbers(normalized);
    } catch (err) {
      setNotice(err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(barber) {
    setSelectedBarber(barber);
    setPage("profile");
    track("barber_profile_clicked", { barberId: barber.id });
  }

  function openBooking(barber) {
    setSelectedBarber(barber);
    setPage("booking");
  }

  function handleLogin(nextUser) {
    setUser(nextUser);
    setPage(nextUser.role === "barber" ? "barber-dashboard" : "home");
  }

  function logout() {
    localStorage.removeItem("cutuz_user");
    setUser(null);
    setPage("home");
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (page === "barber-dashboard") {
    return <BarberDashboard user={user} onHome={() => setPage("home")} onLogout={logout} />;
  }

  if (page === "profile" && selectedBarber) {
    return (
      <Profile
        barber={selectedBarber}
        onBack={() => setPage("home")}
        onBook={() => setPage("booking")}
      />
    );
  }

  if (page === "booking" && selectedBarber) {
    return (
      <Booking
        barber={selectedBarber}
        onBack={() => setPage("profile")}
        onSuccess={() => setPage("success")}
      />
    );
  }

  if (page === "success") {
    return <Success onHome={() => setPage("home")} />;
  }

  if (page === "barberApply") {
    return <BarberApply onBack={() => setPage("home")} />;
  }

  if (page === "myBooking") {
    return <MyBooking onBack={() => setPage("home")} />;
  }

  return (
    <main className="app">
      <section className="hero">
        <div className="pill">Tashkent barber booking MVP</div>
        <h1>Barber toping, narxni ko‘ring va booking qiling</h1>
        <p>
          18–35 yosh erkaklar uchun tez, sodda va ishonchli barber tanlash
          platformasi.
        </p>
        <div className="heroActions">
          <button
            className="primary"
            onClick={() =>
              document
                .getElementById("list")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Barber topish
          </button>
          {user.role === "barber" ? (
            <button className="secondary" onClick={() => setPage("barber-dashboard")}>
              Barber kabinet
            </button>
          ) : (
            <button className="secondary" onClick={() => setPage("barberApply")}>
              Barber bo‘lish
            </button>
          )}
        </div>
      </section>

      <section className="quickStats">
        <div>
          <b>{barbers.length}</b>
          <span>barber</span>
        </div>
        <div>
          <b>4.7+</b>
          <span>rating</span>
        </div>
        <div>
          <b>90k+</b>
          <span>UZS dan</span>
        </div>
      </section>

      <section className="tabs">
        <button onClick={() => setPage("myBooking")}>Mening bookingim</button>
        <button onClick={logout}>Chiqish</button>
      </section>

      <section id="list" className="panel">
        <div className="sectionTitle">
          <h2>Barberlar</h2>
          <span>Filter qilib tanlang</span>
        </div>

        <div className="searchBox">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadBarbers()}
            placeholder="Ism, area yoki xizmat..."
          />
          <button onClick={loadBarbers}>Qidirish</button>
        </div>

        <label className="label">Hudud</label>
        <div className="chips">
          {AREAS.map((item) => (
            <button
              key={item}
              className={area === item ? "chip active" : "chip"}
              onClick={() => setArea(item)}
            >
              {item === "all" ? "Hammasi" : item}
            </button>
          ))}
        </div>

        <label className="label">Xizmat</label>
        <div className="chips">
          {SERVICES.map((item) => (
            <button
              key={item}
              className={service === item ? "chip active" : "chip"}
              onClick={() => setService(item)}
            >
              {item === "all" ? "Hammasi" : item}
            </button>
          ))}
        </div>

        {notice && <div className="notice">{notice}</div>}

        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : (
          <div className="cards">
            {barbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                onOpen={() => openProfile(barber)}
                onBook={() => openBooking(barber)}
              />
            ))}
          </div>
        )}

        {!loading && !notice && barbers.length === 0 && (
          <p className="muted">Hozircha barber topilmadi.</p>
        )}
      </section>
    </main>
  );
}

function Login({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [loadingRole, setLoadingRole] = useState("");
  const isTelegram = Boolean(window.Telegram?.WebApp?.initData);

  async function login(role) {
    setAuthError("");

    if (!phone.trim()) {
      setAuthError("Telefon raqam majburiy");
      return;
    }

    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || "";

    if (!initData && import.meta.env.PROD) {
      setAuthError("Ilovani Telegram bot orqali oching");
      return;
    }

    setLoadingRole(role);

    try {
      const res = await fetch(`${API_URL}/api/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
          role,
          phone: phone.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAuthError(data.error || "Kirishda xatolik");
        return;
      }

      localStorage.setItem("cutuz_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setAuthError(err.message || "Kirishda xatolik");
    } finally {
      setLoadingRole("");
    }
  }

  return (
    <main className="app loginScreen">
      {!isTelegram && (
        <div className="notice">
          Test rejimi: ilova Telegram tashqarisida ochilgan
        </div>
      )}

      <section className="hero">
        <div className="pill">CUTUZ Mini App</div>
        <h1>Telefon raqam bilan kiring</h1>
        <p>Booking va barber kabineti Telegram account orqali ishlaydi.</p>
      </section>

      <section className="panel">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <label>Telefon raqam</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            required
          />

          {authError && <div className="notice error">{authError}</div>}

          <button
            className="primary full"
            type="button"
            disabled={Boolean(loadingRole)}
            onClick={() => login("user")}
          >
            {loadingRole === "user" ? "Kirilmoqda..." : "Foydalanuvchi sifatida kirish"}
          </button>

          <button
            className="secondary full"
            type="button"
            disabled={Boolean(loadingRole)}
            onClick={() => login("barber")}
          >
            {loadingRole === "barber" ? "Kirilmoqda..." : "Barber sifatida kirish"}
          </button>
        </form>
      </section>
    </main>
  );
}

function BarberDashboard({ user, onHome, onLogout }) {
  const telegramId =
    user?.telegram_id || user?.telegramId || getTgUser()?.id || "";
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    area: "",
    services: "",
    starting_price: 0,
    experience_years: 0,
    bio: "",
    instagram: "",
    location_url: "",
    photo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        if (!telegramId) {
          throw new Error("Telegram ID topilmadi. Qayta login qiling.");
        }

        const result = await api(`/api/barbers/me?telegram_id=${telegramId}`);
        const nextProfile = normalizeBarber(result?.data || result);

        if (!alive) return;

        setProfile(nextProfile);
        setForm({
          name: nextProfile.name || "",
          area: nextProfile.area || "",
          services: nextProfile.services.join(", "),
          starting_price: Number(nextProfile.starting_price || 0),
          experience_years: Number(nextProfile.experience_years || 0),
          bio: nextProfile.bio || "",
          instagram: nextProfile.instagram || "",
          location_url: nextProfile.location_url || "",
          photo_url: nextProfile.photo_url || "",
        });
      } catch (err) {
        if (alive) setError(err.message || "Profilni yuklab bo‘lmadi");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, [telegramId]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();

    if (profile?.status === "rejected") {
      setError("Rad etilgan profilni tahrirlash uchun admin bilan bog‘laning.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!telegramId) {
        throw new Error("Telegram ID topilmadi. Qayta login qiling.");
      }

      const result = await api("/api/barbers/me", {
        method: "PATCH",
        body: JSON.stringify({
          telegram_id: telegramId,
          name: form.name,
          area: form.area,
          services: form.services,
          starting_price: Number(form.starting_price || 0),
          experience_years: Number(form.experience_years || 0),
          bio: form.bio,
          instagram: form.instagram,
          location_url: form.location_url,
          photo_url: form.photo_url,
        }),
      });

      const nextProfile = normalizeBarber(result?.data || result);
      setProfile(nextProfile);
      setForm((prev) => ({
        ...prev,
        name: nextProfile.name || "",
        area: nextProfile.area || "",
        services: nextProfile.services.join(", "),
        starting_price: Number(nextProfile.starting_price || 0),
        experience_years: Number(nextProfile.experience_years || 0),
        bio: nextProfile.bio || "",
        instagram: nextProfile.instagram || "",
        location_url: nextProfile.location_url || "",
        photo_url: nextProfile.photo_url || "",
      }));
      setMessage("Profil saqlandi");
    } catch (err) {
      setError(err.message || "Profilni saqlab bo‘lmadi");
    } finally {
      setSaving(false);
    }
  }

  const status = profile?.status || "pending";
  const isRejected = status === "rejected";
  const statusText = getStatusText(status);

  return (
    <main className="app">
      <section className="hero">
        <div className="pill">Barber kabinet</div>
        <h1>{profile?.name || user?.first_name || user?.username || "Barber"} profili</h1>
        <p>{loading ? "Profil yuklanmoqda..." : statusText}</p>
      </section>

      <section className="panel">
        <h2>Account</h2>
        <p className="muted">Role: {user?.role || "barber"}</p>
        <p className="muted">Telegram ID: {telegramId || "-"}</p>
        <p className="muted">Telefon: {profile?.phone || user?.phone || "-"}</p>
        {profile && <p className="muted">Status: {profile.status} · Active: {String(profile.is_active)}</p>}
        {status === "pending" && (
          <p className="muted">Profilingizni hozirdan to‘ldirishingiz mumkin. Public ro‘yxatda admin tasdiqlagandan keyin ko‘rinadi.</p>
        )}
        {status === "approved" && (
          <p className="muted">Profilingiz mijozlar ro‘yxatida ko‘rinadi. Ma’lumotlarni yangilab boring.</p>
        )}
        {status === "rejected" && (
          <p className="muted">Profil ma’lumotlari read-only. Qayta ko‘rib chiqish uchun admin bilan bog‘laning.</p>
        )}
        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice">{message}</div>}
        <div className="cardActions">
          <button className="primary" onClick={onHome}>
            Barberlarni ko‘rish
          </button>
          <button className="secondary" onClick={onLogout}>
            Chiqish
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Profil ma’lumotlari</h2>
        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : (
          <form className="form" onSubmit={saveProfile}>
            <label>Ism yoki salon nomi</label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={isRejected}
              required
            />

            <label>Hudud</label>
            <input
              value={form.area}
              onChange={(e) => update("area", e.target.value)}
              placeholder="Chilonzor"
              disabled={isRejected}
              required
            />

            <label>Xizmatlar</label>
            <input
              value={form.services}
              onChange={(e) => update("services", e.target.value)}
              placeholder="Haircut, Beard trim"
              disabled={isRejected}
              required
            />

            <label>Boshlang‘ich narx</label>
            <input
              type="number"
              value={form.starting_price}
              onChange={(e) => update("starting_price", e.target.value)}
              disabled={isRejected}
              required
            />

            <label>Tajriba yili</label>
            <input
              type="number"
              value={form.experience_years}
              onChange={(e) => update("experience_years", e.target.value)}
              disabled={isRejected}
            />

            <label>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Qisqa ta’rif"
              disabled={isRejected}
            />

            <label>Instagram</label>
            <input
              value={form.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="@username"
              disabled={isRejected}
            />

            <label>Location URL</label>
            <input
              value={form.location_url}
              onChange={(e) => update("location_url", e.target.value)}
              placeholder="https://maps.google.com/..."
              disabled={isRejected}
            />

            <label>Photo URL</label>
            <input
              value={form.photo_url}
              onChange={(e) => update("photo_url", e.target.value)}
              placeholder="https://..."
              disabled={isRejected}
            />

            <button className="primary full" disabled={saving || isRejected}>
              {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
            </button>
          </form>
        )}
      </section>

      {status === "approved" && (
        <section className="panel">
          <h2>Bookinglar</h2>
          <p className="muted">Bookinglar hali ulanmagan.</p>
        </section>
      )}
    </main>
  );
}

function BarberCard({ barber, onOpen, onBook }) {
  return (
    <article className="card">
      <img src={barber.photo_url} alt={barber.name} />
      <div className="cardBody">
        <div className="row between">
          <h3>{barber.name}</h3>
          <span className="rating">
            <Star size={15} /> {barber.rating}
          </span>
        </div>
        <p className="muted">
          <MapPin size={15} /> {barber.area || "Hudud to‘ldirilmagan"}
        </p>
        <p className="muted">
          <Scissors size={15} />{" "}
          {barber.services.length
            ? barber.services.slice(0, 3).join(", ")
            : "Xizmatlar to‘ldirilmagan"}
        </p>
        <p className="price">{formatPrice(barber.starting_price)}</p>
        <div className="cardActions">
          <button className="secondary" onClick={onOpen}>
            Profil
          </button>
          <button className="primary" onClick={onBook}>
            Book
          </button>
        </div>
      </div>
    </article>
  );
}

function Profile({ barber, onBack, onBook }) {
  return (
    <main className="app">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Orqaga
      </button>

      <section className="profileHero">
        <img src={barber.photo_url} alt={barber.name} />
        <h1>{barber.name}</h1>
        <div className="row center">
          <span className="rating">
            <Star size={15} /> {barber.rating}
          </span>
          <span className="dot" />
          <span>{barber.experience_years || 0} yil tajriba</span>
        </div>
        <p>{barber.bio}</p>
        <button className="primary full" onClick={onBook}>
          Booking request yuborish
        </button>
      </section>

      <section className="panel">
        <h2>Xizmatlar va narx</h2>
        {barber.services.map((s) => (
          <div className="serviceRow" key={s}>
            <span>{s}</span>
            <b>{formatPrice(barber.starting_price)} dan</b>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Portfolio</h2>
        {barber.portfolio.length > 0 ? (
          <div className="gallery">
            {barber.portfolio.map((src, i) => (
              <img key={i} src={src} alt={`portfolio ${i + 1}`} />
            ))}
          </div>
        ) : (
          <p className="muted">Portfolio hali qo‘shilmagan.</p>
        )}
      </section>

      <section className="panel">
        <h2>Reviews</h2>
        {barber.reviews.length > 0 ? (
          barber.reviews.map((r, i) => (
            <p className="review" key={i}>
              “{r}”
            </p>
          ))
        ) : (
          <p className="muted">Review hali yo‘q.</p>
        )}
      </section>

      <section className="panel">
        <h2>Kontakt</h2>
        <p className="muted">
          <MapPin size={15} /> {barber.area}
        </p>
        {barber.instagram && <p>Instagram: {barber.instagram}</p>}
        {barber.location_url && (
          <a className="link" href={barber.location_url} target="_blank" rel="noreferrer">
            Google Maps ochish
          </a>
        )}
      </section>
    </main>
  );
}

function Booking({ barber, onBack, onSuccess }) {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  const [form, setForm] = useState({
    service: barber.services[0] || "Haircut",
    date: getTodayPlus(1),
    time: "15:00",
    customerName:
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "",
    phone: "",
    comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          initData: tg?.initData || "",
          telegram_user_id: user?.id?.toString(),
          telegram_username: user?.username,
          telegramUserId: user?.id?.toString(),
          telegramUsername: user?.username,
          barber_id: barber.id,
          barberId: barber.id,
          barber_name: barber.name,
          barberName: barber.name,
          service: form.service,
          date: form.date,
          booking_date: form.date,
          time: form.time,
          booking_time: form.time,
          customer_name: form.customerName,
          customerName: form.customerName,
          phone: form.phone,
          comment: form.comment,
        }),
      });

      tg?.HapticFeedback?.notificationOccurred?.("success");
      track("booking_request_submitted", {
        barberId: barber.id,
        service: form.service,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
      tg?.HapticFeedback?.notificationOccurred?.("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Orqaga
      </button>

      <section className="panel">
        <h1>Booking request</h1>
        <p className="muted">
          {barber.name} uchun vaqt so‘rovi yuboring. Admin yoki barber
          tasdiqlaydi.
        </p>

        <form className="form" onSubmit={submit}>
          <label>Xizmat</label>
          <select
            value={form.service}
            onChange={(e) => update("service", e.target.value)}
          >
            {barber.services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <label>Sana</label>
          <input
            type="date"
            value={form.date}
            min={getTodayPlus(0)}
            onChange={(e) => update("date", e.target.value)}
          />

          <label>Vaqt</label>
          <select
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
          >
            {TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <label>Ismingiz</label>
          <input
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
            placeholder="Masalan: Otabek"
            required
          />

          <label>Telefon</label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+998 90 123 45 67"
            required
          />

          <label>Izoh</label>
          <textarea
            value={form.comment}
            onChange={(e) => update("comment", e.target.value)}
            placeholder="Masalan: fade kerak"
          />

          {error && <div className="notice error">{error}</div>}

          <button className="primary full" disabled={loading}>
            <Send size={18} />{" "}
            {loading ? "Yuborilmoqda..." : "Request yuborish"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Success({ onHome }) {
  return (
    <main className="app success">
      <CheckCircle2 size={64} />
      <h1>Request yuborildi</h1>
      <p>Booking hali final confirmed emas. Admin yoki barber siz bilan bog‘lanadi.</p>
      <button className="primary full" onClick={onHome}>
        Bosh sahifa
      </button>
    </main>
  );
}

function BarberApply({ onBack }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    area: "Chilonzor",
    services: "",
    startingPrice: 100000,
    instagram: "",
    comment: "",
  });

  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();

    try {
      await api("/api/barber-applications", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          area: form.area,
          services: form.services,
          starting_price: form.startingPrice,
          startingPrice: form.startingPrice,
          instagram: form.instagram,
          comment: form.comment,
        }),
      });

      track("barber_application_submitted");
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (done) {
    return (
      <main className="app success">
        <CheckCircle2 size={64} />
        <h1>Ariza qabul qilindi</h1>
        <p>Tez orada siz bilan bog‘lanamiz.</p>
        <button className="primary full" onClick={onBack}>
          Bosh sahifa
        </button>
      </main>
    );
  }

  return (
    <main className="app">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Orqaga
      </button>

      <section className="panel">
        <h1>Barber sifatida qo‘shilish</h1>
        <p className="muted">MVP bosqichida arizalar qo‘lda tekshiriladi.</p>

        <form className="form" onSubmit={submit}>
          <label>Ism yoki barber shop nomi</label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />

          <label>Telefon</label>
          <input
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+998..."
          />

          <label>Hudud</label>
          <select value={form.area} onChange={(e) => update("area", e.target.value)}>
            {AREAS.filter((a) => a !== "all").map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>

          <label>Xizmatlar</label>
          <input
            required
            value={form.services}
            onChange={(e) => update("services", e.target.value)}
            placeholder="Haircut, beard, styling"
          />

          <label>Boshlang‘ich narx</label>
          <input
            type="number"
            value={form.startingPrice}
            onChange={(e) => update("startingPrice", Number(e.target.value))}
          />

          <label>Instagram</label>
          <input
            value={form.instagram}
            onChange={(e) => update("instagram", e.target.value)}
            placeholder="@username"
          />

          <label>Izoh</label>
          <textarea
            value={form.comment}
            onChange={(e) => update("comment", e.target.value)}
          />

          {error && <div className="notice error">{error}</div>}

          <button className="primary full">Ariza yuborish</button>
        </form>
      </section>
    </main>
  );
}

function MyBooking({ onBack }) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const user = getTgUser();

  useEffect(() => {
    if (!user?.id) {
      setError("Telegram ichida ochilganda booking ko‘rinadi.");
      return;
    }

    api(`/api/bookings/latest?telegramUserId=${user.id}`)
      .then(setBooking)
      .catch((err) => setError(err.message));
  }, [user?.id]);

  return (
    <main className="app">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Orqaga
      </button>

      <section className="panel">
        <h1>Mening bookingim</h1>

        {error && <div className="notice">{error}</div>}

        {!error && !booking && <p className="muted">Hozircha booking request yo‘q.</p>}

        {booking && (
          <div className="bookingBox">
            <b>{booking.barber_name}</b>
            <p>{booking.service}</p>
            <p>
              <Calendar size={15} /> {booking.date || booking.booking_date} ·{" "}
              {booking.time || booking.booking_time}
            </p>
            <p>
              Status: <b>{booking.status}</b>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
