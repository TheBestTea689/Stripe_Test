const express = require('express');
const cors = require('cors');
const app = express();

// Carica le variabili d'ambiente (per la chiave segreta di Stripe)
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.set('trust proxy', true); // Necessario se posizionato dietro Cloudflare o Render

// --- ROTTA KEEP-ALIVE ---
// Questa rotta risponde subito e serve a mantenere il server sveglio 
// se usi servizi gratuiti come UptimeRobot o Cron-Job.org
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server attivo.');
});

// --- ROTTA PRINCIPALE DI PAGAMENTO ---
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { recaptchaToken } = req.body;

        // Verifica di base del token reCAPTCHA inviato dal frontend
        if (!recaptchaToken) {
            return res.status(400).json({ error: "Token reCAPTCHA mancante." });
        }

        // Creazione del Payment Intent tramite Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 2900, // 29.00 EUR in centesimi
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
        });

        // Restituisce il client secret al frontend
        res.json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (e) {
        console.error('Errore Stripe:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Avvio del server sulla porta assegnata dall'host (es. Render) o sulla 3000 in locale
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server backend sicuro in ascolto sulla porta ${PORT}`);
});
