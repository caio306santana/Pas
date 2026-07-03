import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Socket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket client disconnected: ${client.id}`);
  }

  // Join a tenant channel (e.g., admin board)
  @SubscribeMessage('joinTenantAdmin')
  handleJoinTenantAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    client.join(`tenant_${data.tenantId}_admin`);
    console.log(`Client ${client.id} joined admin room for tenant: ${data.tenantId}`);
    return { status: 'joined_admin' };
  }

  // Join a kitchen room
  @SubscribeMessage('joinTenantKitchen')
  handleJoinTenantKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    client.join(`tenant_${data.tenantId}_kitchen`);
    console.log(`Client ${client.id} joined kitchen room for tenant: ${data.tenantId}`);
    return { status: 'joined_kitchen' };
  }

  // Join an order specific room (for customer tracking)
  @SubscribeMessage('joinOrder')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.join(`order_${data.orderId}`);
    console.log(`Client ${client.id} joined tracking room for order: ${data.orderId}`);
    return { status: 'joined_order' };
  }

  // Broadcast events helper
  notifyNewOrder(tenantId: string, order: any) {
    this.server.to(`tenant_${tenantId}_admin`).emit('newOrder', order);
    this.server.to(`tenant_${tenantId}_kitchen`).emit('newOrder', order);
  }

  notifyOrderStatusChanged(tenantId: string, orderId: string, status: string, order: any) {
    // Notify customer
    this.server.to(`order_${orderId}`).emit('statusChanged', { orderId, status, order });
    // Notify admin
    this.server.to(`tenant_${tenantId}_admin`).emit('orderStatusUpdated', { orderId, status, order });
    // Notify kitchen
    this.server.to(`tenant_${tenantId}_kitchen`).emit('orderStatusUpdated', { orderId, status, order });
  }
}
