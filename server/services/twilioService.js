require('dotenv').config();

const ENABLED = process.env.TWILIO_ENABLED === 'true';
let client = null;
if (ENABLED) {
    const twilio = require('twilio');
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function makeConfirmationCall(toPhone, bookingId) {
    if (!ENABLED) {
        console.log(`[TWILIO MOCK] Дзвінок на ${toPhone}, бронювання #${bookingId}`);
        return `mock-${bookingId}`;
    }
    const webhookUrl = `${process.env.PUBLIC_URL}/api/bookings/twiml/${bookingId}`;
    const call = await client.calls.create({
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: webhookUrl,
    });
    return call.sid;
}

function buildConfirmationTwiML(bookingId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/bookings/confirm-call/${bookingId}" method="POST">
    <Say language="uk-UA" voice="alice">
      Вітаємо в DriveX. Натисніть один щоб підтвердити бронювання, або два щоб скасувати.
    </Say>
  </Gather>
  <Say language="uk-UA" voice="alice">Час очікування вичерпано.</Say>
</Response>`;
}

module.exports = { makeConfirmationCall, buildConfirmationTwiML };