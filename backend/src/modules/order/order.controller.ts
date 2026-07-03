import { Controller, Post, Get, Put, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './order.dto';
import { OrderStatus } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new order from checkout' })
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
  @ApiOperation({ summary: 'Get all active orders for the dashboard (Admin/Kitchen)' })
  async getActiveOrders(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.orderService.getActiveOrders(tenantId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get order history for a client' })
  async getCustomerHistory(@Param('customerId') customerId: string) {
    return this.orderService.getCustomerHistory(customerId);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get metrics and statistics for dashboard analytics' })
  async getDashboardStats(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is missing.');
    }
    return this.orderService.getDashboardStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single order by ID' })
  async getOrderById(@Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update status of an order (Admin/Kitchen)' })
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
