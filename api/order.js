// Server-side source of truth for the checkout. Keep this in sync with the product list in index.html.
const CATALOG = {
    1: { title: 'Монетка Шу Пуэра с зелёным мандарином', price: 30, unit: 'шт', stock: 15 },
    2: { title: 'Да Хун Пао', price: 520, unit: '50 г', stock: 5 },
    3: { title: 'Те Гуань Инь', price: 390, unit: '50 г', stock: 8 },
    4: { title: 'Синьян Маоцзянь', price: 480, unit: '50 г', stock: 4 },
    5: { title: 'Гайвань керамическая 120 мл', price: 890, unit: 'шт', stock: 2 },
    6: { title: 'Пиала глиняная', price: 350, unit: 'шт', stock: 6 }
};

function cleanText(value, maxLength) {
    return String(value || '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function createOrderItems(cart) {
    if (!Array.isArray(cart) || cart.length === 0 || cart.length > 25) return null;

    const usedIds = new Set();
    const orderItems = [];

    for (const requestedItem of cart) {
        const id = Number(requestedItem?.id);
        const quantity = Number(requestedItem?.quantity);
        const product = CATALOG[id];

        if (!product || usedIds.has(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
            return null;
        }

        usedIds.add(id);
        orderItems.push({ ...product, quantity });
    }

    return orderItems;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const name = cleanText(req.body?.name, 80);
    const phone = cleanText(req.body?.phone, 40);
    const address = cleanText(req.body?.address, 240);
    const orderItems = createOrderItems(req.body?.cart);

    if (!name || !phone || !address || !orderItems) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('BOT_TOKEN or CHAT_ID is not configured');
        return res.status(500).json({ error: 'Order service is not configured' });
    }

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let message = `🛒 Новый заказ (Svinki Tea):\n\n`;
    message += `👤 Имя: ${name}\n`;
    message += `📞 Телефон: ${phone}\n`;
    message += `📍 Адрес: ${address}\n\n`;
    message += '📦 Товары:\n';

    orderItems.forEach(item => {
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
