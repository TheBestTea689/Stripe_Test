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

    function getCalculatedAmountInCents() {
        let finalPrice = basePrice * currentRate;
        if (discountPercent > 0) finalPrice = finalPrice * (1 - discountPercent / 100);
        return Math.round(finalPrice * 100);
    }

    function updatePriceDisplay() {
        let finalPrice = basePrice * currentRate;
        if (discountPercent > 0) finalPrice = finalPrice * (1 - discountPercent / 100);

        const formatted = finalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        priceAmountEl.textContent = `${formatted} ${currentSymbol}`;
        btnText.textContent = `Paga ${formatted} ${currentSymbol}`;

        if (window.paymentRequest) {
            window.paymentRequest.update({
                total: {
                    label: 'Totale Ordine',
                    amount: getCalculatedAmountInCents(),
                }
            });
        }
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

    // --- CONFIGURAZIONE GOOGLE PAY / APPLE PAY (PAYMENT REQUEST) ---
    const paymentRequest = stripe.paymentRequest({
        country: 'IT',
        currency: 'eur',
        total: {
            label: 'Totale Ordine',
            amount: getCalculatedAmountInCents(),
        },
        requestPayerName: true,
        requestPayerEmail: true,
    });

    window.paymentRequest = paymentRequest;

    const googlePayButton = document.getElementById('google-pay-button');

    // Verifica supporto browser per Wallet Digitali con correzione opacità
    paymentRequest.canMakePayment().then(function (result) {
        if (googlePayButton) {
            googlePayButton.style.display = 'inline-flex';

            if (result) {
                // Se supportato (es. mobile/Chrome), opacità piena e pulsante pienamente attivo
                googlePayButton.style.opacity = '1';
                googlePayButton.style.cursor = 'pointer';
                googlePayButton.disabled = false;
            } else {
                // Se non supportato (es. Firefox desktop), grigetto e disabilitato
                googlePayButton.style.opacity = '0.4';
                googlePayButton.style.cursor = 'not-allowed';
                googlePayButton.disabled = true;
            }
        }
    }).catch(err => {
        console.error("Errore verifica canMakePayment:", err);
        if (googlePayButton) {
            googlePayButton.style.display = 'inline-flex';
            googlePayButton.style.opacity = '0.4';
            googlePayButton.style.cursor = 'not-allowed';
            googlePayButton.disabled = true;
        }
    });

    if (googlePayButton) {
        googlePayButton.addEventListener('click', function (e) {
            e.preventDefault();
            if (!googlePayButton.disabled) {
                paymentRequest.show();
            }
        });
    }

    paymentRequest.on('paymentmethod', async function (ev) {
        try {
            errorMessageDiv.style.display = 'none';

            const response = await fetch('https://stripe-test-backend-n09g.onrender.com/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: getCalculatedAmountInCents()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Errore dal server.");
            }

            const data = await response.json();
            const clientSecret = data.clientSecret;

            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: ev.paymentMethod.id
            }, { handleActions: false });

            if (error) {
                ev.complete('fail');
                errorMessageDiv.style.display = 'block';
                errorMessageDiv.textContent = error.message;
            } else {
                ev.complete('success');

                if (paymentIntent.status === 'requires_action') {
                    const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
                    if (actionError) {
                        errorMessageDiv.style.display = 'block';
                        errorMessageDiv.textContent = actionError.message;
                        return;
                    }
                }

                if (form) form.style.display = 'none';
                if (googlePayButton) googlePayButton.style.display = 'none';
                captchaStep.style.display = 'none';
                successMessage.style.display = 'block';

                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }

        } catch (err) {
            console.error('Errore Wallet:', err);
            ev.complete('fail');
            errorMessageDiv.style.display = 'block';
            errorMessageDiv.textContent = err.message || "Si è verificato un errore di connessione.";
        }
    });

    window.onCaptchaSuccess = async function (token) {
        try {
            errorMessageDiv.style.display = 'none';

            const response = await fetch('https://stripe-test-backend-n09g.onrender.com/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recaptchaToken: token,
                    amount: getCalculatedAmountInCents()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Errore dal server.");
            }

            const data = await response.json();
            const clientSecret = data.clientSecret;
            const userEmail = document.getElementById('email').value;

            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardNumber,
                    billing_details: {
                        email: userEmail
                    }
                }
            });

            if (error) {
                captchaStep.style.display = 'none';
                form.style.display = 'block';
                errorMessageDiv.style.display = 'block';
                errorMessageDiv.textContent = error.message;

            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
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

    // --- EFFETTO MOUSE GLOW FLUIDO CORRETTO ---
    const mouseGlow = document.getElementById('mouseGlow');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateGlow() {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;

        if (mouseGlow) {
            // Utilizziamo transform translate3d per performance ottimali e aggirare problemi di rendering CSS
            mouseGlow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }

        requestAnimationFrame(animateGlow);
    }

    animateGlow();

});
