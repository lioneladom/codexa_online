import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class MonitoringGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinExam')
  handleJoinExam(client: Socket, payload: { examId: string; userType: string; name: string }) {
    client.join(`exam-${payload.examId}`);
    this.server.to(`exam-${payload.examId}`).emit('userJoined', {
      id: client.id,
      name: payload.name,
      userType: payload.userType,
    });
  }

  @SubscribeMessage('sendActivity')
  handleSendActivity(
    client: Socket,
    payload: { examId: string; activity: string; data?: any },
  ) {
    this.server.to(`exam-${payload.examId}`).emit('activity', {
      clientId: client.id,
      activity: payload.activity,
      data: payload.data,
      timestamp: new Date(),
    });
  }

  sendActivityToExam(examId: string, activity: string, data: any) {
    if (this.server) {
      this.server.to(`exam-${examId}`).emit('activity', {
        activity,
        data,
        timestamp: new Date(),
      });
    }
  }
}
