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
var BotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const branches_service_1 = require("../branches/branches.service");
const orders_service_1 = require("../orders/orders.service");
const openai_1 = require("openai");
let BotService = BotService_1 = class BotService {
    constructor(prisma, branchesService, ordersService) {
        this.prisma = prisma;
        this.branchesService = branchesService;
        this.ordersService = ordersService;
        this.logger = new common_1.Logger(BotService_1.name);
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
        this.logger.debug(`[BotService] Inicializando cliente de IA...`);
        this.logger.debug(`[BotService] API Key presente: ${!!apiKey}`);
        this.logger.debug(`[BotService] Usando DEEPSEEK_API_KEY: ${!!process.env.DEEPSEEK_API_KEY}`);
        this.logger.debug(`[BotService] Usando OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY}`);
        if (apiKey) {
            const maskedKey = apiKey.length > 8
                ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
                : '****';
            this.logger.debug(`[BotService] API Key (parcial): ${maskedKey} (longitud: ${apiKey.length})`);
        }
        else {
            this.logger.error(`[BotService] ADVERTENCIA: No se encontró DEEPSEEK_API_KEY ni OPENAI_API_KEY en variables de entorno`);
            this.logger.error(`[BotService] Por favor, configura DEEPSEEK_API_KEY en el archivo .env del backend`);
        }
        this.openai = new openai_1.default({
            apiKey: apiKey,
            baseURL: 'https://api.deepseek.com',
        });
        this.logger.debug(`[BotService] Cliente de IA inicializado con baseURL: ${this.openai.baseURL}`);
    }
    async getBotConfig() {
        try {
            this.logger.debug('Getting bot config...');
            let config = await this.prisma.botConfig.findFirst();
            if (!config) {
                this.logger.debug('No bot config found, creating default...');
                config = await this.prisma.botConfig.create({
                    data: {
                        systemPrompt: 'Eres un Asistente Virtual (Chatbot) que actúa como punto de entrada del cliente. Tu función es: CLASIFICAR las consultas de los usuarios, COTIZAR productos y precios, y REGISTRAR información (pedidos, contactos, etc.). IMPORTANTE: NUNCA vendas ni confirmes pagos. Solo proporciona información, cotizaciones y registra datos. Las ventas y confirmaciones de pago deben ser manejadas por agentes humanos.',
                        temperature: 0.7,
                        maxTokens: 500,
                        model: 'deepseek-chat',
                        contextMessages: 5,
                        classificationCategories: ['ventas', 'soporte', 'facturacion', 'otros'],
                        orderInstructions: 'REGLAS CRÍTICAS PARA PEDIDOS:\n\n1. NUNCA vendas ni confirmes pagos. Tu función es solo REGISTRAR información de pedidos.\n2. Cuando el usuario quiera hacer un pedido (pedido, comprar, quiero, necesito productos):\n   - Usa prepare_order para RECOPILAR información: productos, cantidades, sucursal\n   - Proporciona cotizaciones y precios\n   - Muestra métodos de pago disponibles si el usuario pregunta\n   - NUNCA crees el pedido directamente\n   - NUNCA confirmes que el pago fue recibido\n3. Después de recopilar toda la información del pedido, informa al usuario que un agente humano se encargará de procesar el pedido y confirmar el pago.\n4. Formato para pedidos: Lista productos como "product_name:quantity" (ej: "Producto A:2, Producto B:1")\n\nRECUERDA: Solo REGISTRAS y COTIZAS. NO vendes ni confirmas pagos.',
                        locationInstructions: 'IMPORTANT: When user asks about nearest branch or location, if they haven\'t shared their location (Google Maps link), provide step-by-step instructions to share location in WhatsApp.',
                        locationKeywords: 'ubicación|sucursal|tienda|local|dónde|más cercan|más próxim|necesito.*sucursal|busco.*sucursal',
                        autoCreateOrderOnPaymentRequest: false,
                        autoSendQRImages: true,
                        notifyOrderStatusChanges: true,
                        findNearestBranchOnLocationShare: true,
                        showLocationInstructions: true,
                        prepareOrderInsteadOfCreate: true,
                        extractOrderFromContext: true,
                    },
                });
                this.logger.debug('Default bot config created');
            }
            return config;
        }
        catch (error) {
            this.logger.error(`Error getting bot config: ${error.message}`);
            this.logger.error(`Error stack: ${error.stack}`);
            if (error.code) {
                this.logger.error(`Error code: ${error.code}`);
            }
            throw error;
        }
    }
    async updateBotConfig(data) {
        let config = await this.prisma.botConfig.findFirst();
        if (!config) {
            config = await this.prisma.botConfig.create({
                data: {
                    systemPrompt: data.systemPrompt || 'Eres un Asistente Virtual (Chatbot) que actúa como punto de entrada del cliente. Tu función es: CLASIFICAR las consultas de los usuarios, COTIZAR productos y precios, y REGISTRAR información (pedidos, contactos, etc.). IMPORTANTE: NUNCA vendas ni confirmes pagos. Solo proporciona información, cotizaciones y registra datos. Las ventas y confirmaciones de pago deben ser manejadas por agentes humanos.',
                    temperature: data.temperature ?? 0.7,
                    maxTokens: data.maxTokens ?? 500,
                    model: data.model || 'deepseek-chat',
                    contextMessages: data.contextMessages ?? 5,
                    classificationCategories: data.classificationCategories || ['ventas', 'soporte', 'facturacion', 'otros'],
                    orderInstructions: data.orderInstructions,
                    locationInstructions: data.locationInstructions,
                    locationKeywords: data.locationKeywords,
                    autoCreateOrderOnPaymentRequest: data.autoCreateOrderOnPaymentRequest ?? false,
                    autoSendQRImages: data.autoSendQRImages ?? true,
                    notifyOrderStatusChanges: data.notifyOrderStatusChanges ?? true,
                    findNearestBranchOnLocationShare: data.findNearestBranchOnLocationShare ?? true,
                    showLocationInstructions: data.showLocationInstructions ?? true,
                    prepareOrderInsteadOfCreate: data.prepareOrderInsteadOfCreate ?? true,
                    extractOrderFromContext: data.extractOrderFromContext ?? true,
                },
            });
        }
        else {
            config = await this.prisma.botConfig.update({
                where: { id: config.id },
                data,
            });
        }
        return config;
    }
    async generateResponse(conversationId, userMessage) {
        try {
            this.logger.debug(`[generateResponse] Iniciando generación de respuesta para conversación: ${conversationId}`);
            this.logger.debug(`[generateResponse] Mensaje del usuario: ${userMessage.substring(0, 100)}...`);
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    user: true,
                    assignedAgent: true,
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
            });
            if (!conversation) {
                this.logger.warn(`[generateResponse] Conversación no encontrada: ${conversationId}`);
                return null;
            }
            if (conversation.mode !== 'BOT') {
                this.logger.debug(`[generateResponse] Conversación no está en modo BOT, modo actual: ${conversation.mode}`);
                return null;
            }
            this.logger.debug(`[generateResponse] Obteniendo configuración del bot...`);
            const config = await this.getBotConfig();
            this.logger.debug(`[generateResponse] Config obtenida - Modelo: ${config.model}, Temperature: ${config.temperature}, MaxTokens: ${config.maxTokens}`);
            this.logger.debug(`[generateResponse] Construyendo contexto de mensajes (${conversation.messages.length} mensajes disponibles)`);
            const contextMessages = conversation.messages
                .reverse()
                .slice(-config.contextMessages)
                .map((msg) => ({
                role: (msg.sender === 'user' ? 'user' : 'assistant'),
                content: msg.content,
            }));
            this.logger.debug(`[generateResponse] Contexto construido con ${contextMessages.length} mensajes`);
            this.logger.debug(`[generateResponse] Construyendo system prompt...`);
            let systemPrompt = config.systemPrompt;
            if (conversation.tag) {
                systemPrompt += `\nTag:${conversation.tag}`;
            }
            if (conversation.assignedAgent) {
                systemPrompt += `\nAgent:${conversation.assignedAgent.name}`;
            }
            if (conversation.user.tags.length > 0) {
                systemPrompt += `\nUserTags:[${conversation.user.tags.join('|')}]`;
            }
            this.logger.debug(`[generateResponse] System prompt base length: ${systemPrompt.length} caracteres`);
            try {
                const products = await this.prisma.product.findMany({
                    include: {
                        category: {
                            include: {
                                parent: {
                                    include: {
                                        parent: {
                                            include: {
                                                parent: {
                                                    include: {
                                                        parent: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { name: 'asc' },
                });
                if (products && products.length > 0) {
                    const productsByCategory = {};
                    for (const product of products) {
                        let categoryName = 'Sin categoría';
                        if (product.category) {
                            const path = [];
                            let current = product.category;
                            while (current) {
                                path.unshift(current.name);
                                current = current.parent;
                            }
                            categoryName = path.join(' > ');
                        }
                        if (!productsByCategory[categoryName]) {
                            productsByCategory[categoryName] = [];
                        }
                        productsByCategory[categoryName].push(product);
                    }
                    systemPrompt += '\nProducts:';
                    for (const [category, categoryProducts] of Object.entries(productsByCategory)) {
                        const toonProducts = categoryProducts.map(p => `name:${p.name} price:${p.price.toFixed(2)} desc:${p.description.substring(0, 100)}`).join('|');
                        systemPrompt += `\n${category}:[${toonProducts}]`;
                    }
                    systemPrompt += '\nUse Products data when asked. Format: name:value price:value desc:value';
                }
            }
            catch (error) {
                this.logger.warn('Error loading products for bot context:', error);
            }
            try {
                const branches = await this.branchesService.findAll(true);
                if (branches && branches.length > 0) {
                    const toonBranches = branches.map(b => {
                        const parts = [
                            `name:${b.name}`,
                            `addr:${b.address}`,
                            b.phone ? `phone:${b.phone}` : '',
                            `lat:${b.latitude}`,
                            `lng:${b.longitude}`,
                            b.openingHours ? `hours:${b.openingHours.replace(/\n/g, ' ')}` : '',
                            b.description ? `desc:${b.description.substring(0, 80)}` : ''
                        ].filter(p => p).join(' ');
                        return parts;
                    }).join('|');
                    systemPrompt += `\nBranches:[${toonBranches}]`;
                    systemPrompt += '\nUse Branches data for location queries. Format: name:value addr:value phone:value lat:value lng:value hours:value';
                    if (config.locationInstructions) {
                        systemPrompt += `\n${config.locationInstructions}`;
                    }
                }
            }
            catch (error) {
                this.logger.warn('Error loading branches for bot context:', error);
            }
            systemPrompt += `\nTopics:${config.classificationCategories.join('|')}`;
            if (config.orderInstructions) {
                systemPrompt += `\n\n${config.orderInstructions}`;
            }
            const functions = config.prepareOrderInsteadOfCreate ? [
                {
                    name: 'prepare_order',
                    description: 'REGISTRA la información de un pedido para que un agente humano lo procese después. Usa esta función paso a paso: PRIMERO cuando el usuario mencione productos (solo items), SEGUNDO cuando mencione la sucursal (agregar branchName). Esta función SOLO REGISTRA información, NO crea el pedido. Después de registrar toda la información, informa al usuario que un agente se encargará de procesar el pedido.',
                    parameters: {
                        type: 'object',
                        properties: {
                            branchName: {
                                type: 'string',
                                description: 'Nombre de la sucursal donde se creará el pedido. Solo incluye esto cuando el usuario haya especificado la sucursal.',
                            },
                            items: {
                                type: 'array',
                                description: 'Lista de productos con sus cantidades. Incluye esto cuando el usuario mencione productos.',
                                items: {
                                    type: 'object',
                                    properties: {
                                        productName: {
                                            type: 'string',
                                            description: 'Nombre exacto del producto',
                                        },
                                        quantity: {
                                            type: 'number',
                                            description: 'Cantidad del producto',
                                        },
                                    },
                                    required: ['productName', 'quantity'],
                                },
                            },
                            notes: {
                                type: 'string',
                                description: 'Notas adicionales del pedido (opcional)',
                            },
                        },
                        required: ['items'],
                    },
                },
            ] : [
                {
                    name: 'create_order',
                    description: 'Crea un pedido con los productos especificados. Usa esta función cuando el usuario confirme que quiere hacer el pedido.',
                    parameters: {
                        type: 'object',
                        properties: {
                            branchName: {
                                type: 'string',
                                description: 'Nombre de la sucursal donde se creará el pedido',
                            },
                            items: {
                                type: 'array',
                                description: 'Lista de productos con sus cantidades',
                                items: {
                                    type: 'object',
                                    properties: {
                                        productName: {
                                            type: 'string',
                                            description: 'Nombre exacto del producto',
                                        },
                                        quantity: {
                                            type: 'number',
                                            description: 'Cantidad del producto',
                                        },
                                    },
                                    required: ['productName', 'quantity'],
                                },
                            },
                            notes: {
                                type: 'string',
                                description: 'Notas adicionales del pedido (opcional)',
                            },
                        },
                        required: ['branchName', 'items'],
                    },
                },
            ];
            const modelToUse = config.model || 'deepseek-chat';
            this.logger.debug(`[generateResponse] Preparando llamada a API con modelo: ${modelToUse}`);
            this.logger.debug(`[generateResponse] API Key presente: ${!!(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY)}`);
            this.logger.debug(`[generateResponse] Base URL: ${this.openai.baseURL || 'default'}`);
            this.logger.debug(`[generateResponse] Total de mensajes en request: ${contextMessages.length + 2} (system + ${contextMessages.length} context + user)`);
            this.logger.debug(`[generateResponse] System prompt final length: ${systemPrompt.length} caracteres`);
            let completion;
            try {
                this.logger.debug(`[generateResponse] Haciendo llamada a API de DeepSeek...`);
                completion = await this.openai.chat.completions.create({
                    model: modelToUse,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...contextMessages,
                        { role: 'user', content: userMessage },
                    ],
                    temperature: config.temperature,
                    max_tokens: config.maxTokens,
                    functions: functions,
                    function_call: 'auto',
                });
                this.logger.debug(`[generateResponse] Respuesta recibida de API exitosamente`);
            }
            catch (apiError) {
                this.logger.error(`[generateResponse] Error en llamada a API:`, apiError);
                this.logger.error(`[generateResponse] Error message: ${apiError?.message}`);
                this.logger.error(`[generateResponse] Error code: ${apiError?.code}`);
                this.logger.error(`[generateResponse] Error status: ${apiError?.status}`);
                this.logger.error(`[generateResponse] Error response: ${JSON.stringify(apiError?.response || apiError?.error || 'N/A')}`);
                throw apiError;
            }
            this.logger.debug(`[generateResponse] Procesando respuesta de API...`);
            this.logger.debug(`[generateResponse] Choices recibidos: ${completion.choices?.length || 0}`);
            let response = completion.choices[0]?.message?.content?.trim() || null;
            const functionCall = completion.choices[0]?.message?.function_call;
            this.logger.debug(`[generateResponse] Response content: ${response ? `${response.substring(0, 100)}...` : 'null'}`);
            this.logger.debug(`[generateResponse] Function call: ${functionCall ? `${functionCall.name}` : 'none'}`);
            const paymentMethodKeywords = /(método|metodo|forma|como|dónde|donde).*(pago|pagar|transferencia|transferir|qr|cuenta|bancaria|banco)/i;
            const isAskingForPayment = paymentMethodKeywords.test(userMessage);
            const paymentConfirmationKeywords = /(pagaré|pagare|pagar|usaré|usare|usar|elegí|elige|elijo|confirmo|listo|ok|okay|sí|si|yes|con este|este método|método \d+|opción \d+|número \d+)/i;
            const isConfirmingPayment = paymentConfirmationKeywords.test(userMessage) &&
                (userMessage.includes('qr') || userMessage.includes('transferencia') || userMessage.includes('método') || userMessage.includes('pago') || /(\d+|uno|dos|tres|primero|segundo|tercero)/i.test(userMessage));
            if (isAskingForPayment && !isConfirmingPayment) {
                this.logger.debug(`[generateResponse] Usuario pregunta por métodos de pago (solo consulta)`);
                const paymentMethods = await this.prisma.paymentMethod.findMany({
                    where: { isActive: true },
                    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                });
                if (paymentMethods.length > 0) {
                    response = `💳 Métodos de Pago Disponibles:\n\n`;
                    const qrMethods = paymentMethods.filter(pm => pm.type === 'QR');
                    const bankMethods = paymentMethods.filter(pm => pm.type === 'BANK_ACCOUNT');
                    if (qrMethods.length > 0) {
                        response += `📱 QR Code:\n`;
                        qrMethods.forEach((pm, idx) => {
                            response += `${idx + 1}. ${pm.name}`;
                            if (pm.description)
                                response += ` - ${pm.description}`;
                            response += `\n`;
                        });
                        response += `\n`;
                    }
                    if (bankMethods.length > 0) {
                        response += `🏦 Transferencia Bancaria:\n`;
                        bankMethods.forEach((pm, idx) => {
                            response += `${idx + 1}. ${pm.name}`;
                            if (pm.bankName)
                                response += ` (${pm.bankName})`;
                            if (pm.accountNumber)
                                response += `\n   Cuenta: ${pm.accountNumber}`;
                            if (pm.accountType)
                                response += ` - ${pm.accountType}`;
                            if (pm.cci)
                                response += `\n   CCI: ${pm.cci}`;
                            if (pm.description)
                                response += `\n   ${pm.description}`;
                            response += `\n`;
                        });
                        response += `\n`;
                    }
                    response += `Por favor, confirma con qué método deseas pagar para proceder con tu pedido. 😊`;
                }
                else {
                    response = `No hay métodos de pago configurados en este momento. Por favor, contacta con un agente para más información.`;
                }
            }
            if (isConfirmingPayment && config.autoCreateOrderOnPaymentRequest) {
                this.logger.debug(`[generateResponse] Usuario confirma método de pago, creando pedido...`);
                const recentMessages = conversation.messages.slice(0, 10).reverse();
                const extractedOrder = config.extractOrderFromContext
                    ? await this.extractOrderFromContext(recentMessages)
                    : null;
                if (extractedOrder) {
                    this.logger.debug(`[generateResponse] Información de pedido encontrada en contexto, creando pedido...`);
                    this.logger.debug(`[generateResponse] Orden extraída: ${JSON.stringify(extractedOrder)}`);
                    const orderResult = await this.handleCreateOrder(conversation.user.id, extractedOrder);
                    if (orderResult.success) {
                        const paymentMethods = await this.prisma.paymentMethod.findMany({
                            where: { isActive: true },
                            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                        });
                        response = `✅ ¡Pedido creado exitosamente!\n\n` +
                            `📦 Pedido #${orderResult.orderId.substring(0, 8)}\n` +
                            `🏢 Sucursal: ${orderResult.branchName}\n` +
                            `📋 Items: ${orderResult.itemsSummary}\n` +
                            `💰 Total: Bs.${orderResult.total.toFixed(2)}\n\n` +
                            `Estado: Pendiente de Pago\n\n`;
                        if (paymentMethods.length > 0) {
                            response += `💳 Métodos de Pago Disponibles:\n\n`;
                            const qrMethods = paymentMethods.filter(pm => pm.type === 'QR');
                            const bankMethods = paymentMethods.filter(pm => pm.type === 'BANK_ACCOUNT');
                            if (qrMethods.length > 0) {
                                response += `📱 QR Code:\n`;
                                qrMethods.forEach((pm, idx) => {
                                    response += `${idx + 1}. ${pm.name}`;
                                    if (pm.description)
                                        response += ` - ${pm.description}`;
                                    response += `\n`;
                                });
                                response += `\n`;
                            }
                            if (bankMethods.length > 0) {
                                response += `🏦 Transferencia Bancaria:\n`;
                                bankMethods.forEach((pm, idx) => {
                                    response += `${idx + 1}. ${pm.name}`;
                                    if (pm.bankName)
                                        response += ` (${pm.bankName})`;
                                    if (pm.accountNumber)
                                        response += `\n   Cuenta: ${pm.accountNumber}`;
                                    if (pm.accountType)
                                        response += ` - ${pm.accountType}`;
                                    if (pm.cci)
                                        response += `\n   CCI: ${pm.cci}`;
                                    if (pm.description)
                                        response += `\n   ${pm.description}`;
                                    response += `\n`;
                                });
                                response += `\n`;
                            }
                            response.orderId = orderResult.orderId;
                            response.qrMethods = qrMethods;
                        }
                        response += `Gracias por tu pedido. Te contactaremos pronto para confirmar el pago. 😊`;
                    }
                    else {
                        response = `❌ Error al crear el pedido: ${orderResult.error}\n\nPor favor, verifica la información e intenta de nuevo.`;
                    }
                }
                else {
                    response = `No encuentro información de tu pedido. Por favor, primero indica los productos y la sucursal, luego pregunta por los métodos de pago.`;
                }
            }
            if (functionCall && functionCall.name === 'create_order' && !config.prepareOrderInsteadOfCreate) {
                try {
                    const args = JSON.parse(functionCall.arguments);
                    const orderResult = await this.handleCreateOrder(conversation.user.id, args);
                    if (orderResult.success) {
                        const paymentMethods = await this.prisma.paymentMethod.findMany({
                            where: { isActive: true },
                            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                        });
                        response = `✅ ¡Pedido creado exitosamente!\n\n` +
                            `📦 Pedido #${orderResult.orderId.substring(0, 8)}\n` +
                            `🏢 Sucursal: ${orderResult.branchName}\n` +
                            `📋 Items: ${orderResult.itemsSummary}\n` +
                            `💰 Total: Bs.${orderResult.total.toFixed(2)}\n\n` +
                            `Estado: Pendiente de Pago\n\n`;
                        if (paymentMethods.length > 0) {
                            response += `💳 Métodos de Pago Disponibles:\n\n`;
                            const qrMethods = paymentMethods.filter(pm => pm.type === 'QR');
                            const bankMethods = paymentMethods.filter(pm => pm.type === 'BANK_ACCOUNT');
                            if (qrMethods.length > 0) {
                                response += `📱 QR Code:\n`;
                                qrMethods.forEach((pm, idx) => {
                                    response += `${idx + 1}. ${pm.name}`;
                                    if (pm.description)
                                        response += ` - ${pm.description}`;
                                    response += `\n`;
                                });
                                response += `\n`;
                            }
                            if (bankMethods.length > 0) {
                                response += `🏦 Transferencia Bancaria:\n`;
                                bankMethods.forEach((pm, idx) => {
                                    response += `${idx + 1}. ${pm.name}`;
                                    if (pm.bankName)
                                        response += ` (${pm.bankName})`;
                                    if (pm.accountNumber)
                                        response += `\n   Cuenta: ${pm.accountNumber}`;
                                    if (pm.accountType)
                                        response += ` - ${pm.accountType}`;
                                    if (pm.cci)
                                        response += `\n   CCI: ${pm.cci}`;
                                    if (pm.description)
                                        response += `\n   ${pm.description}`;
                                    response += `\n`;
                                });
                                response += `\n`;
                            }
                        }
                        response += `Gracias por tu pedido. Te contactaremos pronto para confirmar el pago. 😊`;
                    }
                    else {
                        response = `❌ Error al crear el pedido: ${orderResult.error}\n\nPor favor, verifica la información e intenta de nuevo.`;
                    }
                }
                catch (error) {
                    this.logger.error('Error handling create_order function:', error);
                    response = `❌ Lo siento, hubo un error al procesar tu pedido. Por favor, intenta de nuevo o contacta con un agente.`;
                }
            }
            if (functionCall && functionCall.name === 'prepare_order' && config.prepareOrderInsteadOfCreate) {
                try {
                    const args = JSON.parse(functionCall.arguments);
                    const hasItems = args.items && args.items.length > 0;
                    const hasBranch = args.branchName && args.branchName.trim() !== '';
                    const allProducts = await this.prisma.product.findMany();
                    let total = 0;
                    const itemsSummary = [];
                    if (hasItems) {
                        for (const item of args.items || []) {
                            const product = allProducts.find((p) => p.name.toLowerCase() === item.productName.toLowerCase() ||
                                p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
                                item.productName.toLowerCase().includes(p.name.toLowerCase()));
                            if (product) {
                                const itemTotal = product.price * item.quantity;
                                total += itemTotal;
                                itemsSummary.push(`${product.name} x${item.quantity} (Bs.${itemTotal.toFixed(2)})`);
                            }
                        }
                    }
                    if (hasItems && !hasBranch) {
                        const branches = await this.branchesService.findAll(true);
                        const branchList = branches.map((b, idx) => `${idx + 1}. ${b.name}`).join('\n');
                        response = `📦 Productos agregados:\n${itemsSummary.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n` +
                            `💰 Subtotal: Bs.${total.toFixed(2)}\n\n` +
                            `🏢 Ahora necesito saber en qué sucursal deseas recibir tu pedido:\n\n${branchList}\n\n` +
                            `Por favor, indica el nombre de la sucursal.`;
                    }
                    else if (hasItems && hasBranch) {
                        const branches = await this.branchesService.findAll(true);
                        const branch = branches.find((b) => b.name.toLowerCase() === args.branchName.toLowerCase() ||
                            b.name.toLowerCase().includes(args.branchName.toLowerCase()) ||
                            args.branchName.toLowerCase().includes(b.name.toLowerCase()));
                        if (!branch) {
                            response = `❌ No encontré la sucursal "${args.branchName}". Por favor, verifica el nombre e intenta de nuevo.`;
                        }
                        else {
                            response = `📋 Resumen de tu pedido:\n\n` +
                                `🏢 Sucursal: ${branch.name}\n` +
                                `📦 Productos:\n${itemsSummary.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n` +
                                `💰 Total: Bs.${total.toFixed(2)}\n\n` +
                                `Para proceder con el pago, pregunta por los métodos de pago disponibles. Una vez que elijas un método, crearemos tu pedido. 😊`;
                        }
                    }
                    else {
                        response = `Por favor, indica los productos que deseas ordenar.`;
                    }
                    response.preparedOrder = args;
                }
                catch (error) {
                    this.logger.error('Error handling prepare_order function:', error);
                    response = `❌ Lo siento, hubo un error al preparar tu pedido. Por favor, intenta de nuevo o contacta con un agente.`;
                }
            }
            const locationKeywordsPattern = config.locationKeywords || 'ubicación|sucursal|tienda|local|dónde|más cercan|más próxim|necesito.*sucursal|busco.*sucursal';
            const locationKeywords = new RegExp(`(${locationKeywordsPattern})`, 'i');
            const isLocationQuery = locationKeywords.test(userMessage);
            const googleMapsUrlPattern = /(https?:\/\/)?(www\.)?(maps\.(google\.com|app\.goo\.gl)|google\.com\/maps|goo\.gl\/maps)[^\s]*/gi;
            const mapsMatch = userMessage.match(googleMapsUrlPattern);
            if (isLocationQuery && !mapsMatch && response && config.showLocationInstructions && config.locationInstructions) {
                let locationInstructionsText = config.locationInstructions;
                if (locationInstructionsText.includes('IMPORTANT:')) {
                    locationInstructionsText = locationInstructionsText.split('IMPORTANT:')[1].trim();
                }
                if (locationInstructionsText && !locationInstructionsText.includes('provide step-by-step')) {
                    response = response + `\n\n${locationInstructionsText}`;
                }
                else {
                    const defaultLocationInstructions = `\n\n📍 Para encontrar la sucursal más cercana a tu ubicación, necesito que compartas tu ubicación. Sigue estos pasos:\n\n` +
                        `1️⃣ Abre Google Maps en tu teléfono\n` +
                        `2️⃣ Toca el botón de "Compartir ubicación" o busca tu ubicación actual\n` +
                        `3️⃣ Toca "Compartir" y selecciona "Copiar enlace"\n` +
                        `4️⃣ Pega el enlace aquí en el chat\n\n` +
                        `Una vez que compartas tu ubicación, te mostraré la sucursal más cercana con la distancia y toda la información que necesites. 😊`;
                    response = response + defaultLocationInstructions;
                }
            }
            if (mapsMatch && mapsMatch.length > 0 && response && config.findNearestBranchOnLocationShare) {
                try {
                    const coords = await this.branchesService.extractCoordinatesFromGoogleMaps(mapsMatch[0]);
                    if (coords) {
                        const nearestBranch = await this.branchesService.findNearest(coords.latitude, coords.longitude);
                        if (nearestBranch) {
                            const distanceKm = nearestBranch.distance.toFixed(2);
                            response += `\n\n📍 Sucursal más cercana a tu ubicación:\n\n` +
                                `🏢 ${nearestBranch.name}\n` +
                                `📍 ${nearestBranch.address}\n` +
                                `📞 ${nearestBranch.phone || 'No disponible'}\n` +
                                `📏 Distancia: ${distanceKm} km`;
                            if (nearestBranch.openingHours) {
                                response += `\n\n🕐 Horarios de atención:\n${nearestBranch.openingHours}`;
                            }
                            if (nearestBranch.description) {
                                response += `\n\n${nearestBranch.description}`;
                            }
                        }
                    }
                }
                catch (error) {
                    this.logger.warn('Error finding nearest branch:', error);
                }
            }
            this.logger.debug(`[generateResponse] Respuesta final generada exitosamente`);
            return response;
        }
        catch (error) {
            this.logger.error(`[generateResponse] ERROR GENERAL al generar respuesta`);
            this.logger.error(`[generateResponse] Error type: ${error?.constructor?.name || typeof error}`);
            this.logger.error(`[generateResponse] Error message: ${error?.message || 'Sin mensaje'}`);
            this.logger.error(`[generateResponse] Error stack: ${error?.stack || 'Sin stack trace'}`);
            this.logger.error(`[generateResponse] Error code: ${error?.code || 'N/A'}`);
            this.logger.error(`[generateResponse] Error status: ${error?.status || 'N/A'}`);
            this.logger.error(`[generateResponse] Error response: ${JSON.stringify(error?.response || error?.error || 'N/A', null, 2)}`);
            if (error?.response) {
                this.logger.error(`[generateResponse] API Error Response Status: ${error.response.status}`);
                this.logger.error(`[generateResponse] API Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.error('Error generating bot response:', error);
            return 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
        }
    }
    async classifyIntent(message) {
        try {
            this.logger.debug(`[classifyIntent] Clasificando mensaje: ${message.substring(0, 50)}...`);
            const config = await this.getBotConfig();
            const categories = config.classificationCategories || ['ventas', 'soporte', 'facturacion', 'otros'];
            this.logger.debug(`[classifyIntent] Categorías disponibles: ${categories.join(', ')}`);
            const modelToUse = config.model || 'deepseek-chat';
            this.logger.debug(`[classifyIntent] Usando modelo: ${modelToUse}`);
            let completion;
            try {
                this.logger.debug(`[classifyIntent] Haciendo llamada a API para clasificar...`);
                completion = await this.openai.chat.completions.create({
                    model: modelToUse,
                    messages: [
                        {
                            role: 'system',
                            content: `Classify message. Respond with one word from: ${categories.join('|')}`,
                        },
                        { role: 'user', content: message },
                    ],
                    temperature: 0.3,
                    max_tokens: 10,
                });
                this.logger.debug(`[classifyIntent] Respuesta de clasificación recibida`);
            }
            catch (apiError) {
                this.logger.error(`[classifyIntent] Error en llamada a API:`, apiError);
                this.logger.error(`[classifyIntent] Error message: ${apiError?.message}`);
                this.logger.error(`[classifyIntent] Error code: ${apiError?.code}`);
                throw apiError;
            }
            const classification = completion.choices[0]?.message?.content?.trim().toLowerCase();
            this.logger.debug(`[classifyIntent] Clasificación raw: ${classification}`);
            const result = categories.find((cat) => classification?.includes(cat)) || categories[categories.length - 1] || 'otros';
            this.logger.debug(`[classifyIntent] Categoría final: ${result}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[classifyIntent] ERROR al clasificar intención`);
            this.logger.error(`[classifyIntent] Error type: ${error?.constructor?.name || typeof error}`);
            this.logger.error(`[classifyIntent] Error message: ${error?.message || 'Sin mensaje'}`);
            this.logger.error(`[classifyIntent] Error stack: ${error?.stack || 'Sin stack trace'}`);
            console.error('Error classifying intent:', error);
            return 'otros';
        }
    }
    async handleCreateOrder(userId, args) {
        try {
            this.logger.debug(`[handleCreateOrder] Iniciando creación de pedido para usuario: ${userId}`);
            this.logger.debug(`[handleCreateOrder] Args recibidos: ${JSON.stringify(args)}`);
            const branches = await this.branchesService.findAll(true);
            const branch = branches.find((b) => b.name.toLowerCase().includes(args.branchName.toLowerCase()) ||
                args.branchName.toLowerCase().includes(b.name.toLowerCase()));
            if (!branch) {
                this.logger.warn(`[handleCreateOrder] Sucursal no encontrada: ${args.branchName}`);
                return {
                    success: false,
                    error: `No se encontró la sucursal "${args.branchName}". Por favor, verifica el nombre.`,
                };
            }
            this.logger.debug(`[handleCreateOrder] Sucursal encontrada: ${branch.name} (${branch.id})`);
            const allProducts = await this.prisma.product.findMany();
            this.logger.debug(`[handleCreateOrder] Productos disponibles: ${allProducts.length}`);
            const orderItems = [];
            for (const item of args.items || []) {
                const product = allProducts.find((p) => p.name.toLowerCase() === item.productName.toLowerCase() ||
                    p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
                    item.productName.toLowerCase().includes(p.name.toLowerCase()));
                if (!product) {
                    this.logger.warn(`[handleCreateOrder] Producto no encontrado: ${item.productName}`);
                    return {
                        success: false,
                        error: `No se encontró el producto "${item.productName}". Por favor, verifica el nombre.`,
                    };
                }
                this.logger.debug(`[handleCreateOrder] Producto encontrado: ${product.name} (${product.id}), cantidad: ${item.quantity}, precio: ${product.price}`);
                orderItems.push({
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice: product.price,
                });
            }
            if (orderItems.length === 0) {
                this.logger.warn(`[handleCreateOrder] No se especificaron productos`);
                return {
                    success: false,
                    error: 'No se especificaron productos para el pedido.',
                };
            }
            this.logger.debug(`[handleCreateOrder] Creando pedido con ${orderItems.length} items en sucursal ${branch.id}`);
            const order = await this.ordersService.create({
                branchId: branch.id,
                userId: userId,
                items: orderItems,
                notes: args.notes || undefined,
            }, undefined);
            this.logger.log(`[handleCreateOrder] ✅ Pedido creado exitosamente en el sistema POS: ${order.id}`);
            this.logger.debug(`[handleCreateOrder] Pedido detalles - Total: ${order.total}, Items: ${order.items.length}, Estado: ${order.status}`);
            const itemsSummary = orderItems
                .map((item, idx) => {
                const product = allProducts.find((p) => p.id === item.productId);
                return `${idx + 1}. ${product?.name} x${item.quantity}`;
            })
                .join('\n');
            return {
                success: true,
                orderId: order.id,
                branchName: branch.name,
                itemsSummary,
                total: order.total,
            };
        }
        catch (error) {
            this.logger.error(`[handleCreateOrder] ❌ Error al crear pedido:`, error);
            this.logger.error(`[handleCreateOrder] Error message: ${error?.message}`);
            this.logger.error(`[handleCreateOrder] Error stack: ${error?.stack}`);
            return {
                success: false,
                error: error.message || 'Error desconocido al crear el pedido',
            };
        }
    }
    async extractOrderFromContext(messages) {
        try {
            this.logger.debug(`[extractOrderFromContext] Buscando información de pedido en ${messages.length} mensajes`);
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.sender === 'assistant' && msg.content) {
                    this.logger.debug(`[extractOrderFromContext] Revisando mensaje del asistente: ${msg.content.substring(0, 100)}...`);
                    if (msg.content.includes('Resumen de tu pedido')) {
                        this.logger.debug(`[extractOrderFromContext] Mensaje contiene resumen completo de pedido`);
                        const branchMatch = msg.content.match(/Sucursal:\s*([^\n]+)/i);
                        if (!branchMatch) {
                            this.logger.debug(`[extractOrderFromContext] No se encontró nombre de sucursal en resumen`);
                            continue;
                        }
                        const branchName = branchMatch[1].trim();
                        this.logger.debug(`[extractOrderFromContext] Sucursal encontrada: ${branchName}`);
                        let itemsMatches = msg.content.match(/(?:^\d+\.\s*)?([^(]+?)\s*x(\d+)\s*\(/gm);
                        if (!itemsMatches || itemsMatches.length === 0) {
                            itemsMatches = msg.content.match(/(?:^\d+\.\s*)?([^x\n]+?)\s*x(\d+)/gm);
                        }
                        if (!itemsMatches || itemsMatches.length === 0) {
                            itemsMatches = msg.content.match(/([^\n\d]+?)\s*x(\d+)/g);
                        }
                        if (!itemsMatches || itemsMatches.length === 0) {
                            this.logger.debug(`[extractOrderFromContext] No se encontraron items en el mensaje`);
                            continue;
                        }
                        this.logger.debug(`[extractOrderFromContext] Encontrados ${itemsMatches.length} items potenciales`);
                        const items = [];
                        const allProducts = await this.prisma.product.findMany();
                        for (const itemMatch of itemsMatches) {
                            let productName = '';
                            let quantity = 0;
                            const pattern1 = itemMatch.match(/\d+\.\s*([^(]+?)\s*x(\d+)\s*\(/);
                            if (pattern1) {
                                productName = pattern1[1].trim();
                                quantity = parseInt(pattern1[2].trim());
                            }
                            else {
                                const pattern2 = itemMatch.match(/([^x\n]+?)\s*x(\d+)/);
                                if (pattern2) {
                                    productName = pattern2[1].trim().replace(/^\d+\.\s*/, '');
                                    quantity = parseInt(pattern2[2].trim());
                                }
                            }
                            if (productName && quantity > 0) {
                                this.logger.debug(`[extractOrderFromContext] Intentando encontrar producto: "${productName}" x${quantity}`);
                                const product = allProducts.find((p) => {
                                    const pName = p.name.toLowerCase().trim();
                                    const searchName = productName.toLowerCase().trim();
                                    return pName === searchName ||
                                        pName.includes(searchName) ||
                                        searchName.includes(pName);
                                });
                                if (product) {
                                    this.logger.debug(`[extractOrderFromContext] Producto encontrado: ${product.name}`);
                                    items.push({
                                        productName: product.name,
                                        quantity: quantity,
                                    });
                                }
                                else {
                                    this.logger.debug(`[extractOrderFromContext] Producto no encontrado: "${productName}"`);
                                }
                            }
                        }
                        if (branchName && items.length > 0) {
                            this.logger.debug(`[extractOrderFromContext] ✅ Orden extraída exitosamente: ${branchName}, ${items.length} items`);
                            return {
                                branchName: branchName,
                                items: items,
                            };
                        }
                        else {
                            this.logger.debug(`[extractOrderFromContext] ⚠️ Orden incompleta: branchName=${!!branchName}, items=${items.length}`);
                        }
                    }
                }
            }
            this.logger.debug(`[extractOrderFromContext] ❌ No se encontró información de pedido en el contexto`);
            return null;
        }
        catch (error) {
            this.logger.error(`[extractOrderFromContext] Error extracting order: ${error.message}`);
            this.logger.error(`[extractOrderFromContext] Error stack: ${error.stack}`);
            return null;
        }
    }
};
exports.BotService = BotService;
exports.BotService = BotService = BotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => branches_service_1.BranchesService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_service_1.OrdersService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branches_service_1.BranchesService,
        orders_service_1.OrdersService])
], BotService);
//# sourceMappingURL=bot.service.js.map