# Implementation

Documento vivo das funcionalidades implementadas, configuracoes e pendencias do projeto.

## Pagamentos Mercado Pago

Status: implementado no codigo em 4 de julho de 2026.

### Fluxos entregues

- PIX criado pelo backend com valor recalculado do pedido.
- QR Code, PIX copia e cola e expiracao persistidos no pedido.
- Cartao online tokenizado pelo Mercado Pago no navegador.
- O backend recebe somente o token do cartao, nunca numero, validade ou CVV.
- Pagamento com cartao na entrega/retirada continua disponivel sem cobranca online.
- Webhook consulta o pagamento diretamente no Mercado Pago antes de atualizar o pedido.
- Atualizacao do status de pagamento por WebSocket e polling de contingencia.
- Idempotencia na criacao do PIX e das cobrancas com cartao.
- Assinatura de webhook validada quando `mpWebhookSecret` estiver configurado.

### Endpoints

- `GET /payment/public-key/:tenantId`
- `POST /payment/pix`
- `POST /payment/card`
- `POST /payment/webhook`

Os endpoints de criacao exigem o header `x-tenant-id`.

### Banco de dados

Migration:

`backend/prisma/migrations/20260704213000_add_mercado_pago_payments`

Campos adicionados:

- `TenantConfig.mpPublicKey`
- `TenantConfig.mpAccessToken`
- `TenantConfig.mpWebhookSecret`
- `Order.mpPaymentId`
- `Order.mpPaymentStatus`
- `Order.pixQrCode`
- `Order.pixQrCodeBase64`
- `Order.paymentExpiresAt`

### Configuracao obrigatoria

No ambiente do backend:

```env
BACKEND_URL=https://api.seu-dominio.com
```

Em `TenantConfig`, cadastrar as credenciais da aplicacao Mercado Pago:

- `mpPublicKey`: chave publica usada na tokenizacao do cartao.
- `mpAccessToken`: credencial privada usada apenas pelo backend.
- `mpWebhookSecret`: assinatura secreta das notificacoes Webhook.

O webhook configurado no painel do Mercado Pago deve apontar para:

```text
https://api.seu-dominio.com/payment/webhook
```

Nunca publicar `mpAccessToken`, `mpWebhookSecret` ou `DATABASE_URL` no frontend ou no Git.

### Seguranca e consistencia melhoradas

- Credenciais privadas do Mercado Pago foram removidas das respostas publicas de tenant.
- Cliente e produto agora precisam pertencer ao mesmo tenant do pedido.
- Quantidade precisa ser um inteiro positivo.
- Precos e disponibilidade dos adicionais sao conferidos no banco.
- O valor enviado pelo navegador para produtos e adicionais nao e usado para cobrar.
- `mpPaymentId` e unico para facilitar reconciliacao e impedir associacoes ambiguas.

## Validacao

- `backend`: `npm run build`
- `frontend`: `npm run build`
- Prisma Client gerado com Prisma 5.22.

O teste real de PIX, cartao e webhook depende de credenciais de teste ou producao do Mercado Pago.

## Melhorias recomendadas

- Proteger os endpoints administrativos de tenant, pedidos e dashboard com guards JWT e regras por perfil.
- Mover cashback e pontos para depois da confirmacao do pagamento ou conclusao do pedido.
- Trocar valores monetarios `Float` por `Decimal` no Prisma.
- Criar uma tabela `PaymentAttempt` para historico de tentativas, reembolsos e conciliacao.
- Adicionar testes unitarios do servico de pagamento e testes de integracao do webhook.
- Restringir CORS aos dominios configurados.
- Remover a simulacao automatica de ciclo do pedido em producao.
