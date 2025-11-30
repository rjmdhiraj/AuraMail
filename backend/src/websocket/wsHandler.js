/**
 * WebSocket Handler
 * Real-time communication for voice feedback
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const clients = new Map();

/**
 * Setup WebSocket server
 */
export const setupWebSocket = (wss) => {
  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const clientInfo = {
      id: clientId,
      ws,
      ip: req.socket.remoteAddress,
      connectedAt: new Date(),
      isAlive: true,
    };

    clients.set(clientId, clientInfo);
    logger.info(`WebSocket client connected: ${clientId} from ${clientInfo.ip}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to Voice Email WebSocket',
      clientId,
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(clientId, message);
      } catch (error) {
        logger.error(`WebSocket message parse error from ${clientId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    // Handle pong responses (heartbeat)
    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle disconnection
    ws.on('close', (code, reason) => {
      logger.info(`WebSocket client disconnected: ${clientId}, code: ${code}`);
      clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  // Heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = Array.from(clients.values()).find(c => c.ws === ws);
      
      if (client && !client.isAlive) {
        logger.warn(`Terminating inactive WebSocket client: ${client.id}`);
        return ws.terminate();
      }

      if (client) {
        client.isAlive = false;
        ws.ping();
      }
    });
  }, 30000); // Check every 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  logger.info('WebSocket server initialized');
};

/**
 * Handle client messages
 */
const handleClientMessage = (clientId, message) => {
  const client = clients.get(clientId);
  if (!client) return;

  logger.info(`WebSocket message from ${clientId}: ${message.type}`);

  switch (message.type) {
    case 'ping':
      client.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
      }));
      break;

    case 'voice-status':
      // Handle voice status updates
      broadcastToClient(clientId, {
        type: 'voice-status-ack',
        status: message.status,
      });
      break;

    case 'subscribe':
      // Subscribe to specific events
      if (!client.subscriptions) {
        client.subscriptions = [];
      }
      if (message.events && Array.isArray(message.events)) {
        client.subscriptions.push(...message.events);
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          events: message.events,
        }));
      }
      break;

    case 'unsubscribe':
      // Unsubscribe from events
      if (client.subscriptions && message.events) {
        client.subscriptions = client.subscriptions.filter(
          event => !message.events.includes(event)
        );
        client.ws.send(JSON.stringify({
          type: 'unsubscribed',
          events: message.events,
        }));
      }
      break;

    default:
      client.ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`,
      }));
  }
};

/**
 * Broadcast message to specific client
 */
export const broadcastToClient = (clientId, data) => {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === 1) { // OPEN
    client.ws.send(JSON.stringify(data));
  }
};

/**
 * Broadcast to all connected clients
 */
export const broadcastToAll = (data, eventType = null) => {
  let count = 0;
  
  clients.forEach((client) => {
    // If eventType specified, only send to subscribed clients
    if (eventType && client.subscriptions && !client.subscriptions.includes(eventType)) {
      return;
    }

    if (client.ws.readyState === 1) { // OPEN
      client.ws.send(JSON.stringify(data));
      count++;
    }
  });

  logger.info(`Broadcast message sent to ${count} clients`);
};

/**
 * Send voice feedback to client
 */
export const sendVoiceFeedback = (clientId, text, type = 'info') => {
  broadcastToClient(clientId, {
    type: 'voice-feedback',
    text,
    feedbackType: type,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send email notification to client
 */
export const sendEmailNotification = (clientId, emailData) => {
  broadcastToClient(clientId, {
    type: 'email-notification',
    email: emailData,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get connected clients count
 */
export const getConnectedClientsCount = () => {
  return clients.size;
};

/**
 * Get client info
 */
export const getClientInfo = (clientId) => {
  const client = clients.get(clientId);
  if (!client) return null;

  return {
    id: client.id,
    ip: client.ip,
    connectedAt: client.connectedAt,
    subscriptions: client.subscriptions || [],
  };
};

export default {
  setupWebSocket,
  broadcastToClient,
  broadcastToAll,
  sendVoiceFeedback,
  sendEmailNotification,
  getConnectedClientsCount,
  getClientInfo,
};
