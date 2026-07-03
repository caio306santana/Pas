import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [RealtimeModule, QueueModule],
  controllers: [OrderController],
  providers: [OrderService, PrismaService],
  exports: [OrderService],
})
export class OrderModule {}
