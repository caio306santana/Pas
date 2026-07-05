import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [RealtimeModule],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService],
})
export class PaymentModule {}
