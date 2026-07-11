import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCardPaymentDto, CreatePixPaymentDto } from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('public-key/:tenantId')
  @ApiOperation({
    summary: 'Buscar chave publica do Mercado Pago',
    description: 'Retorna a chave publica configurada para tokenizacao de cartao no frontend.',
  })
  getPublicKey(@Param('tenantId') tenantId: string) {
    return this.paymentService.getPublicKey(tenantId);
  }

  @Post('pix')
  @ApiOperation({
    summary: 'Gerar pagamento PIX',
    description: 'Cria ou reutiliza o pagamento PIX de um pedido e retorna QR Code/copia e cola.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'ID da loja dona do pedido.',
    required: true,
  })
  createPix(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePixPaymentDto,
  ) {
    this.assertTenant(tenantId);
    return this.paymentService.createPixPayment(tenantId, dto.orderId);
  }

  @Post('card')
  @ApiOperation({
    summary: 'Pagar com cartao tokenizado',
    description: 'Finaliza o pagamento com um token de cartao gerado pelo Mercado Pago no frontend.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'ID da loja dona do pedido.',
    required: true,
  })
  createCard(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCardPaymentDto,
  ) {
    this.assertTenant(tenantId);
    return this.paymentService.createCardPayment(tenantId, dto);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook Mercado Pago',
    description: 'Recebe notificacoes de pagamento enviadas pelo Mercado Pago.',
  })
  webhook(
    @Body() body: any,
    @Query('data.id') queryPaymentId: string,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.paymentService.handleWebhook({
      body,
      queryPaymentId,
      signature,
      requestId,
    });
  }

  private assertTenant(tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
  }
}
