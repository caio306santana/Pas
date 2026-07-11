import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePixPaymentDto {
  @ApiProperty({
    description: 'ID do pedido que recebera o pagamento PIX.',
    example: '2f7a67c8-81f1-4cf9-9d0f-97d9e1c12f10',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class CreateCardPaymentDto {
  @ApiProperty({
    description: 'ID do pedido que sera pago com cartao.',
    example: '2f7a67c8-81f1-4cf9-9d0f-97d9e1c12f10',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Token do cartao gerado no frontend pelo SDK do Mercado Pago.',
    example: 'card_token_example_123',
  })
  @IsString()
  @IsNotEmpty()
  cardToken: string;

  @ApiProperty({
    description: 'Quantidade de parcelas.',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  installments: number;

  @ApiPropertyOptional({
    description: 'Metodo de pagamento retornado pelo Mercado Pago, quando disponivel.',
    example: 'visa',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento do pagador.',
    example: 'CPF',
  })
  @IsOptional()
  @IsString()
  identificationType?: string;

  @ApiPropertyOptional({
    description: 'Numero do documento do pagador.',
    example: '12345678900',
  })
  @IsOptional()
  @IsString()
  identificationNumber?: string;
}
