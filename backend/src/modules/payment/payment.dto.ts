import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePixPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class CreateCardPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardToken: string;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  installments: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiProperty({ required: false, example: 'CPF' })
  @IsOptional()
  @IsString()
  identificationType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  identificationNumber?: string;
}
