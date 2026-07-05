import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { PrismaService } from '../../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateCardPaymentDto } from './payment.dto';

type WebhookInput = {
  body: any;
  queryPaymentId?: string;
  signature?: string;
  requestId?: string;
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async createPixPayment(tenantId: string, orderId: string) {
    const { order, config } = await this.getPaymentContext(
      tenantId,
      orderId,
      'pixActive',
    );

    if (order.paymentMethod !== 'PIX') {
      throw new BadRequestException('O pedido nao foi criado com pagamento PIX.');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return this.toPaymentResponse(order);
    }
    if (
      order.mpPaymentId &&
      order.pixQrCode &&
      (!order.paymentExpiresAt || order.paymentExpiresAt > new Date())
    ) {
      return this.toPaymentResponse(order);
    }

    const expiration = new Date(Date.now() + 30 * 60 * 1000);

    try {
      const payment = new Payment(this.getMpClient(config.mpAccessToken));
      const mpPayment = await payment.create({
        body: {
          transaction_amount: this.roundMoney(order.total),
          description: `Pedido #${order.orderNumber}`,
          external_reference: order.id,
          payment_method_id: 'pix',
          date_of_expiration: expiration.toISOString(),
          payer: this.buildPayer(order.customer),
          ...(this.getNotificationUrl()
            ? { notification_url: this.getNotificationUrl() }
            : {}),
        },
        requestOptions: { idempotencyKey: `pix-${order.id}` },
      });

      if (!mpPayment.id) {
        throw new Error('Mercado Pago did not return a payment id.');
      }

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          mpPaymentId: String(mpPayment.id),
          mpPaymentStatus: mpPayment.status,
          pixQrCode:
            mpPayment.point_of_interaction?.transaction_data?.qr_code || null,
          pixQrCodeBase64:
            mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 ||
            null,
          paymentExpiresAt: mpPayment.date_of_expiration
            ? new Date(mpPayment.date_of_expiration)
            : expiration,
          paymentStatus: this.mapPaymentStatus(mpPayment.status),
        },
      });

      return this.toPaymentResponse(updated);
    } catch (error) {
      this.handleProviderError(error, 'Nao foi possivel gerar o PIX.');
    }
  }

  async createCardPayment(
    tenantId: string,
    dto: CreateCardPaymentDto,
  ) {
    const { order, config } = await this.getPaymentContext(
      tenantId,
      dto.orderId,
      'cardActive',
    );

    if (order.paymentMethod !== 'CARD') {
      throw new BadRequestException(
        'O pedido nao foi criado com pagamento por cartao.',
      );
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return this.toPaymentResponse(order);
    }
    if (
      order.mpPaymentId &&
      order.paymentStatus === PaymentStatus.PENDING
    ) {
      return this.toPaymentResponse(order);
    }

    try {
      const payment = new Payment(this.getMpClient(config.mpAccessToken));
      const mpPayment = await payment.create({
        body: {
          transaction_amount: this.roundMoney(order.total),
          description: `Pedido #${order.orderNumber}`,
          external_reference: order.id,
          token: dto.cardToken,
          installments: dto.installments,
          ...(dto.paymentMethodId
            ? { payment_method_id: dto.paymentMethodId }
            : {}),
          payer: {
            ...this.buildPayer(order.customer),
            ...(dto.identificationNumber
              ? {
                  identification: {
                    type: dto.identificationType || 'CPF',
                    number: dto.identificationNumber.replace(/\D/g, ''),
                  },
                }
              : {}),
          },
          ...(this.getNotificationUrl()
            ? { notification_url: this.getNotificationUrl() }
            : {}),
        },
        requestOptions: {
          idempotencyKey: `card-${order.id}-${dto.cardToken.slice(-12)}`,
        },
      });

      if (!mpPayment.id) {
        throw new Error('Mercado Pago did not return a payment id.');
      }

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          mpPaymentId: String(mpPayment.id),
          mpPaymentStatus: mpPayment.status,
          paymentStatus: this.mapPaymentStatus(mpPayment.status),
        },
      });

      this.notifyPaymentUpdate(updated);

      return {
        ...this.toPaymentResponse(updated),
        statusDetail: mpPayment.status_detail,
      };
    } catch (error) {
      this.handleProviderError(
        error,
        'Nao foi possivel processar o pagamento com cartao.',
      );
    }
  }

  async handleWebhook(input: WebhookInput) {
    const paymentId = String(
      input.body?.data?.id || input.queryPaymentId || '',
    );
    const topic = input.body?.type || input.body?.topic;
    const action = input.body?.action;

    if (!paymentId || (topic !== 'payment' && action !== 'payment.updated')) {
      return { received: true, ignored: true };
    }

    const order = await this.prisma.order.findFirst({
      where: { mpPaymentId: paymentId },
    });
    if (!order) {
      this.logger.warn(`Webhook received for unknown payment ${paymentId}.`);
      return { received: true, ignored: true };
    }

    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenantId: order.tenantId },
    });
    if (!config?.mpAccessToken) {
      return { received: true, ignored: true };
    }

    if (config.mpWebhookSecret) {
      this.validateWebhookSignature(
        paymentId,
        input.requestId,
        input.signature,
        config.mpWebhookSecret,
      );
    }

    try {
      const payment = new Payment(this.getMpClient(config.mpAccessToken));
      const mpPayment = await payment.get({ id: paymentId });
      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          mpPaymentStatus: mpPayment.status,
          paymentStatus: this.mapPaymentStatus(mpPayment.status),
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      this.notifyPaymentUpdate(updated);
      this.logger.log(
        `Order ${order.id} payment updated to ${mpPayment.status}.`,
      );

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed for payment ${paymentId}.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Nao foi possivel consultar o pagamento no Mercado Pago.',
      );
    }
  }

  async getPublicKey(tenantId: string) {
    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: { mpPublicKey: true },
    });
    return { publicKey: config?.mpPublicKey || null };
  }

  private async getPaymentContext(
    tenantId: string,
    orderId: string,
    setting: 'pixActive' | 'cardActive',
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido nao encontrado.');
    }
    if (order.tenantId !== tenantId) {
      throw new BadRequestException('Pedido nao pertence a este tenant.');
    }

    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
    });
    if (!config?.mpAccessToken) {
      throw new BadRequestException(
        'Loja sem integracao com Mercado Pago configurada.',
      );
    }

    const settings = (config.paymentSettings || {}) as Record<string, unknown>;
    if (settings[setting] === false) {
      throw new BadRequestException(
        'Esta forma de pagamento esta desativada para a loja.',
      );
    }

    return { order, config };
  }

  private getMpClient(accessToken: string) {
    return new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10000 },
    });
  }

  private getNotificationUrl() {
    const baseUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/payment/webhook` : undefined;
  }

  private buildPayer(customer: {
    email: string;
    phone: string;
    name: string;
    cpf: string | null;
  }) {
    const [firstName, ...lastName] = customer.name.trim().split(/\s+/);
    return {
      email: customer.email,
      first_name: firstName,
      last_name: lastName.join(' '),
      phone: { number: customer.phone },
      ...(customer.cpf
        ? {
            identification: {
              type: 'CPF',
              number: customer.cpf.replace(/\D/g, ''),
            },
          }
        : {}),
    };
  }

  private mapPaymentStatus(status?: string | null) {
    if (status === 'approved') {
      return PaymentStatus.PAID;
    }
    if (
      ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(
        status || '',
      )
    ) {
      return PaymentStatus.FAILED;
    }
    return PaymentStatus.PENDING;
  }

  private toPaymentResponse(order: {
    mpPaymentId: string | null;
    mpPaymentStatus: string | null;
    paymentStatus: PaymentStatus;
    pixQrCode: string | null;
    pixQrCodeBase64: string | null;
    paymentExpiresAt: Date | null;
  }) {
    return {
      paymentId: order.mpPaymentId,
      status: order.mpPaymentStatus,
      paymentStatus: order.paymentStatus,
      qrCode: order.pixQrCode,
      qrCodeBase64: order.pixQrCodeBase64,
      expiresAt: order.paymentExpiresAt,
    };
  }

  private notifyPaymentUpdate(order: any) {
    this.realtimeGateway.notifyOrderStatusChanged(
      order.tenantId,
      order.id,
      order.status,
      order,
    );
  }

  private validateWebhookSignature(
    paymentId: string,
    requestId: string | undefined,
    signature: string | undefined,
    secret: string,
  ) {
    const parts = Object.fromEntries(
      (signature || '').split(',').map((part) => {
        const [key, value] = part.trim().split('=');
        return [key, value];
      }),
    );
    const ts = parts.ts;
    const receivedHash = parts.v1;

    if (!ts || !receivedHash || !requestId) {
      throw new UnauthorizedException('Assinatura de webhook ausente.');
    }

    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const expectedHash = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');
    const expected = Buffer.from(expectedHash);
    const received = Buffer.from(receivedHash);

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Assinatura de webhook invalida.');
    }
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private handleProviderError(error: unknown, fallbackMessage: string): never {
    const cause = error as {
      message?: string;
      status?: number;
      cause?: Array<{ description?: string }>;
    };
    const providerMessage =
      cause.cause?.map((item) => item.description).filter(Boolean).join(' ') ||
      cause.message;

    this.logger.error(
      providerMessage || fallbackMessage,
      error instanceof Error ? error.stack : undefined,
    );
    throw new BadGatewayException(providerMessage || fallbackMessage);
  }
}
