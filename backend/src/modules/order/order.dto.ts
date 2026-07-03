import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class OrderOptionDto {
  @ApiProperty({ example: 'Massa' })
  @IsString()
  @IsNotEmpty()
  groupName: string;

  @ApiProperty({ example: 'Tradicional' })
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @ApiProperty({ example: 0.0 })
  @IsNumber()
  price: number;
}

export class OrderItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ type: [OrderOptionDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderOptionDto)
  options?: OrderOptionDto[];
}

export class CreateOrderDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ enum: DeliveryType, example: 'DELIVERY' })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiProperty({ enum: PaymentMethod, example: 'PIX' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '01001-000' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: 'MENINO10', required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ example: 50.0, required: false })
  @IsNumber()
  @IsOptional()
  changeFor?: number;

  @ApiProperty({ example: 'Sem cebola por favor', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
