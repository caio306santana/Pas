import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderOptionDto {
  @ApiProperty({
    description: 'Nome do grupo de opcao escolhido no produto.',
    example: 'Massa',
  })
  @IsString()
  @IsNotEmpty()
  groupName: string;

  @ApiProperty({
    description: 'Nome da opcao selecionada.',
    example: 'Tradicional',
  })
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @ApiProperty({
    description: 'Valor adicional desta opcao.',
    example: 0,
  })
  @IsNumber()
  price: number;
}

export class OrderItemDto {
  @ApiProperty({
    description: 'ID do produto comprado.',
    example: 'ba8fec4d-bf4e-4a73-99e7-0ed060f4d814',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Quantidade do produto.',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Opcoes escolhidas para este item.',
    type: [OrderOptionDto],
    example: [
      {
        groupName: 'Massa',
        optionName: 'Tradicional',
        price: 0,
      },
    ],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderOptionDto)
  options?: OrderOptionDto[];
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID do cliente autenticado.',
    example: '504e716f-c865-4929-ba95-1b2c3064126c',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Como o pedido sera recebido.',
    enum: DeliveryType,
    example: DeliveryType.DELIVERY,
  })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiProperty({
    description: 'Forma de pagamento escolhida.',
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Rua do endereco de entrega. Obrigatorio quando deliveryType = DELIVERY.',
    example: 'Rua das Flores',
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({
    description: 'Numero do endereco de entrega.',
    example: '123',
  })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({
    description: 'Bairro do endereco de entrega.',
    example: 'Centro',
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiPropertyOptional({
    description: 'Cidade do endereco de entrega.',
    example: 'Sao Paulo',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'CEP do endereco de entrega.',
    example: '01001000',
  })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({
    description: 'Itens do pedido.',
    type: [OrderItemDto],
    example: [
      {
        productId: 'ba8fec4d-bf4e-4a73-99e7-0ed060f4d814',
        quantity: 2,
        options: [
          {
            groupName: 'Massa',
            optionName: 'Tradicional',
            price: 0,
          },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({
    description: 'Cupom de desconto aplicado no carrinho.',
    example: 'MENINO10',
  })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Valor para troco quando paymentMethod = CASH.',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  changeFor?: number;

  @ApiPropertyOptional({
    description: 'Observacoes gerais do cliente para o pedido.',
    example: 'Sem cebola, por favor.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
