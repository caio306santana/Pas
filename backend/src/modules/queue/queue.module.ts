import { Module, Global } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrismaService } from '../../prisma.service';

@Global()
@Module({
  imports: [RealtimeModule],
  providers: [QueueService, PrismaService],
  exports: [QueueService],
})
export class QueueModule {}
