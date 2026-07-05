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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCardPaymentDto, CreatePixPaymentDto } from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('public-key/:tenantId')
  @ApiOperation({ summary: 'Get the Mercado Pago public key for a tenant' })
  getPublicKey(@Param('tenantId') tenantId: string) {
    return this.paymentService.getPublicKey(tenantId);
  }

  @Post('pix')
  @ApiOperation({ summary: 'Create or retrieve the PIX payment for an order' })
  createPix(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePixPaymentDto,
  ) {
    this.assertTenant(tenantId);
    return this.paymentService.createPixPayment(tenantId, dto.orderId);
  }

  @Post('card')
  @ApiOperation({ summary: 'Pay an order with a tokenized card' })
  createCard(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCardPaymentDto,
  ) {
    this.assertTenant(tenantId);
    return this.paymentService.createCardPayment(tenantId, dto);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Mercado Pago payment notifications' })
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
