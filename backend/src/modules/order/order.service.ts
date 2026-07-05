import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { QueueService } from '../queue/queue.service';
import { CreateOrderDto } from './order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private queueService: QueueService,
  ) {}

  async createOrder(tenantId: string, dto: CreateOrderDto) {
    // 1. Verify Customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer || customer.tenantId !== tenantId) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // 2. Fetch Products and Options to compute verified price
    let subtotal = 0;
    const orderItemsData = [];

    for (const itemDto of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: itemDto.productId },
        include: {
          optionGroups: {
            include: { options: true },
          },
        },
      });
      if (
        !product ||
        product.tenantId !== tenantId ||
        !product.isAvailable ||
        product.stock === 0
      ) {
        throw new BadRequestException(`Produto ${itemDto.productId} indisponível.`);
      }
      if (!Number.isInteger(itemDto.quantity) || itemDto.quantity < 1) {
        throw new BadRequestException('Quantidade de produto inválida.');
      }

      let itemPrice = product.price;
      if (product.promoPrice !== null) {
        itemPrice = product.promoPrice;
      }

      // Sum options prices
      let optionsPrice = 0;
      const verifiedOptions = [];
      for (const group of product.optionGroups) {
        const selected = (itemDto.options || []).filter(
          (option) => option.groupName === group.name,
        );
        if (
          selected.length < group.minSelect ||
          selected.length > group.maxSelect
        ) {
          throw new BadRequestException(
            `Seleção inválida no grupo ${group.name}.`,
          );
        }

        for (const selectedOption of selected) {
          const databaseOption = group.options.find(
            (option) =>
              option.name === selectedOption.optionName && option.isAvailable,
          );
          if (!databaseOption) {
            throw new BadRequestException(
              `Opção ${selectedOption.optionName} indisponível.`,
            );
          }
          optionsPrice += databaseOption.price;
          verifiedOptions.push({
            groupName: group.name,
            optionName: databaseOption.name,
            price: databaseOption.price,
          });
        }
      }

      const knownGroupNames = new Set(
        product.optionGroups.map((group) => group.name),
      );
      if (
        (itemDto.options || []).some(
          (option) => !knownGroupNames.has(option.groupName),
        )
      ) {
        throw new BadRequestException('Grupo de opção inválido.');
      }

      const totalItemUnit = itemPrice + optionsPrice;
      subtotal += totalItemUnit * itemDto.quantity;

      orderItemsData.push({
        productId: product.id,
        quantity: itemDto.quantity,
        price: totalItemUnit,
        options: verifiedOptions,
      });
    }

    // 3. Compute Coupon Discount
    let discount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          tenantId,
          code: dto.couponCode.toUpperCase(),
          isActive: true,
          expiresAt: { gte: new Date() },
        },
      });

      if (coupon) {
        if (subtotal >= coupon.minOrderValue) {
          if (coupon.discountType === 'PERCENTAGE') {
            discount = subtotal * (coupon.value / 100);
          } else {
            discount = coupon.value;
          }
        }
      }
    }

    // 4. Calculate Delivery Fee
    let deliveryFee = 0;
    if (dto.deliveryType === 'DELIVERY' && dto.neighborhood) {
      const area = await this.prisma.deliveryArea.findFirst({
        where: {
          tenantId,
          neighborhood: { equals: dto.neighborhood, mode: 'insensitive' },
        },
      });
      if (area) {
        deliveryFee = area.fee;
      } else {
        deliveryFee = 5.0; // default fee if neighborhood not explicitly mapped
      }
    }

    const total = Math.max(0, subtotal - discount + deliveryFee);

    // 5. Create Order transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          deliveryType: dto.deliveryType,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentMethod === 'PIX' ? PaymentStatus.PENDING : PaymentStatus.PENDING,
          deliveryFee,
          subtotal,
          discount,
          total,
          changeFor: dto.changeFor,
          notes: dto.notes,
          deliveryAddressStreet: dto.street,
          deliveryAddressNumber: dto.number,
          deliveryAddressNeighborhood: dto.neighborhood,
          deliveryAddressCity: dto.city,
          deliveryAddressZipCode: dto.zipCode,
          items: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              options: item.options,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      // Update customer cashback / loyalty points
      const config = await tx.tenantConfig.findUnique({ where: { tenantId } });
      const cashbackEarned = config ? (total * (config.cashbackPercent / 100)) : 0;
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          cashbackBalance: { increment: cashbackEarned },
          points: { increment: Math.floor(total) },
        },
      });

      return createdOrder;
    });

    // 6. Realtime socket broadcast
    this.realtimeGateway.notifyNewOrder(tenantId, order);

    // 7. WhatsApp notification mock
    const whatsappMsg = `Olá ${order.customer.name}, recebemos seu pedido #${order.orderNumber}! Total: R$ ${order.total.toFixed(2)}. Acompanhe em tempo real!`;
    this.queueService.dispatchWhatsApp(order.customer.phone, whatsappMsg).catch((err) => {
      this.logger.error(`Failed to dispatch WhatsApp mock: ${err.message}`);
    });

    // 8. Start auto-simulation in background so user doesn't need to manually push status for testing
    this.queueService.startLifecycleSimulation(order.id, tenantId).catch((err) => {
      this.logger.error(`Failed to start lifecycle simulation: ${err.message}`);
    });

    return order;
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return order;
  }

  async getActiveOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        status: {
          notIn: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });
  }

  async getCustomerHistory(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const currentOrder = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!currentOrder) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        paymentStatus:
          (status === OrderStatus.DELIVERED ||
            status === OrderStatus.COMPLETED) &&
          this.isOfflinePayment(currentOrder)
            ? PaymentStatus.PAID
            : undefined,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    // Notify sockets
    this.realtimeGateway.notifyOrderStatusChanged(currentOrder.tenantId, id, status, updated);

    // Notify WhatsApp
    const whatsappMsg = `Olá ${updated.customer.name}, o status do seu pedido #${updated.orderNumber} mudou para: ${status}!`;
    await this.queueService.dispatchWhatsApp(updated.customer.phone, whatsappMsg);

    return updated;
  }

  private isOfflinePayment(order: {
    paymentMethod: string;
    notes: string | null;
  }) {
    return (
      order.paymentMethod === 'CASH' ||
      (order.paymentMethod === 'CARD' &&
        order.notes?.includes('[PAGAMENTO: Cartão na') === true)
    );
  }

  // Statistics for Dashboard Charts & Numbers
  async getDashboardStats(tenantId: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
    });

    const activeCount = orders.filter((o) => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length;
    const finalCount = orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;
    const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

    // Financials
    const completedOrders = orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status));
    const revenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    // Simple mock calculation: profit margin around 65% of revenue for trailer business
    const profit = revenue * 0.65;
    const expenses = revenue * 0.35;
    const ticketAverage = completedOrders.length > 0 ? (revenue / completedOrders.length) : 0;

    // Peak hours mapping
    const hourlyDistribution = Array(24).fill(0);
    completedOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      hourlyDistribution[hour]++;
    });

    const hourlyStats = hourlyDistribution.map((count, hour) => ({
      hour: `${hour}h`,
      pedidos: count,
    })).filter(h => h.pedidos > 0 || (parseInt(h.hour) >= 18 && parseInt(h.hour) <= 23)); // show operating times mainly

    // Top products mapping (Mocking top sales based on orders count or real database items)
    const items = await this.prisma.orderItem.findMany({
      where: { order: { tenantId } },
      include: { product: true },
    });

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    items.forEach((item) => {
      if (item.product) {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.product.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.price * item.quantity;
      }
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Monthly comparisons mockup
    const monthlyStats = [
      { month: 'Março', receita: revenue * 0.8, pedidos: Math.floor(completedOrders.length * 0.8) },
      { month: 'Abril', receita: revenue * 0.9, pedidos: Math.floor(completedOrders.length * 0.9) },
      { month: 'Maio', receita: revenue, pedidos: completedOrders.length },
    ];

    return {
      activeCount,
      finalCount,
      cancelledCount,
      revenue,
      profit,
      expenses,
      ticketAverage,
      hourlyStats,
      topProducts,
      monthlyStats,
      totalOrders: completedOrders.length,
    };
  }
}
