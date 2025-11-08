const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

exports.setupSocketHandlers = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      logger.error('Socket authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId}`);

    // Join user-specific room
    socket.join(`user_${socket.userId}`);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });

    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });
};
