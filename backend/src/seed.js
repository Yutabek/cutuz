import { initDb, run, get } from './db.js';

await initDb();

const count = await get('SELECT COUNT(*) as count FROM barbers');
if (count.count > 0) {
  console.log('Seed skipped: barbers already exist');
  process.exit(0);
}

const barbers = [
  {
    name: 'Aziz Barber', area: 'Chilonzor', rating: 4.8, experience_years: 4, starting_price: 100000,
    services: ['Haircut', 'Beard trim', 'Haircut + beard'],
    bio: 'Clean fade, classic haircut va beard style bo‘yicha tajribali master.',
    instagram: '@azizbarber', location_url: 'https://maps.google.com', photo_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600','https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600'],
    reviews: ['Juda toza fade qildi.', 'Vaqtida qabul qildi, tavsiya qilaman.']
  },
  {
    name: 'Bek Grooming', area: 'Yunusobod', rating: 4.7, experience_years: 6, starting_price: 120000,
    services: ['Haircut', 'Styling', 'Haircut + beard'],
    bio: 'Premium haircut va styling. Ish joyi qulay, atmosfera yaxshi.',
    instagram: '@bekgrooming', location_url: 'https://maps.google.com', photo_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=600',
    portfolio: ['https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=600'],
    reviews: ['Narxiga yarasha sifat.', 'Professional master.']
  },
  {
    name: 'Timur Cuts', area: 'Mirzo Ulugbek', rating: 4.6, experience_years: 3, starting_price: 90000,
    services: ['Haircut', 'Beard trim'],
    bio: 'Tez, sifatli va oddiy booking. Studentlar uchun qulay narx.',
    instagram: '@timurcuts', location_url: 'https://maps.google.com', photo_url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=600',
    portfolio: ['https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=600'],
    reviews: ['Tez va chiroyli.', 'Yaxshi xizmat.']
  }
];

for (const b of barbers) {
  await run(`INSERT INTO barbers
    (name, area, rating, experience_years, starting_price, services, bio, instagram, location_url, photo_url, portfolio, reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.name, b.area, b.rating, b.experience_years, b.starting_price, JSON.stringify(b.services), b.bio, b.instagram, b.location_url, b.photo_url, JSON.stringify(b.portfolio), JSON.stringify(b.reviews)]
  );
}

console.log('Seed completed');
process.exit(0);
