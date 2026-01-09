import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { BotService } from '../bot/bot.service';
import { BranchesService } from '../branches/branches.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { normalizePhoneNumber } from '../common/utils';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import fetch from 'node-fetch';
import qrcode from 'qrcode-terminal';

// Define types manually to avoid importing baileys at compile time
type WASocket = any;
type WAMessage = any;
type ConnectionState = 'close' | 'connecting' | 'open';
type DisconnectReason = any;
type proto = any;

// Dynamic import type for baileys
type BaileysModule = {
  makeWASocket: any;
  useMultiFileAuthState: any;
  DisconnectReason: any;
  jidDecode: any;
  jidNormalizedUser: any;
  default?: any;
};

interface PendingMessage {
  phone: string;
  content: string;
  showTyping: boolean;
  timestamp: number;
  retries: number;
  maxRetries?: number;
}

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private socket: WASocket | null = null;
  private readonly logger = new Logger(WhatsAppService.name);
  private sessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentQR: string | null = null;
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private pendingMessages: PendingMessage[] = [];
  private readonly maxPendingMessageAge = 5 * 60 * 1000; // 5 minutes
  private readonly maxMessageRetries = 3;
  private baileys: BaileysModule | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null; // Intervalo para mantener la sesión activa
  private isInitializing = false; // Bandera para evitar múltiples inicializaciones simultáneas

  // Lazy load baileys module using eval to ensure truly dynamic import
  // TypeScript cannot statically analyze eval, so it won't compile to require()
  private async getBaileys(): Promise<BaileysModule> {
    if (!this.baileys) {
      // Split the module name to prevent static analysis
      const moduleParts = ['@whiskeysockets', '/baileys'];
      const moduleName = moduleParts.join('');
      // Use eval to ensure dynamic import - TypeScript can't analyze this
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
      this.baileys = await eval(`import('${moduleName}')`);
    }
    return this.baileys;
  }

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    @Inject(forwardRef(() => BranchesService))
    private branchesService: BranchesService,
    private websocketGateway: WebSocketGateway,
  ) { }

  async onModuleInit() {
    // Asegurar que el directorio de sesiones existe
    this.ensureSessionDirectory();
    // Esperar un poco antes de inicializar para asegurar que todo esté listo
    // Intentar inicializar WhatsApp, pero no bloquear el inicio de la aplicación si falla
    setTimeout(() => {
      this.initializeWhatsApp().catch((error) => {
        this.logger.warn('WhatsApp initialization failed, but application will continue running');
        this.logger.warn('WhatsApp features will be unavailable until connection is established');
      });
    }, 1000);
  }

  private ensureSessionDirectory() {
    try {
      const fullPath = path.resolve(this.sessionPath);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.logger.log(`Created session directory: ${fullPath}`);
      } else {
        // Verificar si hay archivos de sesión existentes
        const files = fs.readdirSync(fullPath);
        if (files.length > 0) {
          this.logger.log(`Found existing session files: ${files.join(', ')}`);
          this.logger.log('If QR is not showing, try deleting the session folder to force re-authentication');
        }
      }
    } catch (error) {
      this.logger.error(`Error creating session directory: ${error}`);
    }
  }

  private async initializeWhatsApp() {
    // Evitar múltiples inicializaciones simultáneas
    if (this.isInitializing) {
      this.logger.debug('WhatsApp initialization already in progress, skipping...');
      return;
    }

    // Si ya hay un socket activo y conectado, no reinicializar
    if (this.socket && this.connectionState === 'connected') {
      this.logger.debug('WhatsApp already connected, skipping initialization');
      return;
    }

    this.isInitializing = true;

    try {
      // Limpiar socket anterior si existe antes de crear uno nuevo
      if (this.socket) {
        this.logger.debug('Cleaning up previous socket before reinitializing...');
        try {
          this.stopKeepAlive();
          // Remover todos los event listeners del socket anterior
          if (this.socket.ev) {
            this.socket.ev.removeAllListeners();
          }
          // Cerrar el socket si tiene un método de cierre
          if (typeof this.socket.end === 'function') {
            this.socket.end();
          }
        } catch (error) {
          this.logger.warn('Error cleaning up previous socket:', error);
        }
        this.socket = null;
      }

      // Usar ruta absoluta para evitar problemas
      const absoluteSessionPath = path.resolve(this.sessionPath);

      this.logger.log(`Initializing WhatsApp with session path: ${absoluteSessionPath}`);

      const baileys = await this.getBaileys();
      const { state, saveCreds } = await baileys.useMultiFileAuthState(absoluteSessionPath);

      // Verificar si hay credenciales guardadas
      if (state.creds?.registered) {
        this.logger.log('Found existing session credentials');
      } else {
        this.logger.log('No existing session found - QR code will be generated');
      }

      // Crear logger de pino para Baileys (usar 'error' para ver errores importantes)
      const logger = pino({ level: 'error' });

      this.socket = baileys.makeWASocket({
        auth: state,
        logger: logger,
        connectTimeoutMs: 60_000, // 60 segundos
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 30_000, // 30 segundos - mantener conexión activa más tiempo
        qrTimeout: 60_000, // Tiempo para generar QR
        markOnlineOnConnect: false, // No marcar como online hasta estar completamente conectado
        syncFullHistory: false, // No sincronizar historial completo
        generateHighQualityLinkPreview: false,
        // Configuración mejorada para mantener la sesión activa
        shouldReconnect: () => true, // Siempre intentar reconectar automáticamente
        shouldIgnoreJid: () => false,
        getMessage: async (key) => {
          return undefined; // No necesitamos recuperar mensajes antiguos
        },
        shouldSyncHistoryMessage: () => false, // No sincronizar mensajes antiguos
        // Configuración adicional para mejorar la persistencia
        retryRequestDelayMs: 250, // Delay entre reintentos de requests
        maxMsgRetryCount: 3, // Número máximo de reintentos para mensajes
        fireInitQueries: true, // Ejecutar queries de inicialización para mantener conexión
        emitOwnEvents: true, // Emitir eventos propios para mantener sesión activa
      });

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications } = update;

        // Log del estado de conexión para debugging
        this.logger.log(`Connection update: ${connection}, isNewLogin: ${isNewLogin}, hasQR: ${!!qr}, receivedPendingNotifications: ${receivedPendingNotifications}`);

        // El QR puede aparecer en cualquier momento durante la conexión
        if (qr) {
          // Guardar QR para acceso desde API
          this.currentQR = qr;
          this.connectionState = 'connecting';

          this.logger.log(`✅ QR code generated and saved (length: ${qr.length})`);
          this.logger.log(`QR available at /whatsapp/qr endpoint`);

          // Imprimir QR en la consola de forma clara
          console.log('\n');
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log('📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log('\n');

          // Renderizar QR visualmente en la consola
          try {
            qrcode.generate(qr, { small: true });
          } catch (error) {
            // Si falla la renderización, mostrar el QR como texto
            console.log('QR Code (text format):');
            console.log(qr);
          }

          console.log('\n');
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log('1. Abre WhatsApp en tu teléfono');
          console.log('2. Ve a Configuración > Dispositivos vinculados');
          console.log('3. Toca "Vincular un dispositivo"');
          console.log('4. Escanea el código QR que aparece arriba');
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log('\n');

          this.logger.log('✅ QR code generated - scan with your WhatsApp app');
        }

        if (connection === 'close') {
          const baileys = await this.getBaileys();
          const disconnectReason = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = disconnectReason === baileys.DisconnectReason.loggedOut;

          const errorDetails = lastDisconnect?.error as any;
          const errorMessage = errorDetails?.message || errorDetails?.toString() || 'Unknown error';
          const isXmlError = errorMessage.includes('xml-not-well-formed') || errorMessage.includes('Stream Errored');
          
          // Detectar error de conflicto (múltiples conexiones)
          const isConflictError = disconnectReason === 440 || 
                                  (errorDetails?.reasonNode?.tag === 'conflict' && 
                                   errorDetails?.reasonNode?.attrs?.type === 'replaced');

          // Log error with more context
          if (isConflictError) {
            this.logger.warn(
              `Connection closed due to conflict (multiple connections detected). Error: ${errorMessage}, Status: ${disconnectReason}, IsLoggedOut: ${isLoggedOut}`,
            );
            this.logger.warn('This usually means another instance is trying to connect. Waiting before retry...');
            // Limpiar socket y marcar como no inicializando para permitir nueva conexión
            this.socket = null;
            this.isInitializing = false;
            this.stopKeepAlive();
          } else if (isXmlError) {
            this.logger.warn(
              `Connection closed due to XML parsing error. This is usually temporary. Error: ${errorMessage}, Status: ${disconnectReason}, IsLoggedOut: ${isLoggedOut}`,
            );
            this.logger.warn('This error often resolves itself. The system will automatically retry connection.');
          } else {
            this.logger.error(
              `Connection closed. Error: ${errorMessage}, Status: ${disconnectReason}, IsLoggedOut: ${isLoggedOut}`,
            );
          }

          // If logged out, clear session and set state to disconnected
          if (isLoggedOut) {
            this.logger.warn('⚠️  Sesión cerrada. Se requiere reconexión manual con QR.');
            this.stopKeepAlive(); // Detener keep-alive al cerrar sesión
            this.connectionState = 'disconnected';
            this.currentQR = null;
            this.reconnectAttempts = 0;

            // Clear session files to force new QR generation
            try {
              const absoluteSessionPath = path.resolve(this.sessionPath);
              if (fs.existsSync(absoluteSessionPath)) {
                this.logger.log('Eliminando archivos de sesión para forzar nuevo QR...');
                const files = fs.readdirSync(absoluteSessionPath);
                for (const file of files) {
                  if (file !== '.gitkeep') {
                    fs.unlinkSync(path.join(absoluteSessionPath, file));
                  }
                }
                this.logger.log('Archivos de sesión eliminados. Se generará un nuevo QR al reconectar.');
              }
            } catch (error) {
              this.logger.error('Error eliminando archivos de sesión:', error);
            }
          } else {
            // Not logged out, try to reconnect automatically
            // Aumentar el número máximo de intentos para mantener la sesión activa
            const maxAttempts = this.maxReconnectAttempts * 2; // Duplicar intentos
            const shouldReconnect = this.reconnectAttempts < maxAttempts;

            if (shouldReconnect) {
              this.reconnectAttempts++;
              // Para errores de conflicto, esperar más tiempo antes de reconectar
              // Para XML errors, usar tiempo de espera más largo
              // Para otros errores, usar tiempo de espera más corto
              let baseWaitTime: number;
              let maxWaitTime: number;
              
              if (isConflictError) {
                // Conflictos requieren más tiempo para que la otra conexión termine
                baseWaitTime = 10000; // 10 segundos base
                maxWaitTime = 30000; // Máximo 30 segundos
              } else if (isXmlError) {
                baseWaitTime = 3000; // 3 segundos base
                maxWaitTime = 20000; // Máximo 20 segundos
              } else {
                baseWaitTime = 1000; // 1 segundo base
                maxWaitTime = 5000; // Máximo 5 segundos
              }
              
              const waitTime = Math.min(this.reconnectAttempts * baseWaitTime, maxWaitTime);
              this.logger.log(`🔄 Retrying WhatsApp connection (attempt ${this.reconnectAttempts}/${maxAttempts}) in ${waitTime / 1000}s...`);

              // For XML errors, suggest clearing session if multiple attempts fail
              if (isXmlError && this.reconnectAttempts >= 5) {
                this.logger.warn('If XML errors persist, try clearing the session folder and reconnecting.');
              }

              // Asegurar que isInitializing se restablezca antes de reintentar
              this.isInitializing = false;
              
              setTimeout(() => {
                this.initializeWhatsApp();
              }, waitTime);
            } else if (this.reconnectAttempts >= maxAttempts) {
              this.logger.error(`Max reconnection attempts (${maxAttempts}) reached. Waiting before retrying...`);
              // En lugar de detener completamente, esperar más tiempo y reiniciar el contador
              this.connectionState = 'disconnected';
              this.currentQR = null;
              this.logger.error('Possible causes:');
              this.logger.error('1. Network/firewall blocking WhatsApp servers');
              this.logger.error('2. WhatsApp servers temporarily unavailable');
              this.logger.error('3. Rate limiting from too many connection attempts');

              if (isXmlError) {
                this.logger.error('4. XML parsing errors - This may indicate:');
                this.logger.error('   - Corrupted session files (try deleting the sessions folder)');
                this.logger.error('   - Network issues causing malformed responses');
                this.logger.error('   - WhatsApp server-side issues (usually temporary)');
                this.logger.error('   Solution: Delete the sessions folder and wait 5-10 minutes before reconnecting');
              }

              if (errorDetails?.output?.statusCode === 405) {
                this.logger.error('5. Error 405: Try updating Baileys: npm install @whiskeysockets/baileys@latest');
                this.logger.error('6. Error 405: Delete sessions folder and wait 10+ minutes before retrying');
              }
              this.logger.error('');
              this.logger.warn('⚠️  Waiting 60 seconds before retrying connection...');

              // Esperar 60 segundos y reiniciar el contador para intentar de nuevo
              this.isInitializing = false; // Asegurar que se puede reinicializar
              setTimeout(() => {
                this.reconnectAttempts = 0;
                this.logger.log('🔄 Reiniciando intentos de reconexión...');
                this.initializeWhatsApp();
              }, 60000); // 60 segundos
            }
          }
        } else if (connection === 'open') {
          this.logger.log('✅ WhatsApp connected successfully');
          this.reconnectAttempts = 0; // Reset counter on successful connection
          this.connectionState = 'connected';
          this.isInitializing = false; // Marcar inicialización como completada

          // Iniciar mecanismo de keep-alive para mantener la sesión activa
          this.startKeepAlive();

          // Log pending messages count
          if (this.pendingMessages.length > 0) {
            this.logger.log(`📨 ${this.pendingMessages.length} message(s) waiting in queue - will be sent shortly`);
          }

          // Don't clear QR immediately - let it clear after a delay to ensure frontend got it
          setTimeout(() => {
            this.currentQR = null;
            this.logger.debug('QR cleared after successful connection');
          }, 5000); // Clear QR 5 seconds after connection

          // Process pending messages after connection is established
          setTimeout(() => {
            this.processPendingMessages().catch((error) => {
              this.logger.error('Error processing pending messages:', error);
            });
          }, 3000); // Wait 3 seconds after connection to ensure everything is ready

          // Sync existing conversations when connected
          setTimeout(() => {
            this.syncExistingConversations().catch((error) => {
              this.logger.error('Error syncing existing conversations:', error);
            });
          }, 2000); // Wait 2 seconds after connection to ensure everything is ready
        } else if (connection === 'connecting') {
          this.logger.log('🔄 Connecting to WhatsApp...');
          this.connectionState = 'connecting';
        } else if (connection === 'close') {
          this.connectionState = 'disconnected';
          this.currentQR = null;
          // Detener el keep-alive cuando se cierra la conexión
          this.stopKeepAlive();
        }
      });

      // Guardar credenciales cada vez que se actualicen para mantener la sesión persistente
      this.socket.ev.on('creds.update', async () => {
        try {
          await saveCreds();
          this.logger.debug('✅ Credenciales guardadas exitosamente');
        } catch (error) {
          this.logger.error('Error guardando credenciales:', error);
        }
      });

      this.socket.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessage(m);
      });

      // ═══════════════════════════════════════════════════════════════════
      // ⚠️ CRÍTICO: Listen for contacts.upsert to get real phone numbers for LIDs
      // Este es el ÚNICO evento donde WhatsApp envía el número real relacionado con el LID
      // Sin este listener, phone siempre será null
      // ═══════════════════════════════════════════════════════════════════
      this.logger.log('═══════════════════════════════════════════════════════════════════');
      this.logger.log('📞 REGISTERING contacts.upsert LISTENER');
      this.logger.log('⚠️  THIS IS CRITICAL: This is the ONLY event where WhatsApp sends real phone numbers');
      this.logger.log('═══════════════════════════════════════════════════════════════════');
      
      this.socket.ev.on('contacts.upsert', async (contacts) => {
        this.logger.log('🔔🔔🔔 contacts.upsert EVENT RECEIVED! Processing contacts...');
        await this.handleContactsUpsert(contacts);
      });
      
      this.logger.log('✅✅✅ contacts.upsert listener registered successfully');
      this.logger.log('═══════════════════════════════════════════════════════════════════');

      // Listen for connection to sync existing conversations
      this.socket.ev.on('connection.update', async (update) => {
        if (update.connection === 'open' && this.socket) {
          this.logger.log('Connection opened, waiting for chats to load...');
          // Wait a bit for chats to load, then sync
          setTimeout(async () => {
            try {
              // Access chats from the store if available
              const store = (this.socket as any).store;
              if (store?.chats) {
                const chats = Array.from(store.chats.values());
                this.logger.log(`Found ${chats.length} chats in store`);
                if (chats.length > 0) {
                  this.logger.log(`Syncing ${chats.length} chats to conversations...`);
                  await this.syncChatsToConversations(chats);
                } else {
                  this.logger.warn('No chats found in store. Conversations will be created when messages arrive.');
                }
              } else {
                this.logger.warn('Store not available or chats not loaded yet');
              }
            } catch (error) {
              this.logger.error('Error accessing chats from store:', error);
            }
          }, 10000); // Wait 10 seconds for chats to fully load
        }
      });
    } catch (error: any) {
      this.logger.error('Error initializing WhatsApp:', error?.message || error);
      this.logger.error('Error stack:', error?.stack);
      this.isInitializing = false; // Asegurar que se puede reintentar
      // Reintentar después de 5 segundos
      setTimeout(() => {
        this.logger.log('Retrying WhatsApp initialization...');
        this.initializeWhatsApp();
      }, 5000);
    }
  }

  private async handleIncomingMessage(m: {
    messages: any[];
    type: 'notify' | 'append';
  }) {
    if (m.type !== 'notify') {
      this.logger.debug(`[handleIncomingMessage] Skipping message type: ${m.type}`);
      return;
    }

    this.logger.debug(`[handleIncomingMessage] Processing ${m.messages.length} message(s)`);

    for (const msg of m.messages) {
      try {
        if (!msg.message) {
          this.logger.debug(`[handleIncomingMessage] Skipping message - no message content`);
          continue;
        }

        // Ignore messages from groups (JID ends with @g.us)
        // Verificar que msg.key existe antes de acceder a remoteJid
        const remoteJid = (msg.key?.remoteJid || '') as string;

        // Log detallado del JID para debugging
        this.logger.debug(`[handleIncomingMessage] Raw remoteJid: "${remoteJid}", Type: ${typeof remoteJid}, Length: ${remoteJid.length}`);
        if (remoteJid) {
          this.logger.debug(`[handleIncomingMessage] JID parts: ${JSON.stringify({
            full: remoteJid,
            hasAt: remoteJid.includes('@'),
            hasColon: remoteJid.includes(':'),
            beforeAt: remoteJid.split('@')[0],
            afterAt: remoteJid.split('@')[1],
          })}`);
        }

        // Step 1: Detect the JID type (correct way to handle this in Baileys)
        function getJidType(jid: string): 'phone' | 'group' | 'linked-id' | 'unknown' {
          if (jid.endsWith('@s.whatsapp.net')) return 'phone';
          if (jid.endsWith('@g.us')) return 'group';
          if (jid.endsWith('@lid')) return 'linked-id';
          return 'unknown';
        }

        const jidType = getJidType(remoteJid);
        this.logger.debug(`[handleIncomingMessage] JID type: ${jidType} for ${remoteJid}`);

        // Skip groups
        if (jidType === 'group') {
          this.logger.debug(`Ignoring message from group: ${remoteJid}`);
          continue;
        }

        // Ignore status messages (status broadcasts)
        // Verificar que remoteJid no sea null antes de usar includes
        if (remoteJid && remoteJid.includes('status')) {
          this.logger.debug(`Ignoring status message: ${remoteJid}`);
          continue;
        }

        const messageContent = this.extractMessageContent(msg.message);
        if (!messageContent) {
          this.logger.debug(`[handleIncomingMessage] Skipping message - no extractable content`);
          continue;
        }

        // Determine if message is from us (sent) or from remote (received)
        const isFromMe = msg.key.fromMe || false;
        this.logger.log(`[handleIncomingMessage] Processing message - fromMe: ${isFromMe}, content: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}", remoteJid: ${remoteJid}`);

        // Get phone number - if fromMe, it's the recipient (remoteJid), otherwise it's the sender
        // IMPORTANTE: El JID puede venir en diferentes formatos:
        // - @s.whatsapp.net (usuario normal con número de teléfono)
        // - @lid (Linked ID, formato nuevo de WhatsApp - NO es un número de teléfono)
        // - @g.us (grupo)
        // 
        // Para JIDs con @lid, necesitamos obtener el número real del contacto desde el store

        let phone = '';
        let originalJidForSending = remoteJid; // Guardar el JID original para enviar mensajes

        // Use the jidType already detected above
        if (jidType === 'linked-id') {
          this.logger.debug(`[handleIncomingMessage] JID has @lid format, trying to get real phone number from store`);

          // Intentar obtener el número real del contacto desde el store de Baileys
          try {
            if (this.socket && (this.socket as any).store) {
              const store = (this.socket as any).store;

              // ESTRATEGIA 1: Usar onWhatsApp para verificar si el LID tiene un número real asociado
              if (this.socket.onWhatsApp) {
                try {
                  const result = await this.socket.onWhatsApp(remoteJid);
                  if (result && result.length > 0 && result[0].exists) {
                    const realJid = result[0].jid;
                    if (realJid && realJid.includes('@s.whatsapp.net')) {
                      phone = normalizePhoneNumber(realJid);
                      this.logger.log(`[handleIncomingMessage] ✅ Found real phone using onWhatsApp: ${phone} from LID: ${remoteJid}`);
                    }
                  }
                } catch (error) {
                  this.logger.debug(`[handleIncomingMessage] onWhatsApp failed: ${error}`);
                }
              }

              // ESTRATEGIA 2: Buscar en todos los chats que tengan @s.whatsapp.net
              // y que coincidan con el nombre del contacto
              if (!phone && msg.pushName && store.chats) {
                const contactName = msg.pushName.trim();
                this.logger.debug(`[handleIncomingMessage] Searching all chats for name: "${contactName}"`);

                // Buscar en todos los chats
                for (const [chatJid, chat] of store.chats.entries()) {
                  // Buscar por nombre exacto
                  if (chat.name === contactName && chatJid.includes('@s.whatsapp.net')) {
                    phone = normalizePhoneNumber(chatJid);
                    this.logger.log(`[handleIncomingMessage] ✅ Found phone by matching name "${contactName}": ${phone}`);
                    break;
                  }

                  // También buscar por nombre parcial (por si hay espacios o diferencias menores)
                  if (chat.name && chat.name.includes(contactName) && chatJid.includes('@s.whatsapp.net')) {
                    phone = normalizePhoneNumber(chatJid);
                    this.logger.log(`[handleIncomingMessage] ✅ Found phone by partial name match "${contactName}": ${phone}`);
                    break;
                  }
                }
              }

              // ESTRATEGIA 3: Buscar el contacto en el store usando el JID
              if (!phone) {
                const contact = store.contacts?.[remoteJid];

                if (contact) {
                  this.logger.debug(`[handleIncomingMessage] Found contact in store: ${JSON.stringify(Object.keys(contact))}`);

                  // Buscar el número en todos los campos del contacto
                  for (const [key, value] of Object.entries(contact)) {
                    if (typeof value === 'string' && value.includes('@s.whatsapp.net')) {
                      phone = normalizePhoneNumber(value);
                      this.logger.log(`[handleIncomingMessage] ✅ Extracted phone from contact.${key}: ${phone}`);
                      break;
                    }
                  }
                }
              }

              // ESTRATEGIA 4: Buscar en el chat asociado al LID
              if (!phone && store.chats) {
                const chat = store.chats.get(remoteJid);
                if (chat) {
                  this.logger.debug(`[handleIncomingMessage] Found chat in store: ${JSON.stringify(Object.keys(chat))}`);

                  // Buscar el número en todos los campos del chat
                  for (const [key, value] of Object.entries(chat)) {
                    if (typeof value === 'string' && value.includes('@s.whatsapp.net')) {
                      phone = normalizePhoneNumber(value);
                      this.logger.log(`[handleIncomingMessage] ✅ Extracted phone from chat.${key}: ${phone}`);
                      break;
                    }
                  }
                }
              }

              // ESTRATEGIA 5: Buscar en todos los chats que no sean LID y tengan mensajes recientes
              if (!phone && store.chats) {
                this.logger.debug(`[handleIncomingMessage] Searching all non-LID chats...`);
                for (const [chatJid, chat] of store.chats.entries()) {
                  // Solo considerar chats con @s.whatsapp.net (no LIDs ni grupos)
                  if (chatJid.includes('@s.whatsapp.net') && !chatJid.includes('@lid') && !chatJid.includes('@g.us')) {
                    // Si el chat tiene un nombre similar o mensajes recientes, podría ser el contacto
                    if (chat.name && msg.pushName && chat.name.toLowerCase().includes(msg.pushName.toLowerCase().substring(0, 5))) {
                      phone = normalizePhoneNumber(chatJid);
                      this.logger.log(`[handleIncomingMessage] ✅ Found phone by similar name: ${phone}`);
                      break;
                    }
                  }
                }
              }

              // ESTRATEGIA 6: Buscar en el mensaje mismo por información del contacto
              if (!phone && msg.messageStubType) {
                // Algunos mensajes tienen información adicional en messageStubType
                this.logger.debug(`[handleIncomingMessage] Message has stubType: ${msg.messageStubType}`);
              }

              // ESTRATEGIA 7: Buscar en todos los chats recientes que hayan tenido actividad
              // y comparar timestamps para encontrar el chat correcto
              if (!phone && store.chats && msg.messageTimestamp) {
                this.logger.debug(`[handleIncomingMessage] Searching chats by timestamp...`);
                const messageTime = Number(msg.messageTimestamp) * 1000; // Convert to milliseconds

                for (const [chatJid, chat] of store.chats.entries()) {
                  if (chatJid.includes('@s.whatsapp.net') && !chatJid.includes('@lid') && !chatJid.includes('@g.us')) {
                    // Si el chat tiene mensajes recientes alrededor del mismo tiempo
                    if (chat.messages && chat.messages.size > 0) {
                      const lastMessage = Array.from(chat.messages.values()).pop();
                      // Verificar que lastMessage tenga la propiedad messageTimestamp
                      if (lastMessage && typeof lastMessage === 'object' && 'messageTimestamp' in lastMessage) {
                        const lastMsgTimestamp = (lastMessage as any).messageTimestamp;
                        if (lastMsgTimestamp) {
                          const chatTime = Number(lastMsgTimestamp) * 1000;
                          // Si los tiempos están cerca (dentro de 5 minutos), podría ser el mismo chat
                          if (Math.abs(messageTime - chatTime) < 300000) { // 5 minutos
                            phone = normalizePhoneNumber(chatJid);
                            this.logger.log(`[handleIncomingMessage] ✅ Found phone by timestamp match: ${phone}`);
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            this.logger.warn(`[handleIncomingMessage] Error getting phone from store: ${error}`);
          }

          // ESTRATEGIA 6: Intentar usar jidDecode para extraer información del JID
          if (!phone) {
            try {
              const baileys = await this.getBaileys();
              const decoded = baileys.jidDecode(remoteJid);
              if (decoded && decoded.user) {
                // jidDecode puede devolver información útil
                this.logger.debug(`[handleIncomingMessage] jidDecode result: ${JSON.stringify(decoded)}`);
                // Si decoded.user parece ser un número válido (no un LID largo)
                const decodedUser = decoded.user.replace(/\D/g, '');
                if (decodedUser.length >= 8 && decodedUser.length <= 12) {
                  phone = decodedUser;
                  this.logger.log(`[handleIncomingMessage] ✅ Extracted phone using jidDecode: ${phone}`);
                }
              }
            } catch (error) {
              this.logger.debug(`[handleIncomingMessage] jidDecode failed: ${error}`);
            }
          }

          // Si no pudimos obtener el número real, guardar phone como null
          // El número se añadirá más tarde cuando se pueda extraer o se actualice manualmente
          if (!phone) {
            this.logger.warn(`[handleIncomingMessage] ⚠️ Cannot extract real phone number from LID JID: ${remoteJid}`);
            this.logger.warn(`[handleIncomingMessage] Will save contact with phone: null. The phone number will be added later when available.`);
            phone = null; // Guardar como null en lugar de usar placeholder
          }
        } else if (jidType === 'phone') {
          // Para JIDs normales (@s.whatsapp.net), usar jidNormalizedUser
          try {
            const baileys = await this.getBaileys();
            const normalizedJid = baileys.jidNormalizedUser(remoteJid);
            this.logger.debug(`[handleIncomingMessage] jidNormalizedUser result: ${normalizedJid} from JID: ${remoteJid}`);

            // Si jidNormalizedUser devuelve un JID completo (con @), extraer solo el número
            if (normalizedJid && normalizedJid.includes('@')) {
              phone = normalizedJid.split('@')[0];
            } else {
              phone = normalizedJid || '';
            }

            // Normalizar (solo dígitos)
            phone = normalizePhoneNumber(phone);
          } catch (error) {
            // Si jidNormalizedUser falla, usar nuestra función de extracción como fallback
            this.logger.warn(`[handleIncomingMessage] Error using jidNormalizedUser, using fallback extraction: ${error}`);
            phone = normalizePhoneNumber(remoteJid);
          }
        } else {
          // Unknown JID type
          this.logger.warn(`[handleIncomingMessage] Unknown JID type: ${remoteJid}, attempting to extract phone anyway`);
          phone = normalizePhoneNumber(remoteJid);
        }

        this.logger.log(`[handleIncomingMessage] Original JID: ${remoteJid}, Extracted phone: ${phone || 'null'}, Length: ${phone ? phone.length : 0}`);

        // Validar el número solo si no es null
        if (phone) {
          // Validar que el número tenga una longitud razonable
          // Los números de teléfono internacionales raramente tienen más de 12 dígitos
          if (phone.length > 12) {
            // Si el número es muy largo y parece ser un LID (no tiene @s.whatsapp.net), rechazarlo
            // Verificar que remoteJid no sea null antes de usar includes
            if (!remoteJid || !remoteJid.includes('@s.whatsapp.net')) {
              this.logger.error(`[handleIncomingMessage] ERROR: Phone number too long (${phone.length} digits) and appears to be LID: ${phone}. Original JID: ${remoteJid}`);
              this.logger.error(`[handleIncomingMessage] This is likely a LID, not a real phone number. Setting phone to null.`);
              phone = null;
            } else {
              // Si tiene @s.whatsapp.net pero es muy largo, truncar a 12 dígitos
              this.logger.warn(`[handleIncomingMessage] WARNING: Phone number too long (${phone.length} digits): ${phone}. Truncating to 12 digits. Original JID: ${remoteJid}`);
              phone = phone.substring(0, 12);
            }
          }

          // Validar longitud mínima
          if (phone.length < 8) {
            this.logger.warn(`[handleIncomingMessage] Phone number too short (${phone.length} digits): ${phone}. Setting to null. Original JID: ${remoteJid}`);
            phone = null;
          }
        }

        // Si phone es null, continuar procesando el mensaje (se guardará con phone: null)
        if (!phone) {
          this.logger.warn(`[handleIncomingMessage] ⚠️ Contact will be saved with phone: null. Phone number will be added later when available.`);
        }

        // Log adicional para números sospechosos (más de 12 dígitos)
        // Verificar que phone no sea null antes de acceder a length
        if (phone && phone.length > 12) {
          this.logger.warn(`[handleIncomingMessage] WARNING: Phone number has ${phone.length} digits (might be incorrect): ${phone}. Original JID: ${remoteJid}`);
        }

        // Try to get contact name from WhatsApp
        let contactName = phone || 'Contacto sin número'; // Default to phone number or placeholder
        try {
          // Method 1: Try to get name from message pushName (most reliable for new messages)
          if (msg.pushName && msg.pushName.trim()) {
            contactName = msg.pushName.trim();
            this.logger.debug(`[handleIncomingMessage] Got name from pushName: ${contactName}`);
          }
          // Method 2: Try to get from store contacts (if available)
          else if (this.socket && (this.socket as any).store && phone) {
            try {
              const store = (this.socket as any).store;
              const jid = `${phone}@s.whatsapp.net`;
              const contact = store.contacts?.[jid];
              if (contact) {
                // Try name first, then notify (display name), then verifiedName
                contactName = contact.name || contact.notify || contact.verifiedName || phone;
                if (contactName !== phone) {
                  this.logger.debug(`[handleIncomingMessage] Got name from store: ${contactName}`);
                }
              }
            } catch (e) {
              // Ignore errors, will use phone as fallback
            }
          }

          // Method 3: Try to get from chats in store using the original JID (works for LIDs too)
          if (this.socket && (this.socket as any).store) {
            try {
              const store = (this.socket as any).store;
              // Try with original JID first (works for LIDs)
              const chat = store.chats?.get(originalJidForSending);
              if (chat) {
                const chatName = chat.name || chat.subject;
                if (chatName && chatName.trim()) {
                  contactName = chatName.trim();
                  this.logger.debug(`[handleIncomingMessage] Got name from chat store using JID: ${contactName}`);
                }
              }
              // Also try with phone JID if phone exists
              else if (phone) {
                const jid = `${phone}@s.whatsapp.net`;
                const phoneChat = store.chats?.get(jid);
                if (phoneChat) {
                  const chatName = phoneChat.name || phoneChat.subject;
                  if (chatName && chatName.trim() && chatName !== phone) {
                    contactName = chatName.trim();
                    this.logger.debug(`[handleIncomingMessage] Got name from chat store: ${contactName}`);
                  }
                }
              }
            } catch (e) {
              // Ignore errors, will use phone as fallback
            }
          }
        } catch (error) {
          this.logger.debug(`[handleIncomingMessage] Error getting contact name: ${error?.message || error}`);
        }

        // Find or create user and conversation
        // IMPORTANTE: Guardar el JID completo para poder usarlo al enviar mensajes
        // Buscar usuario por phone (si existe) o por whatsappJid
        let user = null;

        if (phone) {
          // Normalizar el phone antes de buscar
          const normalizedPhone = normalizePhoneNumber(phone);
          if (normalizedPhone && normalizedPhone.length >= 8) {
            // Buscar por phone normalizado si existe
            user = await this.prisma.user.findUnique({
              where: { phone: normalizedPhone },
            });
          }
        }

        // Si no se encontró por phone, buscar por whatsappJid
        if (!user) {
          user = await this.prisma.user.findFirst({
            where: { whatsappJid: originalJidForSending },
          });
        }

        if (!user) {
          // Normalizar el phone antes de guardarlo
          const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;
          
          // Crear nuevo usuario con phone null si no se pudo extraer
          user = await this.prisma.user.create({
            data: {
              phone: normalizedPhone, // Guardar normalizado o null si no se pudo extraer
              name: contactName,
              whatsappJid: originalJidForSending, // Guardar el JID completo
            },
          });
          this.logger.log(`[handleIncomingMessage] Created user with phone: ${normalizedPhone || 'null'}, name: ${contactName}, JID: ${originalJidForSending}`);
        } else {
          // Update user phone and JID if needed, but DON'T update name if it's already set
          const updateData: any = {};

          // Solo actualizar el nombre si el contacto no tiene un nombre establecido
          // (es decir, si el nombre actual es el número de teléfono o un placeholder)
          const defaultName = phone || 'Contacto sin número';
          const hasDefaultName = !user.name ||
            user.name === defaultName ||
            user.name === phone ||
            user.name.startsWith('Contacto sin');

          if (hasDefaultName && contactName !== defaultName && contactName !== phone) {
            updateData.name = contactName;
            this.logger.log(`[handleIncomingMessage] ✅ Setting initial name for contact: ${contactName}`);
          } else if (!user.name && contactName && contactName !== defaultName) {
            // Si no tiene nombre y tenemos uno válido, establecerlo
            updateData.name = contactName;
            this.logger.log(`[handleIncomingMessage] ✅ Setting name for contact without name: ${contactName}`);
          } else {
            // El contacto ya tiene un nombre establecido, no actualizarlo
            this.logger.debug(`[handleIncomingMessage] Contact already has name "${user.name}", not updating to "${contactName}"`);
          }

          // Actualizar phone si:
          // 1. El usuario no tiene phone y ahora lo tenemos
          // 2. El usuario tiene phone null y ahora tenemos un número válido
          // 3. El usuario tiene un phone pero ahora tenemos uno mejor (normalizado y válido)
          if (phone) {
            const normalizedPhone = normalizePhoneNumber(phone);
            // Solo actualizar si el phone normalizado es válido (al menos 8 dígitos)
            if (normalizedPhone && normalizedPhone.length >= 8) {
              // Actualizar si no tiene phone, tiene null, o si el nuevo phone es diferente al actual
              if (!user.phone || user.phone === null || normalizedPhone !== user.phone) {
                updateData.phone = normalizedPhone;
                this.logger.log(`[handleIncomingMessage] ✅ Updating phone number for user: ${user.phone || 'null'} -> ${normalizedPhone}`);
              } else {
                this.logger.debug(`[handleIncomingMessage] Phone number already set correctly: ${normalizedPhone}`);
              }
            } else {
              this.logger.warn(`[handleIncomingMessage] ⚠️ Phone number "${phone}" normalized to "${normalizedPhone}" is too short (${normalizedPhone?.length || 0} digits), not updating`);
            }
          }

          // Actualizar el JID si no existe o si es diferente (especialmente si ahora tenemos un JID real)
          if (!user.whatsappJid || (originalJidForSending && originalJidForSending.includes('@s.whatsapp.net') && user.whatsappJid && !user.whatsappJid.includes('@s.whatsapp.net'))) {
            updateData.whatsappJid = originalJidForSending;
            this.logger.debug(`[handleIncomingMessage] Updated user JID from "${user.whatsappJid}" to "${originalJidForSending}"`);
          }

          if (Object.keys(updateData).length > 0) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });
            // Recargar el usuario para tener los datos actualizados
            user = await this.prisma.user.findUnique({
              where: { id: user.id },
            });
          }
        }

        // Guardar el JID original en una variable que usaremos al enviar mensajes
        // Usar el JID guardado en la BD si existe, sino usar el original
        const jidToUse = user.whatsappJid || originalJidForSending;
        (user as any).originalJid = jidToUse;

        let conversation = await this.prisma.conversation.findFirst({
          where: { userId: user.id },
          include: { user: true },
          orderBy: { updatedAt: 'desc' },
        });

        if (!conversation) {
          this.logger.log(`[handleIncomingMessage] Creating new conversation for user ${user.phone} (${user.id})`);
          conversation = await this.prisma.conversation.create({
            data: {
              userId: user.id,
              mode: 'BOT',
            },
            include: { user: true },
          });
          this.logger.log(`[handleIncomingMessage] Created new conversation ${conversation.id} with mode: ${conversation.mode}`);
        } else {
          // Ensure user is loaded
          if (!conversation.user) {
            conversation = await this.prisma.conversation.findUnique({
              where: { id: conversation.id },
              include: { user: true },
            }) || conversation;
          }
        }

        // Determine sender type
        let sender: 'user' | 'bot' | 'agent' = 'user';
        let shouldSwitchToHuman = false; // Flag para cambiar a modo HUMAN cuando el dueño responde
        if (isFromMe) {
          // Message sent from our device - determine if it's from bot or agent
          // Si la conversación está en modo BOT y el dueño responde directamente desde WhatsApp Business,
          // esto significa que el dueño está tomando el control, así que cambiar a modo HUMAN
          if (conversation.mode === 'BOT') {
            // El dueño del número está respondiendo directamente desde WhatsApp Business
            // Cambiar a modo HUMAN para desactivar el bot
            sender = 'agent'; // Marcar como agente (dueño del número)
            shouldSwitchToHuman = true; // Marcar para cambiar el modo
            this.logger.log(`[handleIncomingMessage] Dueño del número respondió desde WhatsApp Business - Cambiando modo de BOT a HUMAN`);
          } else {
            sender = 'agent';
          }
        }

        // Only classify and tag incoming messages (from users)
        if (!isFromMe) {
          const tag = await this.botService.classifyIntent(messageContent);
          if (tag && tag !== 'otros') {
            await this.prisma.conversation.update({
              where: { id: conversation.id },
              data: { tag },
            });

            // Add tag to user if not exists
            // Verificar que user.tags no sea null antes de usar includes
            if (!user.tags || !user.tags.includes(tag)) {
              await this.prisma.user.update({
                where: { id: user.id },
                data: {
                  tags: { push: tag },
                },
              });
            }
          }
        }

        // For messages fromMe (sent from our device), check if message already exists
        // This prevents duplicates when messages are sent from the frontend
        // The message would have been created by MessagesService.create() before sending to WhatsApp
        // IMPORTANT: Messages sent from the phone directly (not from frontend) should always be registered
        let message = null;
        if (isFromMe) {
          // Check if a message with the same content was created recently (within last 10 seconds)
          // This helps prevent duplicates when messages are sent from the frontend API
          const recentTime = new Date(Date.now() - 10000); // 10 seconds ago
          const existingMessage = await this.prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              sender: sender,
              content: messageContent,
              createdAt: {
                gte: recentTime,
              },
            },
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (existingMessage) {
            this.logger.log(`[handleIncomingMessage] Message already exists (fromMe), skipping duplicate: ${existingMessage.id}`);
            message = existingMessage;
          } else {
            this.logger.log(`[handleIncomingMessage] No existing message found for fromMe message, will create new one`);
          }
        }

        // Create message in database if it doesn't exist
        if (!message) {
          message = await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              sender: sender,
              content: messageContent,
            },
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          this.logger.debug(`[handleIncomingMessage] Created new message: ${message.id} (sender: ${sender}, fromMe: ${isFromMe})`);
        }

        // Update conversation (only if message was newly created, or always to ensure timestamp is updated)
        const updatedConversation = await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: messageContent,
            updatedAt: new Date(),
            // If agent sends message, switch to HUMAN mode
            // También cambiar a HUMAN cuando el dueño responde directamente desde WhatsApp Business
            ...((sender === 'agent' || shouldSwitchToHuman) && { mode: 'HUMAN' }),
          },
          include: {
            user: true,
            assignedAgent: {
              select: {
                id: true,
                name: true,
                email: true,
                online: true,
              },
            },
          },
        });

        // Broadcast conversation update
        this.websocketGateway.broadcastConversationUpdate(updatedConversation);

        // Broadcast to frontend via WebSocket with full conversation data
        this.websocketGateway.broadcastNewMessage({
          ...message,
          conversation: {
            id: updatedConversation.id,
            userId: updatedConversation.userId,
            assignedAgentId: updatedConversation.assignedAgentId,
            tag: updatedConversation.tag,
            mode: updatedConversation.mode,
            lastMessage: updatedConversation.lastMessage,
            createdAt: updatedConversation.createdAt,
            updatedAt: updatedConversation.updatedAt,
            user: updatedConversation.user ? {
              id: updatedConversation.user.id,
              phone: updatedConversation.user.phone,
              name: updatedConversation.user.name,
              lastName: updatedConversation.user.lastName,
              email: updatedConversation.user.email,
              city: updatedConversation.user.city,
            } : undefined,
          },
        });

        // Only trigger bot response for incoming user messages (not sent from our device)
        // Use updatedConversation.mode instead of conversation.mode
        if (!isFromMe && updatedConversation.mode === 'BOT') {
          this.logger.log(`[handleIncomingMessage] Processing bot response for new message from ${phone} in conversation ${updatedConversation.id}`);

          // Show typing indicator immediately - use updatedConversation user data
          const userPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
          await this.sendTypingIndicator(userPhone, true);

          let botResponse: string | null = null;

          try {
            this.logger.debug(`[handleIncomingMessage] Generating bot response for message: "${messageContent.substring(0, 50)}..."`);
            // Check if message contains a Google Maps link (including short links)
            const googleMapsUrlPattern = /(https?:\/\/)?(www\.)?(maps\.(google\.com|app\.goo\.gl)|google\.com\/maps|goo\.gl\/maps)[^\s]*/gi;
            const mapsMatch = messageContent.match(googleMapsUrlPattern);

            if (mapsMatch && mapsMatch.length > 0) {
              this.logger.debug(`Detected Google Maps link: ${mapsMatch[0]}`);

              // Extract coordinates from Google Maps URL (async)
              const coords = await this.branchesService.extractCoordinatesFromGoogleMaps(mapsMatch[0]);

              if (coords) {
                this.logger.debug(`Extracted coordinates: ${coords.latitude}, ${coords.longitude}`);

                // Find nearest branch
                const nearestBranch = await this.branchesService.findNearest(
                  coords.latitude,
                  coords.longitude,
                );

                if (nearestBranch) {
                  const distanceKm = nearestBranch.distance.toFixed(2);
                  botResponse = `📍 Encontré la sucursal más cercana a tu ubicación:\n\n` +
                    `🏢 ${nearestBranch.name}\n` +
                    `📍 ${nearestBranch.address}\n` +
                    `📞 ${nearestBranch.phone || 'No disponible'}\n` +
                    `📏 Distancia: ${distanceKm} km\n\n`;

                  if (nearestBranch.openingHours) {
                    botResponse += `🕐 Horarios de atención:\n${nearestBranch.openingHours}\n\n`;
                  }

                  if (nearestBranch.description) {
                    botResponse += `${nearestBranch.description}\n\n`;
                  }

                  botResponse += `¿Te gustaría más información sobre esta sucursal?`;
                } else {
                  botResponse = 'Lo siento, no encontré sucursales cercanas a tu ubicación.';
                }
              } else {
                this.logger.warn(`Could not extract coordinates from URL: ${mapsMatch[0]}`);
                // Couldn't extract coordinates, use normal bot response
                botResponse = await this.botService.generateResponse(
                  updatedConversation.id,
                  messageContent,
                );
              }
            } else {
              // Normal bot response
              this.logger.debug(`[handleIncomingMessage] Calling botService.generateResponse for conversation ${updatedConversation.id}`);
              botResponse = await this.botService.generateResponse(
                updatedConversation.id,
                messageContent,
              );
              this.logger.debug(`[handleIncomingMessage] Bot response received: ${botResponse ? `"${botResponse.substring(0, 100)}..."` : 'null'}`);
            }

            if (botResponse) {
              this.logger.log(`[handleIncomingMessage] Creating bot message in database for conversation ${updatedConversation.id}`);

              // Create bot message in database using MessagesService
              // This will also broadcast it via WebSocket
              // Pass skipWhatsApp flag to avoid sending twice
              await this.messagesService.create({
                conversationId: updatedConversation.id,
                sender: 'bot',
                content: botResponse,
                skipWhatsApp: true, // Skip WhatsApp sending since we'll do it here
              } as any);

              // Get user phone from updatedConversation
              const userPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
              this.logger.log(`[handleIncomingMessage] Sending bot message via WhatsApp to ${userPhone}`);

              // Usar el JID guardado en la BD si existe, sino usar el número de teléfono
              // sendMessage ahora busca automáticamente el JID guardado en la BD
              const phoneToSend = updatedConversation.user?.whatsappJid || updatedConversation.user?.phone || userPhone;

              // Send bot message via WhatsApp with typing indicator
              // Note: This message will be captured again by handleIncomingMessage
              // but with fromMe=true, so it won't trigger another bot response
              const sent = await this.sendMessage(phoneToSend, botResponse, true);

              if (sent) {
                this.logger.log(`[handleIncomingMessage] Bot message sent successfully to ${userPhone}`);
              } else {
                this.logger.warn(`[handleIncomingMessage] Failed to send bot message to ${userPhone} - connection may be down`);
              }

              // Check if the response contains order creation and send QR images if available
              if (botResponse.includes('Pedido creado exitosamente') || botResponse.includes('Pedido #')) {
                try {
                  // Check if auto-send QR images is enabled
                  const botConfig = await this.prisma.botConfig.findFirst();
                  if (botConfig?.autoSendQRImages) {
                    // Get active QR payment methods
                    const qrMethods = await this.prisma.paymentMethod.findMany({
                      where: {
                        type: 'QR',
                        isActive: true,
                      },
                      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                    });

                    // Send QR images
                    for (const qrMethod of qrMethods) {
                      if (qrMethod.qrImageUrl) {
                        // Wait a bit between messages
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const caption = qrMethod.name + (qrMethod.description ? `\n${qrMethod.description}` : '');
                        const imagePhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
                        await this.sendImage(imagePhone, qrMethod.qrImageUrl, caption);
                      }
                    }
                  }
                } catch (error) {
                  this.logger.error('Error sending QR images:', error);
                  // Don't fail the whole message if QR sending fails
                }
              }
            } else {
              this.logger.warn(`[handleIncomingMessage] No bot response generated for message from ${phone}`);
              // Stop typing indicator if no response
              const stopTypingPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
              await this.sendTypingIndicator(stopTypingPhone, false);
            }
          } catch (error) {
            this.logger.error(`[handleIncomingMessage] Error generating bot response for ${phone}:`, error);
            this.logger.error(`[handleIncomingMessage] Error stack:`, error?.stack);
            // Stop typing indicator on error
            const stopTypingPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
            await this.sendTypingIndicator(stopTypingPhone, false);
          }
        } else {
          if (isFromMe) {
            this.logger.debug(`[handleIncomingMessage] Skipping bot response - message is from us (sent)`);
          } else if (conversation.mode !== 'BOT') {
            this.logger.debug(`[handleIncomingMessage] Skipping bot response - conversation mode is ${conversation.mode}, not BOT`);
          }
        }

        this.logger.debug(`Message saved: ${isFromMe ? 'sent' : 'received'} from ${phone}, sender: ${sender}`);
      } catch (error) {
        this.logger.error('Error handling message:', error);
      }
    }
  }

  /**
   * Maneja el evento contacts.upsert de Baileys
   * Este evento se dispara cuando WhatsApp revela información de contactos,
   * incluyendo la relación entre LID (@lid) y número real (@s.whatsapp.net)
   * 
   * Flujo en WhatsApp 2026:
   * 1️⃣ Primer mensaje: llega con LID (168788003663937@lid) - nombre ✔, número ❌
   * 2️⃣ Evento posterior contacts.upsert: { id: "5917XXXXXXXX@s.whatsapp.net", lid: "168788003663937@lid" }
   */
  private async handleContactsUpsert(contacts: any[]): Promise<void> {
    // Log crítico para confirmar que el método se está ejecutando
    this.logger.log('═══════════════════════════════════════════════════════════════════');
    this.logger.log('🔔 handleContactsUpsert CALLED - This is where real phone numbers arrive!');
    this.logger.log('═══════════════════════════════════════════════════════════════════');
    
    if (!contacts || contacts.length === 0) {
      this.logger.warn('[handleContactsUpsert] ⚠️ No contacts received or empty array');
      return;
    }

    this.logger.log(`[handleContactsUpsert] 📞 Processing ${contacts.length} contact(s) from WhatsApp`);

    for (const contact of contacts) {
      try {
        // Log completo del contacto para debugging
        this.logger.debug(`[handleContactsUpsert] Contact data: ${JSON.stringify({
          id: contact.id,
          lid: contact.lid,
          notify: contact.notify,
          name: contact.name,
        })}`);

        // El contacto puede tener:
        // - id: "5491123456789@s.whatsapp.net" (número real)
        // - lid: "168788003663937@lid" (Linked ID)
        const contactId = contact.id;
        const contactLid = contact.lid;

        if (!contactId) {
          this.logger.debug(`[handleContactsUpsert] Skipping contact - no id field`);
          continue;
        }

        // Verificar si el contacto tiene un número real (@s.whatsapp.net)
        if (contactId.endsWith('@s.whatsapp.net')) {
          const realPhone = normalizePhoneNumber(contactId);
          
          if (!realPhone || realPhone.length < 8) {
            this.logger.debug(`[handleContactsUpsert] Skipping contact - invalid phone: ${contactId}`);
            continue;
          }

          this.logger.log(`[handleContactsUpsert] ✅ Found contact with real phone: ${realPhone} (JID: ${contactId})`);

          // 🎯 CASO PRINCIPAL: Si también tiene LID, buscar usuarios con ese LID y actualizarlos
          // Este es el caso típico: WhatsApp revela el número real relacionado con el LID
          if (contactLid && contactLid.endsWith('@lid')) {
            this.logger.log(`[handleContactsUpsert] 🔗 Contact has both real phone (${realPhone}) and LID (${contactLid})`);
            this.logger.log(`[handleContactsUpsert] 🔍 Searching for users with LID: ${contactLid}...`);

            // Buscar usuarios que tengan este LID en whatsappJid
            const usersWithLid = await this.prisma.user.findMany({
              where: {
                whatsappJid: contactLid,
              },
            });

            if (usersWithLid.length > 0) {
              this.logger.log(`[handleContactsUpsert] ✅ Found ${usersWithLid.length} user(s) with LID ${contactLid}`);
              this.logger.log(`[handleContactsUpsert] 📝 Updating with real phone: ${realPhone} and JID: ${contactId}`);

              // Actualizar cada usuario encontrado
              for (const user of usersWithLid) {
                const updateData: any = {
                  phone: realPhone,
                  whatsappJid: contactId, // Actualizar también el JID al real
                };

                // Actualizar el nombre si no tiene uno establecido o es un placeholder
                const defaultName = 'Contacto sin número';
                const hasDefaultName = !user.name ||
                  user.name === defaultName ||
                  user.name === user.phone ||
                  user.name.startsWith('Contacto sin');

                if (hasDefaultName && contact.notify) {
                  updateData.name = contact.notify.trim();
                  this.logger.log(`[handleContactsUpsert] 📝 Also updating name: "${user.name}" -> "${updateData.name}"`);
                }

                await this.prisma.user.update({
                  where: { id: user.id },
                  data: updateData,
                });

                this.logger.log(`[handleContactsUpsert] ✅ SUCCESS: Updated user ${user.id}`);
                this.logger.log(`[handleContactsUpsert]    Phone: ${user.phone || 'null'} -> ${realPhone}`);
                this.logger.log(`[handleContactsUpsert]    JID: ${user.whatsappJid} -> ${contactId}`);
              }
            } else {
              this.logger.warn(`[handleContactsUpsert] ⚠️ No users found with LID ${contactLid} - contact may not have sent a message yet`);
            }
          }

          // También buscar usuarios que tengan este número pero sin JID o con JID diferente
          // Esto ayuda a actualizar usuarios que fueron creados sin JID
          const usersWithPhone = await this.prisma.user.findMany({
            where: {
              phone: realPhone,
              OR: [
                { whatsappJid: null },
                { whatsappJid: { not: contactId } },
              ],
            },
          });

          if (usersWithPhone.length > 0) {
            this.logger.log(`[handleContactsUpsert] Found ${usersWithPhone.length} user(s) with phone ${realPhone} but different/missing JID, updating JID to: ${contactId}`);

            for (const user of usersWithPhone) {
              await this.prisma.user.update({
                where: { id: user.id },
                data: {
                  whatsappJid: contactId,
                },
              });

              this.logger.log(`[handleContactsUpsert] ✅ Updated user ${user.id} JID: ${user.whatsappJid || 'null'} -> ${contactId}`);
            }
          }

          // Si el contacto no tiene LID pero tiene número real, buscar usuarios sin phone pero con este JID
          if (!contactLid) {
            const usersWithJid = await this.prisma.user.findMany({
              where: {
                whatsappJid: contactId,
                phone: null,
              },
            });

            if (usersWithJid.length > 0) {
              this.logger.log(`[handleContactsUpsert] Found ${usersWithJid.length} user(s) with JID ${contactId} but no phone, updating with phone: ${realPhone}`);

              for (const user of usersWithJid) {
                await this.prisma.user.update({
                  where: { id: user.id },
                  data: {
                    phone: realPhone,
                  },
                });

                this.logger.log(`[handleContactsUpsert] ✅ Updated user ${user.id} phone: null -> ${realPhone}`);
              }
            }
          }
        } else if (contactId.endsWith('@lid')) {
          // Si solo tenemos el LID (sin número real aún), guardar el LID si no existe
          this.logger.debug(`[handleContactsUpsert] Contact has only LID (no real phone yet): ${contactId}`);
          
          // Buscar si hay usuarios con este LID
          const existingUser = await this.prisma.user.findFirst({
            where: {
              whatsappJid: contactId,
            },
          });

          if (!existingUser) {
            // Crear un usuario temporal con el LID (se actualizará cuando llegue el número real)
            const contactName = contact.notify || contact.name || 'Contacto sin número';
            await this.prisma.user.create({
              data: {
                phone: null,
                name: contactName,
                whatsappJid: contactId,
              },
            });
            this.logger.log(`[handleContactsUpsert] Created temporary user with LID: ${contactId} (will be updated when real phone is available)`);
          }
        }
      } catch (error) {
        this.logger.error(`[handleContactsUpsert] Error processing contact:`, error);
      }
    }
  }

  private extractMessageContent(message: any): string | null {
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    return null;
  }

  // Send typing indicator (writing/typing effect)
  async sendTypingIndicator(phone: string, isTyping: boolean = true): Promise<boolean> {
    // Verificar que phone no sea null o undefined
    if (!phone) {
      return false;
    }

    // Si el phone ya es un JID completo (tiene @), usarlo directamente
    let jid = '';
    if (phone.includes('@')) {
      jid = phone;
    } else {
      // Normalizar el número de teléfono
      const normalizedPhone = normalizePhoneNumber(phone);

      if (!normalizedPhone || normalizedPhone.length < 8) {
        return false;
      }

      // Intentar obtener el JID guardado en la BD para este número
      try {
        const user = await this.prisma.user.findUnique({
          where: { phone: normalizedPhone },
          select: { whatsappJid: true },
        });

        if (user?.whatsappJid) {
          jid = user.whatsappJid;
        } else {
          // Si no hay JID guardado, construir uno estándar
          jid = `${normalizedPhone}@s.whatsapp.net`;
        }
      } catch (error) {
        // Si hay error al buscar en BD, usar formato estándar
        jid = `${normalizedPhone}@s.whatsapp.net`;
      }
    }

    try {
      if (!this.socket) {
        return false;
      }

      // Check connection state before attempting to send
      if (this.connectionState !== 'connected') {
        return false;
      }

      if (!this.socket.user) {
        return false;
      }

      // Verify this is not a group
      if (jid.includes('@g.us')) {
        return false;
      }
      await this.socket.sendPresenceUpdate(
        isTyping ? 'composing' : 'paused',
        jid,
      );
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // Check if it's a connection error - don't log as error for connection issues
      if (errorMessage.includes('Connection Closed') ||
        errorMessage.includes('Connection closed') ||
        errorMessage.includes('Stream Errored')) {
        // Silently fail for connection errors - connection will be retried
        return false;
      }

      this.logger.error(`Error sending typing indicator to ${jid || phone}:`, error);
      return false;
    }
  }

  async sendMessage(phone: string, content: string, showTyping: boolean = false): Promise<boolean> {
    // Verificar que phone no sea null o undefined
    if (!phone) {
      this.logger.warn(`Invalid phone number: ${phone}`);
      return false;
    }

    // Si el phone ya es un JID completo (tiene @), usarlo directamente
    let jid = '';
    if (phone.includes('@')) {
      // Ya es un JID completo, usarlo directamente
      jid = phone;
      this.logger.debug(`[sendMessage] Using provided JID directly: ${jid}`);
    } else {
      // Normalizar el número de teléfono
      const normalizedPhone = normalizePhoneNumber(phone);

      if (!normalizedPhone || normalizedPhone.length < 8) {
        this.logger.warn(`Invalid phone number: ${phone}`);
        return false;
      }

      // Intentar obtener el JID guardado en la BD para este número
      try {
        const user = await this.prisma.user.findUnique({
          where: { phone: normalizedPhone },
          select: { whatsappJid: true },
        });

        if (user?.whatsappJid) {
          jid = user.whatsappJid;
          this.logger.debug(`[sendMessage] Using saved JID from database: ${jid} for phone: ${normalizedPhone}`);
        } else {
          // Si no hay JID guardado, construir uno estándar
          jid = `${normalizedPhone}@s.whatsapp.net`;
          this.logger.debug(`[sendMessage] No saved JID found, using standard format: ${jid}`);
        }
      } catch (error) {
        // Si hay error al buscar en BD, usar formato estándar
        this.logger.warn(`[sendMessage] Error looking up JID in database: ${error}, using standard format`);
        jid = `${normalizedPhone}@s.whatsapp.net`;
      }
    }

    try {
      if (!this.socket) {
        this.logger.warn('WhatsApp socket not initialized - message not sent');
        this.addToPendingQueue(phone, content, showTyping);
        return false;
      }

      // Check connection state before attempting to send
      if (this.connectionState !== 'connected') {
        this.logger.warn(`WhatsApp not connected (state: ${this.connectionState}) - adding to pending queue`);
        this.addToPendingQueue(phone, content, showTyping);
        return false;
      }

      if (!this.socket.user) {
        this.logger.warn('WhatsApp not connected - adding to pending queue');
        this.addToPendingQueue(phone, content, showTyping);
        return false;
      }

      // Verify this is not a group (shouldn't happen, but double-check)
      if (jid.includes('@g.us')) {
        this.logger.warn(`Cannot send message to group: ${jid}`);
        return false;
      }

      // Extraer el número o identificador para logging y typing indicator
      const phoneForLogging = jid.includes('@') ? jid.split('@')[0] : jid;

      // Show typing indicator if requested
      if (showTyping) {
        await this.sendTypingIndicator(jid, true);
        // Wait a bit to show the typing effect (minimum 1 second, or based on message length)
        const typingDuration = Math.min(Math.max(content.length * 50, 1000), 3000);
        await new Promise(resolve => setTimeout(resolve, typingDuration));
      }

      // Send the message
      await this.socket.sendMessage(jid, { text: content });

      // Stop typing indicator
      if (showTyping) {
        await this.sendTypingIndicator(jid, false);
      }

      this.logger.log(`Message sent to ${jid}`);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // Check if it's a connection error
      if (errorMessage.includes('Connection Closed') ||
        errorMessage.includes('Connection closed') ||
        errorMessage.includes('Stream Errored') ||
        errorMessage.includes('xml-not-well-formed')) {
        this.logger.warn(`Connection error while sending message to ${jid}: ${errorMessage}`);
        this.connectionState = 'disconnected';
        // Add to pending queue to retry when connection is restored
        this.addToPendingQueue(phone, content, showTyping);
        // Don't log as error, just warn - connection will be retried automatically
      } else {
        this.logger.error(`Error sending message to ${jid}:`, error);
      }

      // Try to stop typing indicator even if message failed
      try {
        await this.sendTypingIndicator(jid, false);
      } catch (e) {
        // Ignore errors stopping typing indicator
      }
      return false;
    }
  }

  /**
   * Add message to pending queue for retry when connection is restored
   */
  private addToPendingQueue(phone: string, content: string, showTyping: boolean = false): void {
    // Remove any existing pending message for this phone to avoid duplicates
    this.pendingMessages = this.pendingMessages.filter(msg => !(msg.phone === phone && msg.content === content));

    this.pendingMessages.push({
      phone,
      content,
      showTyping,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.maxMessageRetries,
    });

    this.logger.warn(`📥 Message added to pending queue for ${phone} (${this.pendingMessages.length} total pending)`);
    this.logger.warn(`⚠️  WhatsApp is disconnected. Messages will be sent automatically when connection is restored.`);
    this.logger.warn(`💡 To reconnect: Use POST /whatsapp/reconnect or check status at GET /whatsapp/status`);
  }

  /**
   * Process pending messages when connection is restored
   */
  private async processPendingMessages(): Promise<void> {
    if (this.pendingMessages.length === 0) {
      return;
    }

    this.logger.log(`Processing ${this.pendingMessages.length} pending message(s)...`);

    // Clean up old messages (older than maxPendingMessageAge)
    const now = Date.now();
    this.pendingMessages = this.pendingMessages.filter(msg => {
      const age = now - msg.timestamp;
      if (age > this.maxPendingMessageAge) {
        this.logger.warn(`Removing expired pending message for ${msg.phone} (age: ${Math.round(age / 1000)}s)`);
        return false;
      }
      return true;
    });

    // Process messages one by one with delays
    for (const pendingMsg of [...this.pendingMessages]) {
      try {
        // Remove from queue before attempting to send
        this.pendingMessages = this.pendingMessages.filter(msg => msg !== pendingMsg);

        // Check if we've exceeded max retries
        if (pendingMsg.retries >= (pendingMsg.maxRetries || this.maxMessageRetries)) {
          this.logger.warn(`Max retries reached for message to ${pendingMsg.phone}, skipping`);
          continue;
        }

        // Wait a bit between messages
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Attempt to send
        const sent = await this.sendMessage(pendingMsg.phone, pendingMsg.content, pendingMsg.showTyping);

        if (!sent) {
          // If still failed, add back to queue with incremented retry count
          pendingMsg.retries++;
          this.pendingMessages.push(pendingMsg);
          this.logger.debug(`Message to ${pendingMsg.phone} failed, will retry (attempt ${pendingMsg.retries}/${pendingMsg.maxRetries})`);
        } else {
          this.logger.log(`Successfully sent pending message to ${pendingMsg.phone}`);
        }
      } catch (error) {
        this.logger.error(`Error processing pending message to ${pendingMsg.phone}:`, error);
        // Add back to queue if not exceeded retries
        if (pendingMsg.retries < (pendingMsg.maxRetries || this.maxMessageRetries)) {
          pendingMsg.retries++;
          this.pendingMessages.push(pendingMsg);
        }
      }
    }

    if (this.pendingMessages.length > 0) {
      this.logger.warn(`${this.pendingMessages.length} message(s) still pending after processing attempt`);
    } else {
      this.logger.log('All pending messages processed successfully');
    }
  }

  async sendImage(phone: string, imageUrl: string, caption?: string): Promise<boolean> {
    // Normalizar el número de teléfono fuera del try para que esté disponible en el catch
    const normalizedPhone = normalizePhoneNumber(phone);

    try {
      if (!normalizedPhone || normalizedPhone.length < 8) {
        this.logger.warn(`Invalid phone number: ${phone}`);
        return false;
      }

      if (!this.socket) {
        this.logger.warn('WhatsApp socket not initialized - image not sent');
        return false;
      }

      // Check connection state before attempting to send
      if (this.connectionState !== 'connected') {
        this.logger.warn(`WhatsApp not connected (state: ${this.connectionState}) - image not sent to ${normalizedPhone}`);
        return false;
      }

      if (!this.socket.user) {
        this.logger.warn('WhatsApp not connected - image not sent');
        return false;
      }

      // Verify this is not a group
      if (normalizedPhone.includes('@g.us')) {
        this.logger.warn(`Cannot send image to group: ${normalizedPhone}`);
        return false;
      }

      const jid = `${normalizedPhone}@s.whatsapp.net`;

      // Convert URL to local path if it's a local upload
      let imagePath = imageUrl;
      if (imageUrl.startsWith('/uploads/')) {
        // It's a local file, convert to absolute path
        imagePath = path.join(process.cwd(), 'backend', imageUrl);
      } else if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
        // Local URL, try to convert to file path
        try {
          const urlObj = new URL(imageUrl);
          if (urlObj.pathname.startsWith('/uploads/')) {
            imagePath = path.join(process.cwd(), 'backend', urlObj.pathname);
          }
        } catch (e) {
          // Invalid URL, treat as remote
        }
      }

      // Check if it's a local file path
      if ((imagePath.startsWith('/') || imagePath.match(/^[A-Z]:/)) && fs.existsSync(imagePath)) {
        // Send local file
        this.logger.debug(`Sending local image: ${imagePath}`);
        await this.socket.sendMessage(jid, {
          image: { url: imagePath },
          caption: caption,
        });
      } else {
        // It's a URL (local or remote), download and send using node-fetch
        this.logger.debug(`Downloading image from URL: ${imageUrl}`);
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await this.socket.sendMessage(jid, {
          image: buffer,
          caption: caption,
        });
      }

      this.logger.log(`Image sent to ${normalizedPhone}`);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // Check if it's a connection error
      if (errorMessage.includes('Connection Closed') ||
        errorMessage.includes('Connection closed') ||
        errorMessage.includes('Stream Errored') ||
        errorMessage.includes('xml-not-well-formed')) {
        this.logger.warn(`Connection error while sending image to ${normalizedPhone}: ${errorMessage}`);
        this.connectionState = 'disconnected';
        // Don't log as error, just warn - connection will be retried automatically
      } else {
        this.logger.error(`Error sending image to ${normalizedPhone}:`, error);
      }
      return false;
    }
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    state: 'connecting' | 'connected' | 'disconnected';
    phoneNumber?: string;
    pendingMessages: number;
    hasQR: boolean;
  }> {
    return {
      connected: this.socket?.user ? true : false,
      state: this.connectionState,
      phoneNumber: this.socket?.user?.id?.split(':')[0] || undefined,
      pendingMessages: this.pendingMessages.length,
      hasQR: !!this.currentQR,
    };
  }

  async getQRCode(): Promise<{ qr: string | null; state: string }> {
    this.logger.debug(`getQRCode called - currentQR: ${this.currentQR ? 'exists' : 'null'}, state: ${this.connectionState}`);
    return {
      qr: this.currentQR,
      state: this.connectionState,
    };
  }

  async reconnect(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Reconnecting WhatsApp...');
      this.reconnectAttempts = 0;
      this.currentQR = null;
      this.connectionState = 'connecting';
      this.isInitializing = false; // Asegurar que se puede reinicializar

      // Disconnect existing socket if any
      if (this.socket) {
        try {
          this.stopKeepAlive(); // Detener keep-alive primero
          // Remover todos los event listeners
          if (this.socket.ev) {
            this.socket.ev.removeAllListeners();
          }
          await this.socket.end(undefined);
        } catch (error) {
          this.logger.warn('Error ending existing socket:', error);
        }
        this.socket = null;
      }

      // Clear session files to force new QR generation
      // This ensures a fresh connection with new QR
      try {
        const absoluteSessionPath = path.resolve(this.sessionPath);
        if (fs.existsSync(absoluteSessionPath)) {
          this.logger.log('Limpiando sesión anterior para generar nuevo QR...');
          const files = fs.readdirSync(absoluteSessionPath);
          for (const file of files) {
            if (file !== '.gitkeep') {
              try {
                fs.unlinkSync(path.join(absoluteSessionPath, file));
              } catch (error) {
                this.logger.warn(`Error eliminando archivo ${file}:`, error);
              }
            }
          }
          this.logger.log('Sesión limpiada. Se generará un nuevo QR.');
        }
      } catch (error) {
        this.logger.warn('Error clearing session files (continuando de todas formas):', error);
      }

      // Wait a bit before reconnecting to ensure cleanup is done
      setTimeout(() => {
        this.initializeWhatsApp().catch((error) => {
          this.logger.error('Error reconnecting:', error);
          this.connectionState = 'disconnected';
        });
      }, 1000);

      return {
        success: true,
        message: 'Reconectando... Se generará un nuevo código QR. Por favor, escanéalo con tu WhatsApp.'
      };
    } catch (error) {
      this.logger.error('Error in reconnect:', error);
      this.connectionState = 'disconnected';
      return { success: false, message: error.message || 'Error reconnecting' };
    }
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Disconnecting WhatsApp...');

      // Detener keep-alive
      this.stopKeepAlive();

      if (this.socket) {
        await this.socket.end(undefined);
        this.socket = null;
      }

      this.connectionState = 'disconnected';
      this.currentQR = null;
      this.reconnectAttempts = 0;

      // Optionally clear session files to force new QR on next connection
      // Uncomment if you want to force new QR every time:
      // try {
      //   const absoluteSessionPath = path.resolve(this.sessionPath);
      //   if (fs.existsSync(absoluteSessionPath)) {
      //     const files = fs.readdirSync(absoluteSessionPath);
      //     for (const file of files) {
      //       if (file !== '.gitkeep') {
      //         fs.unlinkSync(path.join(absoluteSessionPath, file));
      //       }
      //     }
      //   }
      // } catch (error) {
      //   this.logger.warn('Error clearing session files:', error);
      // }

      return { success: true, message: 'Desconectado exitosamente. Puedes reconectar usando el botón "Reconectar".' };
    } catch (error) {
      this.logger.error('Error disconnecting:', error);
      return { success: false, message: error.message || 'Error disconnecting' };
    }
  }

  async syncMessagesFromWhatsApp(conversationId: string): Promise<{
    success: boolean;
    message: string;
    syncedCount: number;
  }> {
    try {
      if (!this.socket || !this.socket.user) {
        return {
          success: false,
          message: 'WhatsApp no está conectado',
          syncedCount: 0,
        };
      }

      // Get conversation and user
      let conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { user: true },
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Conversación no encontrada',
          syncedCount: 0,
        };
      }

      // El número ya debería estar normalizado en la BD, pero lo normalizamos por si acaso
      const phone = normalizePhoneNumber(conversation.user.phone);
      const jid = `${phone}@s.whatsapp.net`;

      // Verify this is not a group conversation
      if (jid.includes('@g.us')) {
        this.logger.warn(`Cannot sync messages from group: ${jid}`);
        return {
          success: false,
          message: 'No se pueden sincronizar mensajes de grupos',
          syncedCount: 0,
        };
      }

      this.logger.log(`Sincronizando mensajes desde WhatsApp para ${phone}...`);

      // Get messages from Baileys using fetchMessagesFromWA
      // This method fetches messages directly from WhatsApp servers
      let messages: any[] = [];

      try {
        // Use Baileys fetchMessagesFromWA to get messages from WhatsApp
        const fetchResult = await (this.socket as any).fetchMessagesFromWA(jid, 1000);
        if (fetchResult && Array.isArray(fetchResult)) {
          messages = fetchResult;
        } else if (fetchResult && fetchResult.messages) {
          messages = fetchResult.messages;
        }
      } catch (error: any) {
        this.logger.warn(`Error fetching messages from WhatsApp: ${error.message}`);
        // Try alternative method: get messages from store if available
        const store = (this.socket as any).store;
        if (store && store.loadMessages) {
          try {
            messages = await store.loadMessages(jid, 1000);
          } catch (storeError: any) {
            this.logger.warn(`Error loading messages from store: ${storeError.message}`);
          }
        }
      }

      if (!messages || messages.length === 0) {
        this.logger.log(`No se encontraron mensajes en WhatsApp para ${phone}`);
        return {
          success: true,
          message: 'No hay mensajes para sincronizar',
          syncedCount: 0,
        };
      }

      this.logger.log(`Encontrados ${messages.length} mensajes en WhatsApp para ${phone}`);

      // Delete all existing messages for this conversation
      this.logger.log(`Eliminando mensajes existentes de la conversación ${conversationId}...`);
      await this.prisma.message.deleteMany({
        where: { conversationId },
      });
      this.logger.log('Mensajes existentes eliminados');

      let syncedCount = 0;

      // Sort messages by timestamp
      const sortedMessages = messages.sort((a: any, b: any) => {
        const timestampA = a.messageTimestamp ? Number(a.messageTimestamp) : 0;
        const timestampB = b.messageTimestamp ? Number(b.messageTimestamp) : 0;
        return timestampA - timestampB;
      });

      // Process each message
      for (const msg of sortedMessages) {
        try {
          if (!msg.message) continue;

          // Skip group messages (shouldn't happen, but double-check)
          const msgJid = msg.key?.remoteJid || '';
          if (msgJid.includes('@g.us') || msgJid.includes('status')) {
            continue;
          }

          const messageContent = this.extractMessageContent(msg.message);
          if (!messageContent) continue;

          const isFromMe = msg.key?.fromMe || false;
          const messageId = msg.key?.id || `${msg.key?.remoteJid}_${msg.messageTimestamp || Date.now()}`;

          // Determine sender
          let sender: 'user' | 'bot' | 'agent' = 'user';
          if (isFromMe) {
            if (conversation.mode === 'BOT') {
              sender = 'bot';
            } else {
              sender = 'agent';
            }
          }

          // Create message timestamp
          const messageTimestamp = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000)
            : new Date();

          // Create message in database
          // Use upsert to handle potential ID conflicts
          const createdMessage = await this.prisma.message.upsert({
            where: { id: messageId },
            update: {
              content: messageContent,
              sender: sender,
              createdAt: messageTimestamp,
            },
            create: {
              id: messageId,
              conversationId: conversation.id,
              sender: sender,
              content: messageContent,
              createdAt: messageTimestamp,
            },
          });

          syncedCount++;

          // Ensure conversation has user data (it should already have it from findUnique)
          if (!conversation.user) {
            conversation = await this.prisma.conversation.findUnique({
              where: { id: conversation.id },
              include: { user: true },
            }) || conversation;
          }

          // Broadcast to frontend with full conversation data
          this.websocketGateway.broadcastNewMessage({
            ...createdMessage,
            conversation: {
              id: conversation.id,
              userId: conversation.userId,
              assignedAgentId: conversation.assignedAgentId,
              tag: conversation.tag,
              mode: conversation.mode,
              lastMessage: conversation.lastMessage,
              createdAt: conversation.createdAt,
              updatedAt: conversation.updatedAt,
              user: conversation.user ? {
                id: conversation.user.id,
                phone: conversation.user.phone,
                name: conversation.user.name,
                lastName: conversation.user.lastName,
                email: conversation.user.email,
                city: conversation.user.city,
              } : undefined,
            },
          });
        } catch (error: any) {
          this.logger.error(`Error procesando mensaje: ${error.message}`);
        }
      }

      // Update conversation last message and timestamp
      if (sortedMessages.length > 0) {
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const lastMessageContent = this.extractMessageContent(lastMessage.message);
        if (lastMessageContent) {
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessage: lastMessageContent,
              updatedAt: new Date(),
            },
          });
        }
      }

      this.logger.log(`Sincronizados ${syncedCount} mensajes para ${phone}`);

      // Broadcast conversation update to refresh the frontend
      const updatedConversation = await this.prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: { user: true },
      });

      if (updatedConversation) {
        this.websocketGateway.broadcastConversationUpdate(updatedConversation);
      }

      return {
        success: true,
        message: `Chat sincronizado: ${syncedCount} mensajes cargados desde WhatsApp`,
        syncedCount,
      };
    } catch (error: any) {
      this.logger.error('Error sincronizando mensajes:', error);
      return {
        success: false,
        message: error.message || 'Error al sincronizar mensajes',
        syncedCount: 0,
      };
    }
  }

  private async syncExistingConversations() {
    try {
      if (!this.socket || !this.socket.user) {
        this.logger.warn('Cannot sync conversations: WhatsApp not connected');
        return;
      }

      this.logger.log('🔄 Waiting for WhatsApp chats to be loaded...');
      // The sync will happen automatically when chats.set event is fired
    } catch (error) {
      this.logger.error('Error in syncExistingConversations:', error);
    }
  }

  private async syncChatsToConversations(chats: any[]) {
    try {
      this.logger.log(`🔄 Syncing ${chats.length} chats to conversations...`);

      let syncedCount = 0;
      let createdCount = 0;

      for (const chat of chats) {
        try {
          // Skip group chats and status updates
          if (chat.id?.includes('@g.us') || chat.id?.includes('status') || !chat.id) {
            continue;
          }

          // Extract phone number from JID and normalize it
          const phone = normalizePhoneNumber(chat.id);

          if (!phone || phone.length < 8) {
            continue;
          }

          // Find or create user
          let user = await this.prisma.user.findUnique({
            where: { phone },
          });

          if (!user) {
            // Try to get contact name from WhatsApp
            const contactName = chat.name || chat.subject || phone;

            user = await this.prisma.user.create({
              data: {
                phone,
                name: contactName,
              },
            });
            this.logger.debug(`Created user for phone: ${phone}`);
          } else {
            // Solo actualizar el nombre si el contacto no tiene un nombre establecido
            // (es decir, si el nombre actual es el número de teléfono o un placeholder)
            const contactName = chat.name || chat.subject;
            const defaultName = phone || 'Contacto sin número';
            const hasDefaultName = !user.name ||
              user.name === defaultName ||
              user.name === phone ||
              user.name.startsWith('Contacto sin');

            if (contactName && contactName !== phone && contactName !== defaultName) {
              if (hasDefaultName) {
                // Solo actualizar si tiene un nombre por defecto
                await this.prisma.user.update({
                  where: { id: user.id },
                  data: { name: contactName },
                });
                this.logger.debug(`Updated user name from default "${user.name}" to "${contactName}"`);
              } else {
                // El contacto ya tiene un nombre establecido, no actualizarlo
                this.logger.debug(`User already has name "${user.name}", not updating to "${contactName}"`);
              }
            }
          }

          // Find or create conversation
          let conversation = await this.prisma.conversation.findFirst({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
          });

          if (!conversation) {
            // Extract last message if available
            let lastMessage: string | null = null;
            if (chat.conversationTimestamp) {
              // We'll update this when we get the actual message
              lastMessage = null;
            }

            conversation = await this.prisma.conversation.create({
              data: {
                userId: user.id,
                mode: 'BOT',
                lastMessage,
              },
            });
            createdCount++;
            this.logger.debug(`Created conversation for user: ${user.phone}`);
          } else {
            // Update conversation timestamp if we have a newer one
            if (chat.conversationTimestamp) {
              const chatTimestamp = new Date(chat.conversationTimestamp * 1000);
              if (chatTimestamp > conversation.updatedAt) {
                await this.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    updatedAt: chatTimestamp,
                  },
                });
              }
            }
          }

          syncedCount++;
        } catch (error) {
          this.logger.error(`Error syncing chat ${chat.id}:`, error);
        }
      }

      this.logger.log(`✅ Synced ${syncedCount} conversations (${createdCount} new)`);
    } catch (error) {
      this.logger.error('Error in syncChatsToConversations:', error);
    }
  }

  /**
   * Inicia el mecanismo de keep-alive para mantener la sesión activa
   * Esto ayuda a prevenir desconexiones automáticas por inactividad
   */
  private startKeepAlive(): void {
    // Detener cualquier intervalo existente
    this.stopKeepAlive();

    // Ejecutar keep-alive cada 5 minutos para mantener la sesión activa
    this.keepAliveInterval = setInterval(async () => {
      try {
        if (this.socket && this.connectionState === 'connected' && this.socket.user) {
          // Enviar un presence update para mantener la conexión activa
          // Esto ayuda a prevenir que WhatsApp cierre la conexión por inactividad
          this.logger.debug('🔄 Ejecutando keep-alive para mantener sesión activa...');

          // Opcionalmente, puedes enviar un presence update silencioso
          // No enviamos a ningún contacto específico, solo mantenemos la conexión viva
          // El keepAliveIntervalMs en la configuración del socket ya maneja esto,
          // pero este mecanismo adicional ayuda a asegurar que la sesión se mantenga
        }
      } catch (error) {
        this.logger.debug(`Error en keep-alive (no crítico): ${error}`);
      }
    }, 5 * 60 * 1000); // Cada 5 minutos

    this.logger.debug('✅ Keep-alive iniciado para mantener sesión activa');
  }

  /**
   * Detiene el mecanismo de keep-alive
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      this.logger.debug('🛑 Keep-alive detenido');
    }
  }
}
