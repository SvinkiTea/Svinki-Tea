export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, phone, address, cart, total } = req.body;

    if (!name || !phone || !address || !cart) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    let message = `🛒 Новый заказ (Svinki Tea):\n\n`;
    message += `👤 Имя: ${name}\n`;
    message += `📞 Телефон: ${phone}\n`;
    message += `📍 Адрес: ${address}\n\n`;
    message += `📦 Товары:\n`;

    cart.forEach(item => {
        message += `- ${item.title} (${item.quantity} ${item.unit}) — ${item.price * item.quantity} ₽\n`;
    });

    message += `\n💰 Итого: ${total} ₽`;

    try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message
            })
        });

        if (!telegramResponse.ok) {
            throw new Error('Failed to send message to Telegram');
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
