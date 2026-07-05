import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrderModule } from './modules/order/order.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { QueueModule } from './modules/queue/queue.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    TenantModule,
    AuthModule,
    MenuModule,
    OrderModule,
    RealtimeModule,
    QueueModule,
    PaymentModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
