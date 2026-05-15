# Barber Tashkent Telegram Mini App MVP

Bu loyiha Tashkentdagi barberlarni topish va booking request yuborish uchun Telegram Bot + Mini App + Backend starter-kit.

## Stack
- Backend: Node.js, Express, SQLite, Telegraf
- Frontend: React + Vite
- Database: SQLite MVP uchun
- Telegram: BotFather token, Mini App WebApp button

## MVP flow
1. User botga /start bosadi
2. Bot Mini App ochish tugmasini beradi
3. User Mini App ichida barberlarni ko'radi
4. Area/service bo'yicha filter qiladi
5. Barber profilini ochadi
6. Booking request yuboradi
7. Admin Telegram chatga notification boradi

## 1. Install
```bash
npm install
npm run install:all
```

## 2. Environment
Backend uchun `backend/.env` yarating:
```env
PORT=4000
DATABASE_FILE=./barber_mvp.db
BOT_TOKEN=123456789:YOUR_BOT_TOKEN
ADMIN_CHAT_ID=123456789
WEBAPP_URL=https://your-mini-app-domain.com
FRONTEND_DEV_URL=http://localhost:5173
```

Frontend uchun `frontend/.env` yarating:
```env
VITE_API_URL=http://localhost:4000
```

## 3. Seed sample data
```bash
npm run seed
```

## 4. Local run
```bash
npm run dev
```
Backend: http://localhost:4000
Frontend: http://localhost:5173

## 5. Telegram Mini App real ishlashi uchun
Telegram WebApp HTTPS talab qiladi. Local test uchun ngrok ishlating:
```bash
ngrok http 5173
```
Keyin `WEBAPP_URL` ni ngrok HTTPS URL bilan yangilang.

Backend ham public bo'lishi kerak:
```bash
ngrok http 4000
```
Frontend `.env` ichida `VITE_API_URL=https://backend-ngrok-url` yozing va frontendni qayta ishga tushiring.

## 6. BotFather sozlash
1. Telegramda @BotFather oching
2. `/newbot` orqali bot yarating
3. Tokenni `backend/.env` ga qo'ying
4. `/setmenubutton` orqali Web App URL qo'ying yoki botdagi `/start` tugmasidan foydalaning

## 7. Admin chat ID olish
1. O'zingizga yoki admin guruhga botni qo'shing
2. Botga `/adminid` deb yozing
3. Bot qaytargan chat ID ni `.env` dagi `ADMIN_CHAT_ID` ga qo'ying

## Deploy tavsiya
- Backend: Render, Railway, Fly.io, VPS
- Frontend: Vercel, Netlify
- Database MVP: SQLite; production o'sganda PostgreSQLga o'ting

## Muhim
MVPda booking `request` sifatida ishlaydi. Ya'ni vaqt avtomatik confirmed emas. Admin/barber qo'lda tasdiqlaydi. Bu double-booking riskini kamaytiradi.
