declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => {
      createCardToken: (data: Record<string, string>) => Promise<{ id: string }>;
      getPaymentMethods: (data: {
        bin: string;
      }) => Promise<{ results?: Array<{ id: string }> }>;
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadMercadoPagoSdk() {
  if (window.MercadoPago) {
    return Promise.resolve();
  }
  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Nao foi possivel carregar o checkout do Mercado Pago.'));
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function tokenizeCard(
  publicKey: string,
  card: {
    number: string;
    name: string;
    expiry: string;
    cvv: string;
    cpf: string;
  },
) {
  await loadMercadoPagoSdk();

  if (!window.MercadoPago) {
    throw new Error('Checkout do Mercado Pago indisponivel.');
  }

  const [month, shortYear] = card.expiry.split('/');
  const year = shortYear?.length === 2 ? `20${shortYear}` : shortYear;
  const cardNumber = card.number.replace(/\D/g, '');
  const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
  const token = await mp.createCardToken({
    cardNumber,
    cardholderName: card.name.trim(),
    cardExpirationMonth: month,
    cardExpirationYear: year,
    securityCode: card.cvv.replace(/\D/g, ''),
    identificationType: 'CPF',
    identificationNumber: card.cpf.replace(/\D/g, ''),
  });

  let paymentMethodId: string | undefined;
  try {
    const methods = await mp.getPaymentMethods({ bin: cardNumber.slice(0, 6) });
    paymentMethodId = methods.results?.[0]?.id;
  } catch {
    // The token is enough for the backend if this optional lookup fails.
  }

  return { cardToken: token.id, paymentMethodId };
}

export {};
