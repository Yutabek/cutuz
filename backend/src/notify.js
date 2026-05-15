export async function notifyAdmin(bot, adminChatId, text) {
  if (!bot || !adminChatId) return;
  try {
    await bot.telegram.sendMessage(adminChatId, text, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (err) {
    console.error('Admin notification failed:', err.message);
  }
}
