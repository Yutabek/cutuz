import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapPin, Star, Search, Scissors, Calendar, UserRound, Phone, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { api, track } from './api.js';
import './styles.css';

const AREAS = ['all', 'Chilonzor', 'Yunusobod', 'Mirzo Ulugbek', 'Shayxontohur', 'Yakkasaroy', 'Sergeli'];
const SERVICES = ['all', 'Haircut', 'Beard trim', 'Haircut + beard', 'Styling'];
const TIMES = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

function formatPrice(value) {
  return new Intl.NumberFormat('uz-UZ').format(value) + ' UZS';
}

function getTodayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getTgUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

function App() {
  const [page, setPage] = useState('home');
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [area, setArea] = useState('all');
  const [service, setService] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const tgUser = getTgUser();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    track('mini_app_opened');
  }, []);

  useEffect(() => {
    loadBarbers();
  }, [area, service]);

  async function loadBarbers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (area) params.set('area', area);
      if (service) params.set('service', service);
      if (q) params.set('q', q);
      const data = await api(`/api/barbers?${params.toString()}`);
      setBarbers(data);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(barber) {
    setSelectedBarber(barber);
    setPage('profile');
    track('barber_profile_clicked', { barberId: barber.id });
  }

  if (page === 'profile' && selectedBarber) {
    return <Profile barber={selectedBarber} onBack={() => setPage('home')} onBook={() => setPage('booking')} />;
  }

  if (page === 'booking' && selectedBarber) {
    return <Booking barber={selectedBarber} onBack={() => setPage('profile')} onSuccess={() => setPage('success')} />;
  }

  if (page === 'success') {
    return <Success onHome={() => setPage('home')} />;
  }

  if (page === 'barberApply') {
    return <BarberApply onBack={() => setPage('home')} />;
  }

  if (page === 'myBooking') {
    return <MyBooking onBack={() => setPage('home')} />;
  }

  return (
    <main className="app">
      <section className="hero">
        <div className="pill">Tashkent barber booking MVP</div>
        <h1>Barber toping, narxni ko‘ring va booking qiling</h1>
        <p>18–35 yosh erkaklar uchun tez, sodda va ishonchli barber tanlash platformasi.</p>
        <div className="heroActions">
          <button className="primary" onClick={() => document.getElementById('list')?.scrollIntoView({ behavior: 'smooth' })}>Barber topish</button>
          <button className="secondary" onClick={() => setPage('barberApply')}>Barberman</button>
        </div>
      </section>

      <section className="quickStats">
        <div><b>{barbers.length}</b><span>barber</span></div>
        <div><b>4.7+</b><span>rating</span></div>
        <div><b>90k+</b><span>UZS dan</span></div>
      </section>

      <section className="tabs">
        <button onClick={() => setPage('myBooking')}>Mening bookingim</button>
        <button onClick={() => setPage('barberApply')}>Barber qo‘shish</button>
      </section>

      <section id="list" className="panel">
        <div className="sectionTitle">
          <h2>Barberlar</h2>
          <span>Filter qilib tanlang</span>
        </div>

        <div className="searchBox">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadBarbers()} placeholder="Ism, area yoki xizmat..." />
          <button onClick={loadBarbers}>Qidirish</button>
        </div>

        <label className="label">Hudud</label>
        <div className="chips">
          {AREAS.map(item => <button key={item} className={area === item ? 'chip active' : 'chip'} onClick={() => setArea(item)}>{item === 'all' ? 'Hammasi' : item}</button>)}
        </div>

        <label className="label">Xizmat</label>
        <div className="chips">
          {SERVICES.map(item => <button key={item} className={service === item ? 'chip active' : 'chip'} onClick={() => setService(item)}>{item === 'all' ? 'Hammasi' : item}</button>)}
        </div>

        {notice && <div className="notice">{notice}</div>}
        {loading ? <div className="loading">Yuklanmoqda...</div> : (
          <div className="cards">
            {barbers.map(barber => <BarberCard key={barber.id} barber={barber} onOpen={() => openProfile(barber)} onBook={() => { setSelectedBarber(barber); setPage('booking'); }} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function BarberCard({ barber, onOpen, onBook }) {
  return (
    <article className="card">
      <img src={barber.photo_url} alt={barber.name} />
      <div className="cardBody">
        <div className="row between"><h3>{barber.name}</h3><span className="rating"><Star size={15} /> {barber.rating}</span></div>
        <p className="muted"><MapPin size={15} /> {barber.area}</p>
        <p className="muted"><Scissors size={15} /> {barber.services.slice(0, 3).join(', ')}</p>
        <p className="price">{formatPrice(barber.starting_price)} dan</p>
        <div className="cardActions">
          <button className="secondary" onClick={onOpen}>Profil</button>
          <button className="primary" onClick={onBook}>Book</button>
        </div>
      </div>
    </article>
  );
}

function Profile({ barber, onBack, onBook }) {
  return (
    <main className="app">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Orqaga</button>
      <section className="profileHero">
        <img src={barber.photo_url} alt={barber.name} />
        <h1>{barber.name}</h1>
        <div className="row center"><span className="rating"><Star size={15} /> {barber.rating}</span><span className="dot" /><span>{barber.experience_years} yil tajriba</span></div>
        <p>{barber.bio}</p>
        <button className="primary full" onClick={onBook}>Booking request yuborish</button>
      </section>

      <section className="panel">
        <h2>Xizmatlar va narx</h2>
        {barber.services.map(s => <div className="serviceRow" key={s}><span>{s}</span><b>{formatPrice(barber.starting_price)} dan</b></div>)}
      </section>

      <section className="panel">
        <h2>Portfolio</h2>
        <div className="gallery">{barber.portfolio.map((src, i) => <img key={i} src={src} alt={`portfolio ${i + 1}`} />)}</div>
      </section>

      <section className="panel">
        <h2>Reviews</h2>
        {barber.reviews.map((r, i) => <p className="review" key={i}>“{r}”</p>)}
      </section>

      <section className="panel">
        <h2>Kontakt</h2>
        <p className="muted"><MapPin size={15} /> {barber.area}</p>
        {barber.instagram && <p>Instagram: {barber.instagram}</p>}
        {barber.location_url && <a className="link" href={barber.location_url} target="_blank">Google Maps ochish</a>}
      </section>
    </main>
  );
}

function Booking({ barber, onBack, onSuccess }) {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const [form, setForm] = useState({
    service: barber.services[0] || 'Haircut',
    date: getTodayPlus(1),
    time: '15:00',
    customerName: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '',
    phone: '',
    comment: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          initData: tg?.initData || '',
          telegramUserId: user?.id?.toString(),
          telegramUsername: user?.username,
          barberId: barber.id,
          ...form
        })
      });
      tg?.HapticFeedback?.notificationOccurred?.('success');
      track('booking_request_submitted', { barberId: barber.id, service: form.service });
      onSuccess();
    } catch (err) {
      setError(err.message);
      tg?.HapticFeedback?.notificationOccurred?.('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Orqaga</button>
      <section className="panel">
        <h1>Booking request</h1>
        <p className="muted">{barber.name} uchun vaqt so‘rovi yuboring. Admin yoki barber tasdiqlaydi.</p>
        <form className="form" onSubmit={submit}>
          <label>Xizmat</label>
          <select value={form.service} onChange={(e) => update('service', e.target.value)}>{barber.services.map(s => <option key={s}>{s}</option>)}</select>
          <label>Sana</label>
          <input type="date" value={form.date} min={getTodayPlus(0)} onChange={(e) => update('date', e.target.value)} />
          <label>Vaqt</label>
          <select value={form.time} onChange={(e) => update('time', e.target.value)}>{TIMES.map(t => <option key={t}>{t}</option>)}</select>
          <label>Ismingiz</label>
          <input value={form.customerName} onChange={(e) => update('customerName', e.target.value)} placeholder="Masalan: Otabek" required />
          <label>Telefon</label>
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+998 90 123 45 67" required />
          <label>Izoh</label>
          <textarea value={form.comment} onChange={(e) => update('comment', e.target.value)} placeholder="Masalan: fade kerak" />
          {error && <div className="notice error">{error}</div>}
          <button className="primary full" disabled={loading}><Send size={18} /> {loading ? 'Yuborilmoqda...' : 'Request yuborish'}</button>
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
      <button className="primary full" onClick={onHome}>Bosh sahifa</button>
    </main>
  );
}

function BarberApply({ onBack }) {
  const [form, setForm] = useState({ name: '', phone: '', area: 'Chilonzor', services: '', startingPrice: 100000, instagram: '', comment: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  async function submit(e) {
    e.preventDefault();
    try {
      await api('/api/barber-applications', { method: 'POST', body: JSON.stringify(form) });
      track('barber_application_submitted');
      setDone(true);
    } catch (err) { setError(err.message); }
  }

  if (done) return <main className="app success"><CheckCircle2 size={64} /><h1>Ariza qabul qilindi</h1><p>Tez orada siz bilan bog‘lanamiz.</p><button className="primary full" onClick={onBack}>Bosh sahifa</button></main>;

  return (
    <main className="app">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Orqaga</button>
      <section className="panel">
        <h1>Barber sifatida qo‘shilish</h1>
        <p className="muted">MVP bosqichida arizalar qo‘lda tekshiriladi.</p>
        <form className="form" onSubmit={submit}>
          <label>Ism yoki barber shop nomi</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} />
          <label>Telefon</label><input required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+998..." />
          <label>Hudud</label><select value={form.area} onChange={(e) => update('area', e.target.value)}>{AREAS.filter(a => a !== 'all').map(a => <option key={a}>{a}</option>)}</select>
          <label>Xizmatlar</label><input required value={form.services} onChange={(e) => update('services', e.target.value)} placeholder="Haircut, beard, styling" />
          <label>Boshlang‘ich narx</label><input type="number" value={form.startingPrice} onChange={(e) => update('startingPrice', Number(e.target.value))} />
          <label>Instagram</label><input value={form.instagram} onChange={(e) => update('instagram', e.target.value)} placeholder="@username" />
          <label>Izoh</label><textarea value={form.comment} onChange={(e) => update('comment', e.target.value)} />
          {error && <div className="notice error">{error}</div>}
          <button className="primary full">Ariza yuborish</button>
        </form>
      </section>
    </main>
  );
}

function MyBooking({ onBack }) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const user = getTgUser();

  useEffect(() => {
    if (!user?.id) { setError('Telegram ichida ochilganda booking ko‘rinadi.'); return; }
    api(`/api/bookings/latest?telegramUserId=${user.id}`).then(setBooking).catch(err => setError(err.message));
  }, []);

  return (
    <main className="app">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Orqaga</button>
      <section className="panel">
        <h1>Mening bookingim</h1>
        {error && <div className="notice">{error}</div>}
        {!error && !booking && <p className="muted">Hozircha booking request yo‘q.</p>}
        {booking && <div className="bookingBox">
          <b>{booking.barber_name}</b>
          <p>{booking.service}</p>
          <p><Calendar size={15} /> {booking.date} · {booking.time}</p>
          <p>Status: <b>{booking.status}</b></p>
        </div>}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
