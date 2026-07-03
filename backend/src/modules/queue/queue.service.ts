import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class QueueService {
  private notificationQueue: Queue;
  private simulationQueue: Queue;
  private isRedisConnected = false;
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private realtimeGateway: RealtimeGateway,
    private prisma: PrismaService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const connectionOpts = {
      host: redisUrl.split('://')[1].split(':')[0],
      port: parseInt(redisUrl.split(':')[2] || '6379'),
    };

    try {
      this.notificationQueue = new Queue('notifications', {
        connection: connectionOpts,
        defaultJobOptions: { removeOnComplete: true },
      });
      this.notificationQueue.on('error', () => {});
      this.notificationQueue.on('ready' as any, () => {
        this.isRedisConnected = true;
        this.logger.log('Connected to Redis successfully for notifications.');
      });

      this.simulationQueue = new Queue('order-simulation', {
        connection: connectionOpts,
        defaultJobOptions: { removeOnComplete: true },
      });
      this.simulationQueue.on('error', () => {});
      this.simulationQueue.on('ready' as any, () => {
        this.isRedisConnected = true;
        this.logger.log('Connected to Redis successfully for simulation.');
      });

      this.setupWorkers(connectionOpts);
      this.logger.log('BullMQ Queues initialized.');
    } catch (e) {
      this.logger.error('Failed to initialize BullMQ (Redis not running?). Mock fallback active.', e.stack);
    }
  }

  private setupWorkers(connectionOpts: any) {
    // 1. Notification worker (Simulates WhatsApp/Email sends)
    const worker1 = new Worker(
      'notifications',
      async (job) => {
        const { type, to, message } = job.data;
        this.logger.log(`[WHATSAPP MOCK NOTIFICATION] Sent ${type} to ${to}: "${message}"`);
      },
      { connection: connectionOpts },
    );
    worker1.on('error', () => {});

    // 2. Order Lifecycle Simulation worker (Advances order status automatically for demo purposes)
    const worker2 = new Worker(
      'order-simulation',
      async (job) => {
        const { orderId, tenantId } = job.data;
        const statuses = ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'];

        for (const status of statuses) {
          // Wait 15 seconds between transitions to simulate restaurant cooking & delivery
          await new Promise((res) => setTimeout(res, 12000));

          try {
            const order = await this.prisma.order.update({
              where: { id: orderId },
              data: { status: status as any, paymentStatus: status === 'DELIVERED' ? 'PAID' : undefined },
              include: { customer: true, items: { include: { product: true } } },
            });

            this.logger.log(`[SIMULATOR] Order ${orderId} status updated to ${status}`);
            
            // Broadcast via socket
            this.realtimeGateway.notifyOrderStatusChanged(tenantId, orderId, status, order);

            // Trigger notification
            this.logger.log(`[WHATSAPP MOCK] Status changed: Olá ${order.customer.name}, seu pedido #${order.orderNumber} agora está: ${status}!`);
          } catch (err) {
            this.logger.warn(`Simulator failed to update order ${orderId}: ${err.message}`);
            break;
          }
        }
      },
      { connection: connectionOpts },
    );
    worker2.on('error', () => {});
  }

  async dispatchWhatsApp(to: string, message: string) {
    if (this.isRedisConnected && this.notificationQueue) {
      await this.notificationQueue.add('whatsapp', { type: 'WhatsApp', to, message });
    } else {
      this.logger.log(`[FALLBACK WHATSAPP] To: ${to} -> ${message}`);
    }
  }

  async startLifecycleSimulation(orderId: string, tenantId: string) {
    if (this.isRedisConnected && this.simulationQueue) {
      await this.simulationQueue.add('simulate', { orderId, tenantId });
      this.logger.log(`Queued simulation lifecycle for order ${orderId}`);
    } else {
      // Fallback in-memory timer if Redis is down
      this.logger.log(`Running in-memory status simulator for order ${orderId}`);
      this.runInMemorySimulation(orderId, tenantId);
    }
  }

  private async runInMemorySimulation(orderId: string, tenantId: string) {
    const statuses = ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'];
    for (const status of statuses) {
      await new Promise((res) => setTimeout(res, 10000));
      try {
        const order = await this.prisma.order.update({
          where: { id: orderId },
          data: { status: status as any, paymentStatus: status === 'DELIVERED' ? 'PAID' : undefined },
          include: { customer: true, items: { include: { product: true } } },
        });
        this.realtimeGateway.notifyOrderStatusChanged(tenantId, orderId, status, order);
      } catch (err) {
        break;
      }
    }
  }
}
