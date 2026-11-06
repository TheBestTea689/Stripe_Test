document.addEventListener('DOMContentLoaded', () => {

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const stripe = Stripe('pk_test_51UVYHmL2BigJwV5Ohf6RMyRN1CQotyu6yUdEVwZgjtamGqWxuqAeVO9oHdzCaQJgWEEC44NIDymViyi6Uy7LquBn00kfgwmDC9');
    const elements = stripe.elements();

    const elementStyles = {
        base: {
            color: '#f8fafc',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            '::placeholder': { color: '#94a3b8' },
        },
        invalid: { color: '#ef4444' }
    };

    const cardNumber = elements.create('cardNumber', { style: elementStyles });
    const cardExpiry = elements.create('cardExpiry', { style: elementStyles });
    const cardCvc = elements.create('cardCvc', { style: elementStyles });

    cardNumber.mount('#card-number-element');
    cardExpiry.mount('#card-expiry-element');
    cardCvc.mount('#card-cvc-element');

    const form = document.getElementById('checkoutForm');
    const payButton = document.getElementById('payButton');
    const btnText = document.getElementById('btnText');
    const captchaStep = document.getElementById('captchaStep');
    const successMessage = document.getElementById('successMessage');
    const errorMessageDiv = document.getElementById('error-message');

    let basePrice = 29.00;
    let currentSymbol = '€';
    let currentRate = 1;
    let discountPercent = 0;

    const currencyBtns = document.querySelectorAll('.currency-btn');
    const priceAmountEl = document.getElementById('priceAmount');

    function updatePriceDisplay() {
        let finalPrice = basePrice * currentRate;
        if (discountPercent > 0) finalPrice = finalPrice * (1 - discountPercent / 100);

        const formatted = finalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        priceAmountEl.textContent = `${formatted} ${currentSymbol}`;
        btnText.textContent = `Paga ${formatted} ${currentSymbol}`;
    }

    currencyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currencyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSymbol = btn.dataset.symbol;
            currentRate = parseFloat(btn.dataset.rate);
            updatePriceDisplay();
        });
    });

    const togglePromoBtn = document.getElementById('togglePromoBtn');
    const promoBox = document.getElementById('promoBox');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    const promoInput = document.getElementById('promoInput');
    const promoMessage = document.getElementById('promoMessage');

    togglePromoBtn.addEventListener('click', () => {
        promoBox.style.display = promoBox.style.display === 'none' ? 'flex' : 'none';
    });

    applyPromoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim().toUpperCase();
        if (code === 'PROMO20' || code === 'DISCOUNT20') {
            discountPercent = 20;
            promoMessage.style.color = '#10b981';
            promoMessage.textContent = 'Sconto del 20% applicato con successo!';
            updatePriceDisplay();
        } else {
            promoMessage.style.color = '#ef4444';
            promoMessage.textContent = 'Codice promozionale non valido.';
        }
    });

    // Questa funzione viene chiamata automaticamente da Google reCAPTCHA quando l'utente supera il controllo anti-bot
    // Questa funzione viene chiamata automaticamente da Google reCAPTCHA quando l'utente supera il controllo anti-bot
    window.onCaptchaSuccess = async function (token) {
        try {
            // Mostriamo un feedback visivo o lasciamo il caricamento
            errorMessageDiv.style.display = 'none';

            // 1. Chiamiamo il nostro server.js inviando il token del reCAPTCHA
            const response = await fetch('https://stripe-test-backend-n09g.onrender.com/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recaptchaToken: token })
            });


            // Controlliamo se il server ha risposto con un errore
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Errore dal server.");
            }

            const data = await response.json();
            const clientSecret = data.clientSecret;
            const userEmail = document.getElementById('email').value;

            // 2. Chiediamo a Stripe di confermare il pagamento usando l'elemento sicuro della carta
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardNumber, // Questo è l'elemento Stripe della carta che hai creato prima!
                    billing_details: {
                        email: userEmail
                    }
                }
            });

            // 3. Gestiamo la risposta di Stripe
            if (error) {
                // Se la carta viene rifiutata o c'è un errore nei dati
                captchaStep.style.display = 'none';
                form.style.display = 'block'; // Mostriamo di nuovo il form per correggere
                errorMessageDiv.style.display = 'block';
                errorMessageDiv.textContent = error.message;

            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Evviva! Pagamento andato a buon fine
                captchaStep.style.display = 'none';
                successMessage.style.display = 'block';

                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }

        } catch (err) {
            console.error('Errore:', err);
            captchaStep.style.display = 'none';
            form.style.display = 'block';
            errorMessageDiv.style.display = 'block';
            errorMessageDiv.textContent = err.message || "Si è verificato un errore di connessione.";
        }
    };



    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            if (!emailInput.value) {
                errorMessageDiv.style.display = 'block';
                errorMessageDiv.textContent = "Inserisci un indirizzo email valido.";
                return;
            }
            errorMessageDiv.style.display = 'none';
            form.style.display = 'none';
            captchaStep.style.display = 'block';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    // --- EFFETTO MOUSE GLOW FLUIDO ---
    const mouseGlow = document.getElementById('mouseGlow');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;

    // Rileva la posizione del mouse
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Funzione di aggiornamento continuo per un movimento smorzato e naturale
    function animateGlow() {
        // Velocità di inseguimento (più basso è il numero, più il movimento è morbido/ritardato)
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;

        if (mouseGlow) {
            mouseGlow.style.left = `${currentX}px`;
            mouseGlow.style.top = `${currentY}px`;
        }

        requestAnimationFrame(animateGlow);
    }

    animateGlow();

});
