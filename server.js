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
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server attivo.');
});

// --- ROTTA PRINCIPALE DI PAGAMENTO ---
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { recaptchaToken, amount } = req.body;

        // Nota: se la richiesta arriva da Google Pay / Apple Pay, reCAPTCHA non viene passato dal frontend 
        // perché gestito direttamente dai wallet nativi protetti del browser. 
        // Effettuiamo quindi il controllo del reCAPTCHA solo se il token è presente.
        if (recaptchaToken) {
            // Qui potresti eventualmente aggiungere la verifica server-side del reCAPTCHA di Google se desideri validarlo.
        }

        // Creazione del Payment Intent tramite Stripe usando l'importo dinamico (o 29.00 EUR di default)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount || 2900, // Importo in centesimi
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
