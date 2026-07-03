import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  connect: (url: string) => void;
  disconnect: () => void;
  joinOrderRoom: (orderId: string) => void;
  joinAdminRoom: (tenantId: string) => void;
  joinKitchenRoom: (tenantId: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => {
  return {
    socket: null,
    isConnected: false,

    connect: (url) => {
      if (get().socket) return;

      const socketInstance = io(url, {
        transports: ['websocket'],
      });

      socketInstance.on('connect', () => {
        set({ isConnected: true });
        console.log('Socket.IO connection established.');
      });

      socketInstance.on('disconnect', () => {
        set({ isConnected: false });
        console.log('Socket.IO connection lost.');
      });

      set({ socket: socketInstance });
    },

    disconnect: () => {
      const { socket } = get();
      if (socket) {
        socket.disconnect();
        set({ socket: null, isConnected: false });
      }
    },

    joinOrderRoom: (orderId) => {
      const { socket } = get();
      if (socket) {
        socket.emit('joinOrder', { orderId });
      }
    },

    joinAdminRoom: (tenantId) => {
      const { socket } = get();
      if (socket) {
        socket.emit('joinTenantAdmin', { tenantId });
      }
    },

    joinKitchenRoom: (tenantId) => {
      const { socket } = get();
      if (socket) {
        socket.emit('joinTenantKitchen', { tenantId });
      }
    },
  };
});
