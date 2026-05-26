import { RoomMapper } from './room-mapper.js';

export interface QuantMessage {
  conversationId: string;
  senderId: string;
  content: string;
}

export interface MatrixEvent {
  roomId: string;
  sender: string;
  content: string;
}

export interface ForwardedMessage {
  direction: 'quant-to-matrix' | 'matrix-to-quant';
  source: string;
  destination: string;
  content: string;
  timestamp: number;
}

export class MatrixBridgeBot {
  private roomMapper: RoomMapper;
  private forwardedMessages: ForwardedMessage[] = [];
  private autoCreateRooms: boolean;

  constructor(roomMapper?: RoomMapper, options?: { autoCreateRooms?: boolean }) {
    this.roomMapper = roomMapper ?? new RoomMapper();
    this.autoCreateRooms = options?.autoCreateRooms ?? true;
  }

  onQuantMessage(message: QuantMessage): void {
    let matrixRoom = this.roomMapper.getMatrixRoom(message.conversationId);

    if (!matrixRoom && this.autoCreateRooms) {
      matrixRoom = `!auto-${message.conversationId}:matrix.local`;
      this.roomMapper.createMapping(message.conversationId, matrixRoom, 'dm');
    }

    if (matrixRoom) {
      this.forwardedMessages.push({
        direction: 'quant-to-matrix',
        source: message.conversationId,
        destination: matrixRoom,
        content: message.content,
        timestamp: Date.now(),
      });
    }
  }

  onMatrixMessage(event: MatrixEvent): void {
    const quantConv = this.roomMapper.getQuantConversation(event.roomId);

    if (quantConv) {
      this.forwardedMessages.push({
        direction: 'matrix-to-quant',
        source: event.roomId,
        destination: quantConv,
        content: event.content,
        timestamp: Date.now(),
      });
    }
  }

  getForwardedMessages(): ForwardedMessage[] {
    return [...this.forwardedMessages];
  }

  getRoomMapper(): RoomMapper {
    return this.roomMapper;
  }
}
