"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const messages_service_1 = require("../messages/messages.service");
const bot_service_1 = require("../bot/bot.service");
const branches_service_1 = require("../branches/branches.service");
const websocket_gateway_1 = require("../websocket/websocket.gateway");
const utils_1 = require("../common/utils");
const fs = require("fs");
const path = require("path");
const pino_1 = require("pino");
const node_fetch_1 = require("node-fetch");
const qrcode_terminal_1 = require("qrcode-terminal");
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    async getBaileys() {
        if (!this.baileys) {
            const moduleParts = ['@whiskeysockets', '/baileys'];
            const moduleName = moduleParts.join('');
            this.baileys = await eval(`import('${moduleName}')`);
        }
        return this.baileys;
    }
    constructor(prisma, messagesService, botService, branchesService, websocketGateway) {
        this.prisma = prisma;
        this.messagesService = messagesService;
        this.botService = botService;
        this.branchesService = branchesService;
        this.websocketGateway = websocketGateway;
        this.socket = null;
        this.logger = new common_1.Logger(WhatsAppService_1.name);
        this.sessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.currentQR = null;
        this.connectionState = 'disconnected';
        this.pendingMessages = [];
        this.maxPendingMessageAge = 5 * 60 * 1000;
        this.maxMessageRetries = 3;
        this.baileys = null;
    }
    async onModuleInit() {
        this.ensureSessionDirectory();
        setTimeout(() => {
            this.initializeWhatsApp().catch((error) => {
                this.logger.warn('WhatsApp initialization failed, but application will continue running');
                this.logger.warn('WhatsApp features will be unavailable until connection is established');
            });
        }, 1000);
    }
    ensureSessionDirectory() {
        try {
            const fullPath = path.resolve(this.sessionPath);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                this.logger.log(`Created session directory: ${fullPath}`);
            }
            else {
                const files = fs.readdirSync(fullPath);
                if (files.length > 0) {
                    this.logger.log(`Found existing session files: ${files.join(', ')}`);
                    this.logger.log('If QR is not showing, try deleting the session folder to force re-authentication');
                }
            }
        }
        catch (error) {
            this.logger.error(`Error creating session directory: ${error}`);
        }
    }
    async initializeWhatsApp() {
        try {
            const absoluteSessionPath = path.resolve(this.sessionPath);
            this.logger.log(`Initializing WhatsApp with session path: ${absoluteSessionPath}`);
            const baileys = await this.getBaileys();
            const { state, saveCreds } = await baileys.useMultiFileAuthState(absoluteSessionPath);
            if (state.creds?.registered) {
                this.logger.log('Found existing session credentials');
            }
            else {
                this.logger.log('No existing session found - QR code will be generated');
            }
            const logger = (0, pino_1.default)({ level: 'error' });
            this.socket = baileys.makeWASocket({
                auth: state,
                logger: logger,
                connectTimeoutMs: 60_000,
                defaultQueryTimeoutMs: 60_000,
                keepAliveIntervalMs: 10_000,
                qrTimeout: 60_000,
                markOnlineOnConnect: false,
                syncFullHistory: false,
                generateHighQualityLinkPreview: false,
                getMessage: async (key) => {
                    return undefined;
                },
                shouldSyncHistoryMessage: () => false,
                shouldIgnoreJid: () => false,
            });
            this.socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications } = update;
                this.logger.log(`Connection update: ${connection}, isNewLogin: ${isNewLogin}, hasQR: ${!!qr}, receivedPendingNotifications: ${receivedPendingNotifications}`);
                if (qr) {
                    this.currentQR = qr;
                    this.connectionState = 'connecting';
                    this.logger.log(`✅ QR code generated and saved (length: ${qr.length})`);
                    this.logger.log(`QR available at /whatsapp/qr endpoint`);
                    console.log('\n');
                    console.log('═══════════════════════════════════════════════════════════════════');
                    console.log('📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
                    console.log('═══════════════════════════════════════════════════════════════════');
                    console.log('\n');
                    try {
                        qrcode_terminal_1.default.generate(qr, { small: true });
                    }
                    catch (error) {
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
                    const disconnectReason = lastDisconnect?.error?.output?.statusCode;
                    const isLoggedOut = disconnectReason === baileys.DisconnectReason.loggedOut;
                    const errorDetails = lastDisconnect?.error;
                    const errorMessage = errorDetails?.message || errorDetails?.toString() || 'Unknown error';
                    const isXmlError = errorMessage.includes('xml-not-well-formed') || errorMessage.includes('Stream Errored');
                    if (isXmlError) {
                        this.logger.warn(`Connection closed due to XML parsing error. This is usually temporary. Error: ${errorMessage}, Status: ${disconnectReason}, IsLoggedOut: ${isLoggedOut}`);
                        this.logger.warn('This error often resolves itself. The system will automatically retry connection.');
                    }
                    else {
                        this.logger.error(`Connection closed. Error: ${errorMessage}, Status: ${disconnectReason}, IsLoggedOut: ${isLoggedOut}`);
                    }
                    if (isLoggedOut) {
                        this.logger.warn('⚠️  Sesión cerrada. Se requiere reconexión manual con QR.');
                        this.connectionState = 'disconnected';
                        this.currentQR = null;
                        this.reconnectAttempts = 0;
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
                        }
                        catch (error) {
                            this.logger.error('Error eliminando archivos de sesión:', error);
                        }
                    }
                    else {
                        const shouldReconnect = this.reconnectAttempts < this.maxReconnectAttempts;
                        if (shouldReconnect) {
                            this.reconnectAttempts++;
                            const baseWaitTime = isXmlError ? 5000 : 2000;
                            const waitTime = Math.min(this.reconnectAttempts * baseWaitTime, isXmlError ? 30000 : 10000);
                            this.logger.log(`Retrying WhatsApp connection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${waitTime / 1000}s...`);
                            if (isXmlError && this.reconnectAttempts >= 3) {
                                this.logger.warn('If XML errors persist, try clearing the session folder and reconnecting.');
                            }
                            setTimeout(() => {
                                this.initializeWhatsApp();
                            }, waitTime);
                        }
                        else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                            this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`);
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
                            this.logger.warn('⚠️  WhatsApp service is disabled. The CRM will continue working, but WhatsApp features are unavailable.');
                            this.logger.warn('To retry: Use the reconnect button in the frontend');
                        }
                    }
                }
                else if (connection === 'open') {
                    this.logger.log('✅ WhatsApp connected successfully');
                    this.reconnectAttempts = 0;
                    this.connectionState = 'connected';
                    if (this.pendingMessages.length > 0) {
                        this.logger.log(`📨 ${this.pendingMessages.length} message(s) waiting in queue - will be sent shortly`);
                    }
                    setTimeout(() => {
                        this.currentQR = null;
                        this.logger.debug('QR cleared after successful connection');
                    }, 5000);
                    setTimeout(() => {
                        this.processPendingMessages().catch((error) => {
                            this.logger.error('Error processing pending messages:', error);
                        });
                    }, 3000);
                    setTimeout(() => {
                        this.syncExistingConversations().catch((error) => {
                            this.logger.error('Error syncing existing conversations:', error);
                        });
                    }, 2000);
                }
                else if (connection === 'connecting') {
                    this.logger.log('🔄 Connecting to WhatsApp...');
                    this.connectionState = 'connecting';
                }
                else if (connection === 'close') {
                    this.connectionState = 'disconnected';
                    this.currentQR = null;
                }
            });
            this.socket.ev.on('creds.update', saveCreds);
            this.socket.ev.on('messages.upsert', async (m) => {
                await this.handleIncomingMessage(m);
            });
            this.socket.ev.on('connection.update', async (update) => {
                if (update.connection === 'open' && this.socket) {
                    this.logger.log('Connection opened, waiting for chats to load...');
                    setTimeout(async () => {
                        try {
                            const store = this.socket.store;
                            if (store?.chats) {
                                const chats = Array.from(store.chats.values());
                                this.logger.log(`Found ${chats.length} chats in store`);
                                if (chats.length > 0) {
                                    this.logger.log(`Syncing ${chats.length} chats to conversations...`);
                                    await this.syncChatsToConversations(chats);
                                }
                                else {
                                    this.logger.warn('No chats found in store. Conversations will be created when messages arrive.');
                                }
                            }
                            else {
                                this.logger.warn('Store not available or chats not loaded yet');
                            }
                        }
                        catch (error) {
                            this.logger.error('Error accessing chats from store:', error);
                        }
                    }, 10000);
                }
            });
        }
        catch (error) {
            this.logger.error('Error initializing WhatsApp:', error?.message || error);
            this.logger.error('Error stack:', error?.stack);
            setTimeout(() => {
                this.logger.log('Retrying WhatsApp initialization...');
                this.initializeWhatsApp();
            }, 5000);
        }
    }
    async handleIncomingMessage(m) {
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
                const remoteJid = msg.key.remoteJid || '';
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
                function getJidType(jid) {
                    if (jid.endsWith('@s.whatsapp.net'))
                        return 'phone';
                    if (jid.endsWith('@g.us'))
                        return 'group';
                    if (jid.endsWith('@lid'))
                        return 'linked-id';
                    return 'unknown';
                }
                const jidType = getJidType(remoteJid);
                this.logger.debug(`[handleIncomingMessage] JID type: ${jidType} for ${remoteJid}`);
                if (jidType === 'group') {
                    this.logger.debug(`Ignoring message from group: ${remoteJid}`);
                    continue;
                }
                if (remoteJid.includes('status')) {
                    this.logger.debug(`Ignoring status message: ${remoteJid}`);
                    continue;
                }
                const messageContent = this.extractMessageContent(msg.message);
                if (!messageContent) {
                    this.logger.debug(`[handleIncomingMessage] Skipping message - no extractable content`);
                    continue;
                }
                const isFromMe = msg.key.fromMe || false;
                this.logger.log(`[handleIncomingMessage] Processing message - fromMe: ${isFromMe}, content: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}", remoteJid: ${remoteJid}`);
                let phone = '';
                let originalJidForSending = remoteJid;
                if (jidType === 'linked-id') {
                    this.logger.debug(`[handleIncomingMessage] JID has @lid format, trying to get real phone number from store`);
                    try {
                        if (this.socket && this.socket.store) {
                            const store = this.socket.store;
                            if (this.socket.onWhatsApp) {
                                try {
                                    const result = await this.socket.onWhatsApp(remoteJid);
                                    if (result && result.length > 0 && result[0].exists) {
                                        const realJid = result[0].jid;
                                        if (realJid && realJid.includes('@s.whatsapp.net')) {
                                            phone = (0, utils_1.normalizePhoneNumber)(realJid);
                                            this.logger.log(`[handleIncomingMessage] ✅ Found real phone using onWhatsApp: ${phone} from LID: ${remoteJid}`);
                                        }
                                    }
                                }
                                catch (error) {
                                    this.logger.debug(`[handleIncomingMessage] onWhatsApp failed: ${error}`);
                                }
                            }
                            if (!phone && msg.pushName && store.chats) {
                                const contactName = msg.pushName.trim();
                                this.logger.debug(`[handleIncomingMessage] Searching all chats for name: "${contactName}"`);
                                for (const [chatJid, chat] of store.chats.entries()) {
                                    if (chat.name === contactName && chatJid.includes('@s.whatsapp.net')) {
                                        phone = (0, utils_1.normalizePhoneNumber)(chatJid);
                                        this.logger.log(`[handleIncomingMessage] ✅ Found phone by matching name "${contactName}": ${phone}`);
                                        break;
                                    }
                                    if (chat.name && chat.name.includes(contactName) && chatJid.includes('@s.whatsapp.net')) {
                                        phone = (0, utils_1.normalizePhoneNumber)(chatJid);
                                        this.logger.log(`[handleIncomingMessage] ✅ Found phone by partial name match "${contactName}": ${phone}`);
                                        break;
                                    }
                                }
                            }
                            if (!phone) {
                                const contact = store.contacts?.[remoteJid];
                                if (contact) {
                                    this.logger.debug(`[handleIncomingMessage] Found contact in store: ${JSON.stringify(Object.keys(contact))}`);
                                    for (const [key, value] of Object.entries(contact)) {
                                        if (typeof value === 'string' && value.includes('@s.whatsapp.net')) {
                                            phone = (0, utils_1.normalizePhoneNumber)(value);
                                            this.logger.log(`[handleIncomingMessage] ✅ Extracted phone from contact.${key}: ${phone}`);
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!phone && store.chats) {
                                const chat = store.chats.get(remoteJid);
                                if (chat) {
                                    this.logger.debug(`[handleIncomingMessage] Found chat in store: ${JSON.stringify(Object.keys(chat))}`);
                                    for (const [key, value] of Object.entries(chat)) {
                                        if (typeof value === 'string' && value.includes('@s.whatsapp.net')) {
                                            phone = (0, utils_1.normalizePhoneNumber)(value);
                                            this.logger.log(`[handleIncomingMessage] ✅ Extracted phone from chat.${key}: ${phone}`);
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!phone && store.chats) {
                                this.logger.debug(`[handleIncomingMessage] Searching all non-LID chats...`);
                                for (const [chatJid, chat] of store.chats.entries()) {
                                    if (chatJid.includes('@s.whatsapp.net') && !chatJid.includes('@lid') && !chatJid.includes('@g.us')) {
                                        if (chat.name && msg.pushName && chat.name.toLowerCase().includes(msg.pushName.toLowerCase().substring(0, 5))) {
                                            phone = (0, utils_1.normalizePhoneNumber)(chatJid);
                                            this.logger.log(`[handleIncomingMessage] ✅ Found phone by similar name: ${phone}`);
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!phone && msg.messageStubType) {
                                this.logger.debug(`[handleIncomingMessage] Message has stubType: ${msg.messageStubType}`);
                            }
                            if (!phone && store.chats && msg.messageTimestamp) {
                                this.logger.debug(`[handleIncomingMessage] Searching chats by timestamp...`);
                                const messageTime = Number(msg.messageTimestamp) * 1000;
                                for (const [chatJid, chat] of store.chats.entries()) {
                                    if (chatJid.includes('@s.whatsapp.net') && !chatJid.includes('@lid') && !chatJid.includes('@g.us')) {
                                        if (chat.messages && chat.messages.size > 0) {
                                            const lastMessage = Array.from(chat.messages.values()).pop();
                                            if (lastMessage && typeof lastMessage === 'object' && 'messageTimestamp' in lastMessage) {
                                                const lastMsgTimestamp = lastMessage.messageTimestamp;
                                                if (lastMsgTimestamp) {
                                                    const chatTime = Number(lastMsgTimestamp) * 1000;
                                                    if (Math.abs(messageTime - chatTime) < 300000) {
                                                        phone = (0, utils_1.normalizePhoneNumber)(chatJid);
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
                    }
                    catch (error) {
                        this.logger.warn(`[handleIncomingMessage] Error getting phone from store: ${error}`);
                    }
                    if (!phone) {
                        try {
                            const baileys = await this.getBaileys();
                            const decoded = baileys.jidDecode(remoteJid);
                            if (decoded && decoded.user) {
                                this.logger.debug(`[handleIncomingMessage] jidDecode result: ${JSON.stringify(decoded)}`);
                                const decodedUser = decoded.user.replace(/\D/g, '');
                                if (decodedUser.length >= 8 && decodedUser.length <= 12) {
                                    phone = decodedUser;
                                    this.logger.log(`[handleIncomingMessage] ✅ Extracted phone using jidDecode: ${phone}`);
                                }
                            }
                        }
                        catch (error) {
                            this.logger.debug(`[handleIncomingMessage] jidDecode failed: ${error}`);
                        }
                    }
                    if (!phone) {
                        this.logger.warn(`[handleIncomingMessage] ⚠️ Cannot extract real phone number from LID JID: ${remoteJid}`);
                        this.logger.warn(`[handleIncomingMessage] Will save contact with phone: null. The phone number will be added later when available.`);
                        phone = null;
                    }
                }
                else if (jidType === 'phone') {
                    try {
                        const baileys = await this.getBaileys();
                        const normalizedJid = baileys.jidNormalizedUser(remoteJid);
                        this.logger.debug(`[handleIncomingMessage] jidNormalizedUser result: ${normalizedJid} from JID: ${remoteJid}`);
                        if (normalizedJid && normalizedJid.includes('@')) {
                            phone = normalizedJid.split('@')[0];
                        }
                        else {
                            phone = normalizedJid || '';
                        }
                        phone = (0, utils_1.normalizePhoneNumber)(phone);
                    }
                    catch (error) {
                        this.logger.warn(`[handleIncomingMessage] Error using jidNormalizedUser, using fallback extraction: ${error}`);
                        phone = (0, utils_1.normalizePhoneNumber)(remoteJid);
                    }
                }
                else {
                    this.logger.warn(`[handleIncomingMessage] Unknown JID type: ${remoteJid}, attempting to extract phone anyway`);
                    phone = (0, utils_1.normalizePhoneNumber)(remoteJid);
                }
                this.logger.log(`[handleIncomingMessage] Original JID: ${remoteJid}, Extracted phone: ${phone || 'null'}, Length: ${phone ? phone.length : 0}`);
                if (phone) {
                    if (phone.length > 12) {
                        if (!remoteJid.includes('@s.whatsapp.net')) {
                            this.logger.error(`[handleIncomingMessage] ERROR: Phone number too long (${phone.length} digits) and appears to be LID: ${phone}. Original JID: ${remoteJid}`);
                            this.logger.error(`[handleIncomingMessage] This is likely a LID, not a real phone number. Setting phone to null.`);
                            phone = null;
                        }
                        else {
                            this.logger.warn(`[handleIncomingMessage] WARNING: Phone number too long (${phone.length} digits): ${phone}. Truncating to 12 digits. Original JID: ${remoteJid}`);
                            phone = phone.substring(0, 12);
                        }
                    }
                    if (phone.length < 8) {
                        this.logger.warn(`[handleIncomingMessage] Phone number too short (${phone.length} digits): ${phone}. Setting to null. Original JID: ${remoteJid}`);
                        phone = null;
                    }
                }
                if (!phone) {
                    this.logger.warn(`[handleIncomingMessage] ⚠️ Contact will be saved with phone: null. Phone number will be added later when available.`);
                }
                if (phone.length > 12) {
                    this.logger.warn(`[handleIncomingMessage] WARNING: Phone number has ${phone.length} digits (might be incorrect): ${phone}. Original JID: ${remoteJid}`);
                }
                let contactName = phone || 'Contacto sin número';
                try {
                    if (msg.pushName && msg.pushName.trim()) {
                        contactName = msg.pushName.trim();
                        this.logger.debug(`[handleIncomingMessage] Got name from pushName: ${contactName}`);
                    }
                    else if (this.socket && this.socket.store && phone) {
                        try {
                            const store = this.socket.store;
                            const jid = `${phone}@s.whatsapp.net`;
                            const contact = store.contacts?.[jid];
                            if (contact) {
                                contactName = contact.name || contact.notify || contact.verifiedName || phone;
                                if (contactName !== phone) {
                                    this.logger.debug(`[handleIncomingMessage] Got name from store: ${contactName}`);
                                }
                            }
                        }
                        catch (e) {
                        }
                    }
                    if (this.socket && this.socket.store) {
                        try {
                            const store = this.socket.store;
                            const chat = store.chats?.get(originalJidForSending);
                            if (chat) {
                                const chatName = chat.name || chat.subject;
                                if (chatName && chatName.trim()) {
                                    contactName = chatName.trim();
                                    this.logger.debug(`[handleIncomingMessage] Got name from chat store using JID: ${contactName}`);
                                }
                            }
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
                        }
                        catch (e) {
                        }
                    }
                }
                catch (error) {
                    this.logger.debug(`[handleIncomingMessage] Error getting contact name: ${error?.message || error}`);
                }
                let user = null;
                if (phone) {
                    user = await this.prisma.user.findUnique({
                        where: { phone },
                    });
                }
                if (!user) {
                    user = await this.prisma.user.findFirst({
                        where: { whatsappJid: originalJidForSending },
                    });
                }
                if (!user) {
                    user = await this.prisma.user.create({
                        data: {
                            phone: phone || null,
                            name: contactName,
                            whatsappJid: originalJidForSending,
                        },
                    });
                    this.logger.log(`[handleIncomingMessage] Created user with phone: ${phone || 'null'}, name: ${contactName}, JID: ${originalJidForSending}`);
                }
                else {
                    const updateData = {};
                    if (contactName !== (phone || 'Contacto sin número') && contactName !== user.name) {
                        updateData.name = contactName;
                    }
                    if (!user.phone && phone) {
                        updateData.phone = phone;
                        this.logger.log(`[handleIncomingMessage] ✅ Adding phone number to user: ${phone}`);
                    }
                    if (!user.whatsappJid || (originalJidForSending.includes('@s.whatsapp.net') && !user.whatsappJid.includes('@s.whatsapp.net'))) {
                        updateData.whatsappJid = originalJidForSending;
                        this.logger.debug(`[handleIncomingMessage] Updated user JID from "${user.whatsappJid}" to "${originalJidForSending}"`);
                    }
                    if (Object.keys(updateData).length > 0) {
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: updateData,
                        });
                        user = await this.prisma.user.findUnique({
                            where: { id: user.id },
                        });
                    }
                }
                const jidToUse = user.whatsappJid || originalJidForSending;
                user.originalJid = jidToUse;
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
                }
                else {
                    if (!conversation.user) {
                        conversation = await this.prisma.conversation.findUnique({
                            where: { id: conversation.id },
                            include: { user: true },
                        }) || conversation;
                    }
                }
                let sender = 'user';
                if (isFromMe) {
                    if (conversation.mode === 'BOT') {
                        sender = 'bot';
                    }
                    else {
                        sender = 'agent';
                    }
                }
                if (!isFromMe) {
                    const tag = await this.botService.classifyIntent(messageContent);
                    if (tag && tag !== 'otros') {
                        await this.prisma.conversation.update({
                            where: { id: conversation.id },
                            data: { tag },
                        });
                        if (!user.tags.includes(tag)) {
                            await this.prisma.user.update({
                                where: { id: user.id },
                                data: {
                                    tags: { push: tag },
                                },
                            });
                        }
                    }
                }
                let message = null;
                if (isFromMe) {
                    const recentTime = new Date(Date.now() - 10000);
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
                    }
                    else {
                        this.logger.log(`[handleIncomingMessage] No existing message found for fromMe message, will create new one`);
                    }
                }
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
                const updatedConversation = await this.prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        lastMessage: messageContent,
                        updatedAt: new Date(),
                        ...(sender === 'agent' && { mode: 'HUMAN' }),
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
                this.websocketGateway.broadcastConversationUpdate(updatedConversation);
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
                if (!isFromMe && updatedConversation.mode === 'BOT') {
                    this.logger.log(`[handleIncomingMessage] Processing bot response for new message from ${phone} in conversation ${updatedConversation.id}`);
                    const userPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
                    await this.sendTypingIndicator(userPhone, true);
                    let botResponse = null;
                    try {
                        this.logger.debug(`[handleIncomingMessage] Generating bot response for message: "${messageContent.substring(0, 50)}..."`);
                        const googleMapsUrlPattern = /(https?:\/\/)?(www\.)?(maps\.(google\.com|app\.goo\.gl)|google\.com\/maps|goo\.gl\/maps)[^\s]*/gi;
                        const mapsMatch = messageContent.match(googleMapsUrlPattern);
                        if (mapsMatch && mapsMatch.length > 0) {
                            this.logger.debug(`Detected Google Maps link: ${mapsMatch[0]}`);
                            const coords = await this.branchesService.extractCoordinatesFromGoogleMaps(mapsMatch[0]);
                            if (coords) {
                                this.logger.debug(`Extracted coordinates: ${coords.latitude}, ${coords.longitude}`);
                                const nearestBranch = await this.branchesService.findNearest(coords.latitude, coords.longitude);
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
                                }
                                else {
                                    botResponse = 'Lo siento, no encontré sucursales cercanas a tu ubicación.';
                                }
                            }
                            else {
                                this.logger.warn(`Could not extract coordinates from URL: ${mapsMatch[0]}`);
                                botResponse = await this.botService.generateResponse(updatedConversation.id, messageContent);
                            }
                        }
                        else {
                            this.logger.debug(`[handleIncomingMessage] Calling botService.generateResponse for conversation ${updatedConversation.id}`);
                            botResponse = await this.botService.generateResponse(updatedConversation.id, messageContent);
                            this.logger.debug(`[handleIncomingMessage] Bot response received: ${botResponse ? `"${botResponse.substring(0, 100)}..."` : 'null'}`);
                        }
                        if (botResponse) {
                            this.logger.log(`[handleIncomingMessage] Creating bot message in database for conversation ${updatedConversation.id}`);
                            await this.messagesService.create({
                                conversationId: updatedConversation.id,
                                sender: 'bot',
                                content: botResponse,
                                skipWhatsApp: true,
                            });
                            const userPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
                            this.logger.log(`[handleIncomingMessage] Sending bot message via WhatsApp to ${userPhone}`);
                            const phoneToSend = updatedConversation.user?.whatsappJid || updatedConversation.user?.phone || userPhone;
                            const sent = await this.sendMessage(phoneToSend, botResponse, true);
                            if (sent) {
                                this.logger.log(`[handleIncomingMessage] Bot message sent successfully to ${userPhone}`);
                            }
                            else {
                                this.logger.warn(`[handleIncomingMessage] Failed to send bot message to ${userPhone} - connection may be down`);
                            }
                            if (botResponse.includes('Pedido creado exitosamente') || botResponse.includes('Pedido #')) {
                                try {
                                    const botConfig = await this.prisma.botConfig.findFirst();
                                    if (botConfig?.autoSendQRImages) {
                                        const qrMethods = await this.prisma.paymentMethod.findMany({
                                            where: {
                                                type: 'QR',
                                                isActive: true,
                                            },
                                            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                                        });
                                        for (const qrMethod of qrMethods) {
                                            if (qrMethod.qrImageUrl) {
                                                await new Promise(resolve => setTimeout(resolve, 1000));
                                                const caption = qrMethod.name + (qrMethod.description ? `\n${qrMethod.description}` : '');
                                                const imagePhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
                                                await this.sendImage(imagePhone, qrMethod.qrImageUrl, caption);
                                            }
                                        }
                                    }
                                }
                                catch (error) {
                                    this.logger.error('Error sending QR images:', error);
                                }
                            }
                        }
                        else {
                            this.logger.warn(`[handleIncomingMessage] No bot response generated for message from ${phone}`);
                            const stopTypingPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
                            await this.sendTypingIndicator(stopTypingPhone, false);
                        }
                    }
                    catch (error) {
                        this.logger.error(`[handleIncomingMessage] Error generating bot response for ${phone}:`, error);
                        this.logger.error(`[handleIncomingMessage] Error stack:`, error?.stack);
                        const stopTypingPhone = updatedConversation.user?.phone || conversation.user?.phone || phone;
                        await this.sendTypingIndicator(stopTypingPhone, false);
                    }
                }
                else {
                    if (isFromMe) {
                        this.logger.debug(`[handleIncomingMessage] Skipping bot response - message is from us (sent)`);
                    }
                    else if (conversation.mode !== 'BOT') {
                        this.logger.debug(`[handleIncomingMessage] Skipping bot response - conversation mode is ${conversation.mode}, not BOT`);
                    }
                }
                this.logger.debug(`Message saved: ${isFromMe ? 'sent' : 'received'} from ${phone}, sender: ${sender}`);
            }
            catch (error) {
                this.logger.error('Error handling message:', error);
            }
        }
    }
    extractMessageContent(message) {
        if (message.conversation)
            return message.conversation;
        if (message.extendedTextMessage?.text)
            return message.extendedTextMessage.text;
        if (message.imageMessage?.caption)
            return message.imageMessage.caption;
        if (message.videoMessage?.caption)
            return message.videoMessage.caption;
        return null;
    }
    async sendTypingIndicator(phone, isTyping = true) {
        let jid = '';
        if (phone.includes('@')) {
            jid = phone;
        }
        else {
            const normalizedPhone = (0, utils_1.normalizePhoneNumber)(phone);
            if (!normalizedPhone || normalizedPhone.length < 8) {
                return false;
            }
            try {
                const user = await this.prisma.user.findUnique({
                    where: { phone: normalizedPhone },
                    select: { whatsappJid: true },
                });
                if (user?.whatsappJid) {
                    jid = user.whatsappJid;
                }
                else {
                    jid = `${normalizedPhone}@s.whatsapp.net`;
                }
            }
            catch (error) {
                jid = `${normalizedPhone}@s.whatsapp.net`;
            }
        }
        try {
            if (!this.socket) {
                return false;
            }
            if (this.connectionState !== 'connected') {
                return false;
            }
            if (!this.socket.user) {
                return false;
            }
            if (jid.includes('@g.us')) {
                return false;
            }
            await this.socket.sendPresenceUpdate(isTyping ? 'composing' : 'paused', jid);
            return true;
        }
        catch (error) {
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            if (errorMessage.includes('Connection Closed') ||
                errorMessage.includes('Connection closed') ||
                errorMessage.includes('Stream Errored')) {
                return false;
            }
            this.logger.error(`Error sending typing indicator to ${jid || phone}:`, error);
            return false;
        }
    }
    async sendMessage(phone, content, showTyping = false) {
        let jid = '';
        if (phone.includes('@')) {
            jid = phone;
            this.logger.debug(`[sendMessage] Using provided JID directly: ${jid}`);
        }
        else {
            const normalizedPhone = (0, utils_1.normalizePhoneNumber)(phone);
            if (!normalizedPhone || normalizedPhone.length < 8) {
                this.logger.warn(`Invalid phone number: ${phone}`);
                return false;
            }
            try {
                const user = await this.prisma.user.findUnique({
                    where: { phone: normalizedPhone },
                    select: { whatsappJid: true },
                });
                if (user?.whatsappJid) {
                    jid = user.whatsappJid;
                    this.logger.debug(`[sendMessage] Using saved JID from database: ${jid} for phone: ${normalizedPhone}`);
                }
                else {
                    jid = `${normalizedPhone}@s.whatsapp.net`;
                    this.logger.debug(`[sendMessage] No saved JID found, using standard format: ${jid}`);
                }
            }
            catch (error) {
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
            if (jid.includes('@g.us')) {
                this.logger.warn(`Cannot send message to group: ${jid}`);
                return false;
            }
            const phoneForLogging = jid.includes('@') ? jid.split('@')[0] : jid;
            if (showTyping) {
                await this.sendTypingIndicator(jid, true);
                const typingDuration = Math.min(Math.max(content.length * 50, 1000), 3000);
                await new Promise(resolve => setTimeout(resolve, typingDuration));
            }
            await this.socket.sendMessage(jid, { text: content });
            if (showTyping) {
                await this.sendTypingIndicator(jid, false);
            }
            this.logger.log(`Message sent to ${jid}`);
            return true;
        }
        catch (error) {
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            if (errorMessage.includes('Connection Closed') ||
                errorMessage.includes('Connection closed') ||
                errorMessage.includes('Stream Errored') ||
                errorMessage.includes('xml-not-well-formed')) {
                this.logger.warn(`Connection error while sending message to ${jid}: ${errorMessage}`);
                this.connectionState = 'disconnected';
                this.addToPendingQueue(phone, content, showTyping);
            }
            else {
                this.logger.error(`Error sending message to ${jid}:`, error);
            }
            try {
                await this.sendTypingIndicator(jid, false);
            }
            catch (e) {
            }
            return false;
        }
    }
    addToPendingQueue(phone, content, showTyping = false) {
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
    async processPendingMessages() {
        if (this.pendingMessages.length === 0) {
            return;
        }
        this.logger.log(`Processing ${this.pendingMessages.length} pending message(s)...`);
        const now = Date.now();
        this.pendingMessages = this.pendingMessages.filter(msg => {
            const age = now - msg.timestamp;
            if (age > this.maxPendingMessageAge) {
                this.logger.warn(`Removing expired pending message for ${msg.phone} (age: ${Math.round(age / 1000)}s)`);
                return false;
            }
            return true;
        });
        for (const pendingMsg of [...this.pendingMessages]) {
            try {
                this.pendingMessages = this.pendingMessages.filter(msg => msg !== pendingMsg);
                if (pendingMsg.retries >= (pendingMsg.maxRetries || this.maxMessageRetries)) {
                    this.logger.warn(`Max retries reached for message to ${pendingMsg.phone}, skipping`);
                    continue;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                const sent = await this.sendMessage(pendingMsg.phone, pendingMsg.content, pendingMsg.showTyping);
                if (!sent) {
                    pendingMsg.retries++;
                    this.pendingMessages.push(pendingMsg);
                    this.logger.debug(`Message to ${pendingMsg.phone} failed, will retry (attempt ${pendingMsg.retries}/${pendingMsg.maxRetries})`);
                }
                else {
                    this.logger.log(`Successfully sent pending message to ${pendingMsg.phone}`);
                }
            }
            catch (error) {
                this.logger.error(`Error processing pending message to ${pendingMsg.phone}:`, error);
                if (pendingMsg.retries < (pendingMsg.maxRetries || this.maxMessageRetries)) {
                    pendingMsg.retries++;
                    this.pendingMessages.push(pendingMsg);
                }
            }
        }
        if (this.pendingMessages.length > 0) {
            this.logger.warn(`${this.pendingMessages.length} message(s) still pending after processing attempt`);
        }
        else {
            this.logger.log('All pending messages processed successfully');
        }
    }
    async sendImage(phone, imageUrl, caption) {
        const normalizedPhone = (0, utils_1.normalizePhoneNumber)(phone);
        try {
            if (!normalizedPhone || normalizedPhone.length < 8) {
                this.logger.warn(`Invalid phone number: ${phone}`);
                return false;
            }
            if (!this.socket) {
                this.logger.warn('WhatsApp socket not initialized - image not sent');
                return false;
            }
            if (this.connectionState !== 'connected') {
                this.logger.warn(`WhatsApp not connected (state: ${this.connectionState}) - image not sent to ${normalizedPhone}`);
                return false;
            }
            if (!this.socket.user) {
                this.logger.warn('WhatsApp not connected - image not sent');
                return false;
            }
            if (normalizedPhone.includes('@g.us')) {
                this.logger.warn(`Cannot send image to group: ${normalizedPhone}`);
                return false;
            }
            const jid = `${normalizedPhone}@s.whatsapp.net`;
            let imagePath = imageUrl;
            if (imageUrl.startsWith('/uploads/')) {
                imagePath = path.join(process.cwd(), 'backend', imageUrl);
            }
            else if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
                try {
                    const urlObj = new URL(imageUrl);
                    if (urlObj.pathname.startsWith('/uploads/')) {
                        imagePath = path.join(process.cwd(), 'backend', urlObj.pathname);
                    }
                }
                catch (e) {
                }
            }
            if ((imagePath.startsWith('/') || imagePath.match(/^[A-Z]:/)) && fs.existsSync(imagePath)) {
                this.logger.debug(`Sending local image: ${imagePath}`);
                await this.socket.sendMessage(jid, {
                    image: { url: imagePath },
                    caption: caption,
                });
            }
            else {
                this.logger.debug(`Downloading image from URL: ${imageUrl}`);
                const response = await (0, node_fetch_1.default)(imageUrl);
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
        }
        catch (error) {
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            if (errorMessage.includes('Connection Closed') ||
                errorMessage.includes('Connection closed') ||
                errorMessage.includes('Stream Errored') ||
                errorMessage.includes('xml-not-well-formed')) {
                this.logger.warn(`Connection error while sending image to ${normalizedPhone}: ${errorMessage}`);
                this.connectionState = 'disconnected';
            }
            else {
                this.logger.error(`Error sending image to ${normalizedPhone}:`, error);
            }
            return false;
        }
    }
    async getConnectionStatus() {
        return {
            connected: this.socket?.user ? true : false,
            state: this.connectionState,
            phoneNumber: this.socket?.user?.id?.split(':')[0] || undefined,
            pendingMessages: this.pendingMessages.length,
            hasQR: !!this.currentQR,
        };
    }
    async getQRCode() {
        this.logger.debug(`getQRCode called - currentQR: ${this.currentQR ? 'exists' : 'null'}, state: ${this.connectionState}`);
        return {
            qr: this.currentQR,
            state: this.connectionState,
        };
    }
    async reconnect() {
        try {
            this.logger.log('Reconnecting WhatsApp...');
            this.reconnectAttempts = 0;
            this.currentQR = null;
            this.connectionState = 'connecting';
            if (this.socket) {
                try {
                    await this.socket.end(undefined);
                }
                catch (error) {
                    this.logger.warn('Error ending existing socket:', error);
                }
                this.socket = null;
            }
            try {
                const absoluteSessionPath = path.resolve(this.sessionPath);
                if (fs.existsSync(absoluteSessionPath)) {
                    this.logger.log('Limpiando sesión anterior para generar nuevo QR...');
                    const files = fs.readdirSync(absoluteSessionPath);
                    for (const file of files) {
                        if (file !== '.gitkeep') {
                            try {
                                fs.unlinkSync(path.join(absoluteSessionPath, file));
                            }
                            catch (error) {
                                this.logger.warn(`Error eliminando archivo ${file}:`, error);
                            }
                        }
                    }
                    this.logger.log('Sesión limpiada. Se generará un nuevo QR.');
                }
            }
            catch (error) {
                this.logger.warn('Error clearing session files (continuando de todas formas):', error);
            }
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
        }
        catch (error) {
            this.logger.error('Error in reconnect:', error);
            this.connectionState = 'disconnected';
            return { success: false, message: error.message || 'Error reconnecting' };
        }
    }
    async disconnect() {
        try {
            this.logger.log('Disconnecting WhatsApp...');
            if (this.socket) {
                await this.socket.end(undefined);
                this.socket = null;
            }
            this.connectionState = 'disconnected';
            this.currentQR = null;
            this.reconnectAttempts = 0;
            return { success: true, message: 'Desconectado exitosamente. Puedes reconectar usando el botón "Reconectar".' };
        }
        catch (error) {
            this.logger.error('Error disconnecting:', error);
            return { success: false, message: error.message || 'Error disconnecting' };
        }
    }
    async syncMessagesFromWhatsApp(conversationId) {
        try {
            if (!this.socket || !this.socket.user) {
                return {
                    success: false,
                    message: 'WhatsApp no está conectado',
                    syncedCount: 0,
                };
            }
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
            const phone = (0, utils_1.normalizePhoneNumber)(conversation.user.phone);
            const jid = `${phone}@s.whatsapp.net`;
            if (jid.includes('@g.us')) {
                this.logger.warn(`Cannot sync messages from group: ${jid}`);
                return {
                    success: false,
                    message: 'No se pueden sincronizar mensajes de grupos',
                    syncedCount: 0,
                };
            }
            this.logger.log(`Sincronizando mensajes desde WhatsApp para ${phone}...`);
            let messages = [];
            try {
                const fetchResult = await this.socket.fetchMessagesFromWA(jid, 1000);
                if (fetchResult && Array.isArray(fetchResult)) {
                    messages = fetchResult;
                }
                else if (fetchResult && fetchResult.messages) {
                    messages = fetchResult.messages;
                }
            }
            catch (error) {
                this.logger.warn(`Error fetching messages from WhatsApp: ${error.message}`);
                const store = this.socket.store;
                if (store && store.loadMessages) {
                    try {
                        messages = await store.loadMessages(jid, 1000);
                    }
                    catch (storeError) {
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
            this.logger.log(`Eliminando mensajes existentes de la conversación ${conversationId}...`);
            await this.prisma.message.deleteMany({
                where: { conversationId },
            });
            this.logger.log('Mensajes existentes eliminados');
            let syncedCount = 0;
            const sortedMessages = messages.sort((a, b) => {
                const timestampA = a.messageTimestamp ? Number(a.messageTimestamp) : 0;
                const timestampB = b.messageTimestamp ? Number(b.messageTimestamp) : 0;
                return timestampA - timestampB;
            });
            for (const msg of sortedMessages) {
                try {
                    if (!msg.message)
                        continue;
                    const msgJid = msg.key?.remoteJid || '';
                    if (msgJid.includes('@g.us') || msgJid.includes('status')) {
                        continue;
                    }
                    const messageContent = this.extractMessageContent(msg.message);
                    if (!messageContent)
                        continue;
                    const isFromMe = msg.key?.fromMe || false;
                    const messageId = msg.key?.id || `${msg.key?.remoteJid}_${msg.messageTimestamp || Date.now()}`;
                    let sender = 'user';
                    if (isFromMe) {
                        if (conversation.mode === 'BOT') {
                            sender = 'bot';
                        }
                        else {
                            sender = 'agent';
                        }
                    }
                    const messageTimestamp = msg.messageTimestamp
                        ? new Date(Number(msg.messageTimestamp) * 1000)
                        : new Date();
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
                    if (!conversation.user) {
                        conversation = await this.prisma.conversation.findUnique({
                            where: { id: conversation.id },
                            include: { user: true },
                        }) || conversation;
                    }
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
                }
                catch (error) {
                    this.logger.error(`Error procesando mensaje: ${error.message}`);
                }
            }
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
        }
        catch (error) {
            this.logger.error('Error sincronizando mensajes:', error);
            return {
                success: false,
                message: error.message || 'Error al sincronizar mensajes',
                syncedCount: 0,
            };
        }
    }
    async syncExistingConversations() {
        try {
            if (!this.socket || !this.socket.user) {
                this.logger.warn('Cannot sync conversations: WhatsApp not connected');
                return;
            }
            this.logger.log('🔄 Waiting for WhatsApp chats to be loaded...');
        }
        catch (error) {
            this.logger.error('Error in syncExistingConversations:', error);
        }
    }
    async syncChatsToConversations(chats) {
        try {
            this.logger.log(`🔄 Syncing ${chats.length} chats to conversations...`);
            let syncedCount = 0;
            let createdCount = 0;
            for (const chat of chats) {
                try {
                    if (chat.id?.includes('@g.us') || chat.id?.includes('status') || !chat.id) {
                        continue;
                    }
                    const phone = (0, utils_1.normalizePhoneNumber)(chat.id);
                    if (!phone || phone.length < 8) {
                        continue;
                    }
                    let user = await this.prisma.user.findUnique({
                        where: { phone },
                    });
                    if (!user) {
                        const contactName = chat.name || chat.subject || phone;
                        user = await this.prisma.user.create({
                            data: {
                                phone,
                                name: contactName,
                            },
                        });
                        this.logger.debug(`Created user for phone: ${phone}`);
                    }
                    else {
                        const contactName = chat.name || chat.subject;
                        if (contactName && contactName !== user.name && contactName !== phone) {
                            await this.prisma.user.update({
                                where: { id: user.id },
                                data: { name: contactName },
                            });
                        }
                    }
                    let conversation = await this.prisma.conversation.findFirst({
                        where: { userId: user.id },
                        orderBy: { updatedAt: 'desc' },
                    });
                    if (!conversation) {
                        let lastMessage = null;
                        if (chat.conversationTimestamp) {
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
                    }
                    else {
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
                }
                catch (error) {
                    this.logger.error(`Error syncing chat ${chat.id}:`, error);
                }
            }
            this.logger.log(`✅ Synced ${syncedCount} conversations (${createdCount} new)`);
        }
        catch (error) {
            this.logger.error('Error in syncChatsToConversations:', error);
        }
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => messages_service_1.MessagesService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => bot_service_1.BotService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => branches_service_1.BranchesService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messages_service_1.MessagesService,
        bot_service_1.BotService,
        branches_service_1.BranchesService,
        websocket_gateway_1.WebSocketGateway])
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map