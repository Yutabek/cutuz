import { Telegraf, Markup } from 'telegraf';

export function createBot({ token, webAppUrl }) {
  if (!token) return null;

  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply(
      '👋 Salom! Barbers Tashkent botiga xush kelibsiz.\n\nToshkentdagi barberlarni toping, narxlarni ko‘ring va booking request yuboring.',
      Markup.inlineKeyboard([
        [Markup.button.webApp('💈 Mini Appni ochish', webAppUrl)],
        [Markup.button.callback('📍 Barber topish', 'find_barber')],
        [Markup.button.callback('🧔 Barber sifatida qo‘shilish', 'join_barber')],
        [Markup.button.callback('☎️ Yordam', 'help')]
      ])
    );
  });

  bot.command('adminid', async (ctx) => {
    await ctx.reply(`Chat ID: ${ctx.chat.id}`);
  });

  bot.action('find_barber', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Barber topish va booking uchun Mini Appni oching:',
      Markup.inlineKeyboard([[Markup.button.webApp('💈 Mini Appni ochish', webAppUrl)]])
    );
  });

  bot.action('join_barber', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Barber sifatida qo‘shilish uchun Mini App ichidagi “Barberman” bo‘limini to‘ldiring.',
      Markup.inlineKeyboard([[Markup.button.webApp('🧔 Ariza yuborish', webAppUrl)]])
    );
  });

  bot.action('help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Savollar uchun admin bilan bog‘laning. MVP davrida booking request qo‘lda tasdiqlanadi.');
  });

  return bot;
}
