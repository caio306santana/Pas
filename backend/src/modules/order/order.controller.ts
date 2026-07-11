import { Controller, Post, Get, Put, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './order.dto';
import { OrderStatus } from '@prisma/client';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar pedido',
    description: 'Recebe o carrinho do checkout e cria um pedido para a loja informada.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'ID da loja que recebera o pedido.',
    required: true,
  })
  async createOrder(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateOrderDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.orderService.createOrder(tenantId, dto);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Listar pedidos ativos',
    description: 'Retorna pedidos em aberto para painel administrativo e cozinha.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'ID da loja consultada.',
    required: true,
  })
  async getActiveOrders(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.orderService.getActiveOrders(tenantId);
  }

  @Get('customer/:customerId')
  @ApiOperation({
    summary: 'Historico do cliente',
    description: 'Lista pedidos anteriores de um cliente especifico.',
  })
  async getCustomerHistory(@Param('customerId') customerId: string) {
    return this.orderService.getCustomerHistory(customerId);
  }

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Metricas do dashboard',
    description: 'Retorna totais e indicadores para o painel da loja.',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'ID da loja consultada.',
    required: true,
  })
  async getDashboardStats(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.orderService.getDashboardStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhar pedido',
    description: 'Retorna dados completos de um pedido para acompanhamento.',
  })
  async getOrderById(@Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Atualizar status do pedido',
    description: 'Muda o status operacional usado pelo painel e tela de acompanhamento.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    if (!status) {
      throw new BadRequestException('status field is required.');
    }
    return this.orderService.updateOrderStatus(id, status);
  }
}
