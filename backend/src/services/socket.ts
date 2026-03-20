import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

let io: SocketIOServer;

export function initSocketServer(server: http.Server): SocketIOServer {
  io = new SocketIOServer(server, { cors: { origin: '*' } });

  // JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('未授权'));
    try {
      jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      next(new Error('未授权'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIo(): SocketIOServer {
  return io;
}
