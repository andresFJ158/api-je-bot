import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { OrdersService } from '../orders/orders.service';
import OpenAI from 'openai';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BranchesService))
    private branchesService: BranchesService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    this.logger.debug(`[BotService] Inicializando cliente de IA...`);
    this.logger.debug(`[BotService] API Key presente: ${!!apiKey}`);
    this.logger.debug(`[BotService] Usando DEEPSEEK_API_KEY: ${!!process.env.DEEPSEEK_API_KEY}`);
    this.logger.debug(`[BotService] Usando OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY}`);

    if (apiKey) {
      // Mostrar primeros y últimos caracteres de la API key para debugging (sin exponerla completa)
      const maskedKey = apiKey.length > 8
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : '****';
      this.logger.debug(`[BotService] API Key (parcial): ${maskedKey} (longitud: ${apiKey.length})`);
    } else {
      this.logger.error(`[BotService] ADVERTENCIA: No se encontró DEEPSEEK_API_KEY ni OPENAI_API_KEY en variables de entorno`);
      this.logger.error(`[BotService] Por favor, configura DEEPSEEK_API_KEY en el archivo .env del backend`);
    }

    this.openai = new OpenAI({
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
            systemPrompt:
              'Eres un Asistente Virtual (Chatbot) que actúa como punto de entrada del cliente. Tu función es: CLASIFICAR las consultas de los usuarios, COTIZAR productos y precios, y REGISTRAR información (pedidos, contactos, etc.). IMPORTANTE: NUNCA vendas ni confirmes pagos. Solo proporciona información, cotizaciones y registra datos. Las ventas y confirmaciones de pago deben ser manejadas por agentes humanos.',
            temperature: 0.7,
            maxTokens: 500,
            model: 'deepseek-chat',
            contextMessages: 5,
            classificationCategories: ['ventas', 'soporte', 'facturacion', 'otros'],
            orderInstructions: 'REGLAS CRÍTICAS PARA PEDIDOS:\n\n1. NUNCA vendas ni confirmes pagos. Tu función es solo REGISTRAR información de pedidos.\n2. Cuando el usuario quiera hacer un pedido (pedido, comprar, quiero, necesito productos):\n   - Usa prepare_order para RECOPILAR información: productos, cantidades, sucursal\n   - Proporciona cotizaciones y precios\n   - Muestra métodos de pago disponibles si el usuario pregunta\n   - NUNCA crees el pedido directamente\n   - NUNCA confirmes que el pago fue recibido\n3. Después de recopilar toda la información del pedido, informa al usuario que un agente humano se encargará de procesar el pedido y confirmar el pago.\n4. Formato para pedidos: Lista productos como "product_name:quantity" (ej: "Producto A:2, Producto B:1")\n\nRECUERDA: Solo REGISTRAS y COTIZAS. NO vendes ni confirmas pagos.',
            locationInstructions: `Para mostrarte la **ubicación más cercana** a ti, necesito que compartas tu ubicación en tiempo real.

**¿Cómo compartir tu ubicación desde Google Maps?**
1.  Abre la aplicación **Google Maps** en tu teléfono.
2.  Mantén presionado el **punto azul** que muestra tu ubicación actual.
3.  Selecciona la opción **"Compartir ubicación"**.
4.  Elige la duración (por ejemplo, 15 minutos).
5.  Copia el enlace generado y **pégalo aquí en el chat**.

**¿Cómo compartir tu ubicación directamente en WhatsApp?**
1.  En nuestro chat de WhatsApp, toca el clip 📎.
2.  Selecciona **"Ubicación"**.
3.  Elige **"Compartir ubicación en tiempo real"**.
4.  Selecciona la duración y envíala.

**Una vez que comparta su ubicación, podré:**
*   Indicarte cuál de nuestras sucursales en Santa Cruz te queda más cerca.
*   Darte la dirección exacta, teléfono y horarios.
*   Calcular la mejor ruta para llegar.

**Nuestras sucursales en Santa Cruz son:**
*   **Kokun Remanso:** Av. El Remanso. Horario: 09:00-21:00 todos los días.
*   **Oficina Santa Cruz:** Esquina Sucre & Cobija. Horario: L-V 08:00-12:00 y 14:30-18:30, Sáb 08:00-13:00.

¿En qué más puedo ayudarte?`,
            locationKeywords: 'ubicación|sucursal|tienda|local|dónde|más cercan|más próxim|necesito.*sucursal|busco.*sucursal',
            autoCreateOrderOnPaymentRequest: false,
            autoSendQRImages: true,
            notifyOrderStatusChanges: true,
            findNearestBranchOnLocationShare: true,
            showLocationInstructions: true,
            prepareOrderInsteadOfCreate: true,
            extractOrderFromContext: true,
          } as any, // Use type assertion to allow new fields that may not exist in DB yet
        });
        this.logger.debug('Default bot config created');
      }

      // Ensure all new message fields are present (set to null if they don't exist in DB yet)
      const configWithDefaults = {
        ...config,
        orderSuccessMessage: (config as any).orderSuccessMessage || null,
        orderErrorMessage: (config as any).orderErrorMessage || null,
        orderNotFoundMessage: (config as any).orderNotFoundMessage || null,
        orderPrepareErrorMessage: (config as any).orderPrepareErrorMessage || null,
        paymentMethodsMessage: (config as any).paymentMethodsMessage || null,
        paymentMethodsNotFoundMessage: (config as any).paymentMethodsNotFoundMessage || null,
        locationDefaultMessage: (config as any).locationDefaultMessage || null,
        nearestBranchMessage: (config as any).nearestBranchMessage || null,
        generalErrorMessage: (config as any).generalErrorMessage || null,
        branchNotFoundMessage: (config as any).branchNotFoundMessage || null,
        productsRequiredMessage: (config as any).productsRequiredMessage || null,
        paymentConfirmationMessage: (config as any).paymentConfirmationMessage || null,
      };

      return configWithDefaults;
    } catch (error: any) {
      this.logger.error(`Error getting bot config: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }

      // If error is due to missing columns, try to get config with only existing fields
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
        this.logger.warn('New columns may not exist in database yet. Attempting to fetch with basic fields only...');
        try {
          // Use raw query to get only fields that exist
          const result = await this.prisma.$queryRaw`
            SELECT 
              id, "systemPrompt", temperature, "maxTokens", model, "contextMessages", 
              "classificationCategories", "orderInstructions", "locationInstructions", 
              "locationKeywords", "autoCreateOrderOnPaymentRequest", "autoSendQRImages",
              "notifyOrderStatusChanges", "findNearestBranchOnLocationShare", 
              "showLocationInstructions", "prepareOrderInsteadOfCreate", 
              "extractOrderFromContext", "updatedAt", "updatedBy"
            FROM bot_config
            LIMIT 1
          ` as any[];

          if (result && result.length > 0) {
            const basicConfig = result[0];
            // Add null values for new fields
            return {
              ...basicConfig,
              orderSuccessMessage: null,
              orderErrorMessage: null,
              orderNotFoundMessage: null,
              orderPrepareErrorMessage: null,
              paymentMethodsMessage: null,
              paymentMethodsNotFoundMessage: null,
              locationDefaultMessage: null,
              nearestBranchMessage: null,
              generalErrorMessage: null,
              branchNotFoundMessage: null,
              productsRequiredMessage: null,
              paymentConfirmationMessage: null,
            };
          }
        } catch (rawError) {
          this.logger.error(`Error fetching config with raw query: ${rawError.message}`);
        }
      }

      throw error;
    }
  }

  async updateBotConfig(data: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    contextMessages?: number;
    classificationCategories?: string[];
    orderInstructions?: string;
    locationInstructions?: string;
    locationKeywords?: string;
    orderSuccessMessage?: string;
    orderErrorMessage?: string;
    orderNotFoundMessage?: string;
    orderPrepareErrorMessage?: string;
    paymentMethodsMessage?: string;
    paymentMethodsNotFoundMessage?: string;
    locationDefaultMessage?: string;
    nearestBranchMessage?: string;
    generalErrorMessage?: string;
    branchNotFoundMessage?: string;
    productsRequiredMessage?: string;
    paymentConfirmationMessage?: string;
    autoCreateOrderOnPaymentRequest?: boolean;
    autoSendQRImages?: boolean;
    notifyOrderStatusChanges?: boolean;
    findNearestBranchOnLocationShare?: boolean;
    showLocationInstructions?: boolean;
    prepareOrderInsteadOfCreate?: boolean;
    extractOrderFromContext?: boolean;
  }) {
    try {
      this.logger.debug('[updateBotConfig] Iniciando actualización de configuración');

      // Try to get config - use raw query first to avoid errors if new columns don't exist
      // This is safer than using findFirst() which may try to validate all fields
      let config: any = null;
      try {
        // First try with raw query to get only existing fields
        const result = await this.prisma.$queryRaw`
          SELECT 
            id, "systemPrompt", temperature, "maxTokens", model, "contextMessages", 
            "classificationCategories", "orderInstructions", "locationInstructions", 
            "locationKeywords", "autoCreateOrderOnPaymentRequest", "autoSendQRImages",
            "notifyOrderStatusChanges", "findNearestBranchOnLocationShare", 
            "showLocationInstructions", "prepareOrderInsteadOfCreate", 
            "extractOrderFromContext", "updatedAt", "updatedBy"
          FROM bot_config
          LIMIT 1
        ` as any[];

        if (result && result.length > 0) {
          config = result[0];
        }
      } catch (rawError: any) {
        // If raw query fails, try with Prisma select (in case schema is updated)
        this.logger.warn('[updateBotConfig] Raw query failed, trying Prisma select...');
        try {
          config = await this.prisma.botConfig.findFirst({
            select: {
              id: true,
              systemPrompt: true,
              temperature: true,
              maxTokens: true,
              model: true,
              contextMessages: true,
              classificationCategories: true,
              orderInstructions: true,
              locationInstructions: true,
              locationKeywords: true,
              autoCreateOrderOnPaymentRequest: true,
              autoSendQRImages: true,
              notifyOrderStatusChanges: true,
              findNearestBranchOnLocationShare: true,
              showLocationInstructions: true,
              prepareOrderInsteadOfCreate: true,
              extractOrderFromContext: true,
              updatedAt: true,
              updatedBy: true,
            },
          });
        } catch (prismaError: any) {
          // If both fail, log and rethrow
          this.logger.error(`[updateBotConfig] Both raw query and Prisma select failed: ${prismaError.message}`);
          throw prismaError;
        }
      }

      if (!config) {
        // Create new config - only use fields that exist in DB
        const createData: any = {
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
        };

        // Try to add new message fields if they exist in DB
        try {
          config = await this.prisma.botConfig.create({
            data: {
              ...createData,
              // New configurable message fields - using type assertion until Prisma Client is regenerated
              ...(data.orderSuccessMessage && { orderSuccessMessage: data.orderSuccessMessage } as any),
              ...(data.orderErrorMessage && { orderErrorMessage: data.orderErrorMessage } as any),
              ...(data.orderNotFoundMessage && { orderNotFoundMessage: data.orderNotFoundMessage } as any),
              ...(data.orderPrepareErrorMessage && { orderPrepareErrorMessage: data.orderPrepareErrorMessage } as any),
              ...(data.paymentMethodsMessage && { paymentMethodsMessage: data.paymentMethodsMessage } as any),
              ...(data.paymentMethodsNotFoundMessage && { paymentMethodsNotFoundMessage: data.paymentMethodsNotFoundMessage } as any),
              ...(data.locationDefaultMessage && { locationDefaultMessage: data.locationDefaultMessage } as any),
              ...(data.nearestBranchMessage && { nearestBranchMessage: data.nearestBranchMessage } as any),
              ...(data.generalErrorMessage && { generalErrorMessage: data.generalErrorMessage } as any),
              ...(data.branchNotFoundMessage && { branchNotFoundMessage: data.branchNotFoundMessage } as any),
              ...(data.productsRequiredMessage && { productsRequiredMessage: data.productsRequiredMessage } as any),
              ...(data.paymentConfirmationMessage && { paymentConfirmationMessage: data.paymentConfirmationMessage } as any),
            } as any,
          });
        } catch (createError: any) {
          // If error is due to missing columns, create without new fields
          if (createError.code === '42703' || createError.message?.includes('column') || createError.message?.includes('does not exist')) {
            this.logger.warn('New message columns may not exist in database yet. Creating config without new message fields...');
            config = await this.prisma.botConfig.create({
              data: createData,
            });
          } else {
            throw createError;
          }
        }
      } else {
        // Separate existing fields from new message fields
        const existingFields: any = {
          systemPrompt: data.systemPrompt,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          model: data.model,
          contextMessages: data.contextMessages,
          classificationCategories: data.classificationCategories,
          orderInstructions: data.orderInstructions,
          locationInstructions: data.locationInstructions,
          locationKeywords: data.locationKeywords,
          autoCreateOrderOnPaymentRequest: data.autoCreateOrderOnPaymentRequest,
          autoSendQRImages: data.autoSendQRImages,
          notifyOrderStatusChanges: data.notifyOrderStatusChanges,
          findNearestBranchOnLocationShare: data.findNearestBranchOnLocationShare,
          showLocationInstructions: data.showLocationInstructions,
          prepareOrderInsteadOfCreate: data.prepareOrderInsteadOfCreate,
          extractOrderFromContext: data.extractOrderFromContext,
        };

        // Remove undefined values
        Object.keys(existingFields).forEach(key => {
          if (existingFields[key] === undefined) {
            delete existingFields[key];
          }
        });

        // New message fields (may not exist in DB yet)
        const newMessageFields: any = {
          orderSuccessMessage: data.orderSuccessMessage,
          orderErrorMessage: data.orderErrorMessage,
          orderNotFoundMessage: data.orderNotFoundMessage,
          orderPrepareErrorMessage: data.orderPrepareErrorMessage,
          paymentMethodsMessage: data.paymentMethodsMessage,
          paymentMethodsNotFoundMessage: data.paymentMethodsNotFoundMessage,
          locationDefaultMessage: data.locationDefaultMessage,
          nearestBranchMessage: data.nearestBranchMessage,
          generalErrorMessage: data.generalErrorMessage,
          branchNotFoundMessage: data.branchNotFoundMessage,
          productsRequiredMessage: data.productsRequiredMessage,
          paymentConfirmationMessage: data.paymentConfirmationMessage,
        };

        // Remove undefined values
        Object.keys(newMessageFields).forEach(key => {
          if (newMessageFields[key] === undefined) {
            delete newMessageFields[key];
          }
        });

        try {
          // Try to update with all fields first
          config = await this.prisma.botConfig.update({
            where: { id: config.id },
            data: {
              ...existingFields,
              ...newMessageFields,
            } as any,
          });
        } catch (error: any) {
          // If error is due to missing columns, update only existing fields
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            this.logger.warn('New message columns may not exist in database yet. Updating only existing fields...');
            config = await this.prisma.botConfig.update({
              where: { id: config.id },
              data: existingFields,
            });
            // Log that new fields were skipped
            if (Object.keys(newMessageFields).length > 0) {
              this.logger.warn(`Skipped updating new message fields (columns don't exist yet): ${Object.keys(newMessageFields).join(', ')}`);
              this.logger.warn('Please run: npx prisma migrate dev --name add_bot_config_messages');
            }
          } else {
            throw error;
          }
        }
      }

      // Ensure all new message fields are present in response (set to null if they don't exist in DB)
      const configWithDefaults = {
        ...config,
        orderSuccessMessage: (config as any).orderSuccessMessage || null,
        orderErrorMessage: (config as any).orderErrorMessage || null,
        orderNotFoundMessage: (config as any).orderNotFoundMessage || null,
        orderPrepareErrorMessage: (config as any).orderPrepareErrorMessage || null,
        paymentMethodsMessage: (config as any).paymentMethodsMessage || null,
        paymentMethodsNotFoundMessage: (config as any).paymentMethodsNotFoundMessage || null,
        locationDefaultMessage: (config as any).locationDefaultMessage || null,
        nearestBranchMessage: (config as any).nearestBranchMessage || null,
        generalErrorMessage: (config as any).generalErrorMessage || null,
        branchNotFoundMessage: (config as any).branchNotFoundMessage || null,
        productsRequiredMessage: (config as any).productsRequiredMessage || null,
        paymentConfirmationMessage: (config as any).paymentConfirmationMessage || null,
      };

      this.logger.debug('[updateBotConfig] Configuración actualizada exitosamente');
      return configWithDefaults;
    } catch (error: any) {
      this.logger.error(`[updateBotConfig] Error actualizando configuración: ${error.message}`);
      this.logger.error(`[updateBotConfig] Error stack: ${error.stack}`);
      if (error.code) {
        this.logger.error(`[updateBotConfig] Error code: ${error.code}`);
      }
      throw error;
    }
  }

  async generateResponse(conversationId: string, userMessage: string): Promise<string | null> {
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
            take: 5, // Reduced from 10 to save tokens
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

      // Check FAQs first - if a match is found, return the answer directly without using AI
      const faqMatch = await this.findFAQMatch(userMessage);
      if (faqMatch) {
        this.logger.log(`[generateResponse] FAQ match found: "${faqMatch.question}" - Returning automatic answer`);
        return faqMatch.answer;
      }

      this.logger.debug(`[generateResponse] Obteniendo configuración del bot...`);
      const config = await this.getBotConfig();
      this.logger.debug(`[generateResponse] Config obtenida - Modelo: ${config.model}, Temperature: ${config.temperature}, MaxTokens: ${config.maxTokens}`);

      // Build context - limit to configured number of messages to reduce tokens
      this.logger.debug(`[generateResponse] Construyendo contexto de mensajes (${conversation.messages.length} mensajes disponibles)`);
      const contextMessages = conversation.messages
        .reverse()
        .slice(-config.contextMessages) // Use configured number of messages
        .map((msg) => ({
          role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content,
        }));
      this.logger.debug(`[generateResponse] Contexto construido con ${contextMessages.length} mensajes`);

      // Build system prompt with context - optimized for token usage
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

      // Add products information using TOON format (Token-Oriented Object Notation)
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
          // Group by category and format in TOON
          const productsByCategory: Record<string, any[]> = {};
          for (const product of products) {
            // Build category path
            let categoryName = 'Sin categoría';
            if (product.category) {
              const path: string[] = [];
              let current: any = product.category;
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

          // Format in TOON: category:[name:value price:value desc:value|...]
          systemPrompt += '\nProducts:';
          for (const [category, categoryProducts] of Object.entries(productsByCategory)) {
            const toonProducts = categoryProducts.map(p =>
              `name:${p.name} price:${p.price.toFixed(2)} desc:${p.description.substring(0, 100)}`
            ).join('|');
            systemPrompt += `\n${category}:[${toonProducts}]`;
          }
          systemPrompt += '\nUse Products data when asked. Format: name:value price:value desc:value';
        }
      } catch (error) {
        this.logger.warn('Error loading products for bot context:', error);
      }

      // Add branches information using TOON format
      try {
        const branches = await this.branchesService.findAll(true); // Only active branches

        if (branches && branches.length > 0) {
          // Format in TOON: name:value addr:value phone:value lat:value lng:value hours:value desc:value
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
      } catch (error) {
        this.logger.warn('Error loading branches for bot context:', error);
      }

      // Add classification task - use configured categories
      systemPrompt += `\nTopics:${config.classificationCategories.join('|')}`;

      // Add order creation instructions from config
      if (config.orderInstructions) {
        systemPrompt += `\n\n${config.orderInstructions}`;
      }

      // Define function for preparing or creating order based on config
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
      } catch (apiError: any) {
        this.logger.error(`[generateResponse] Error en llamada a API:`, apiError);
        this.logger.error(`[generateResponse] Error message: ${apiError?.message}`);
        this.logger.error(`[generateResponse] Error code: ${apiError?.code}`);
        this.logger.error(`[generateResponse] Error status: ${apiError?.status}`);
        this.logger.error(`[generateResponse] Error response: ${JSON.stringify(apiError?.response || apiError?.error || 'N/A')}`);
        throw apiError; // Re-throw para que sea capturado por el catch principal
      }

      this.logger.debug(`[generateResponse] Procesando respuesta de API...`);
      this.logger.debug(`[generateResponse] Choices recibidos: ${completion.choices?.length || 0}`);

      let response = completion.choices[0]?.message?.content?.trim() || null;
      const functionCall = completion.choices[0]?.message?.function_call;

      this.logger.debug(`[generateResponse] Response content: ${response ? `${response.substring(0, 100)}...` : 'null'}`);
      this.logger.debug(`[generateResponse] Function call: ${functionCall ? `${functionCall.name}` : 'none'}`);

      // Check if user is asking for payment methods (just asking, not confirming)
      const paymentMethodKeywords = /(método|metodo|forma|como|dónde|donde).*(pago|pagar|transferencia|transferir|qr|cuenta|bancaria|banco)/i;
      const isAskingForPayment = paymentMethodKeywords.test(userMessage);

      // Check if user is confirming/selecting a payment method (not just asking)
      const paymentConfirmationKeywords = /(pagaré|pagare|pagar|usaré|usare|usar|elegí|elige|elijo|confirmo|listo|ok|okay|sí|si|yes|con este|este método|método \d+|opción \d+|número \d+)/i;
      const isConfirmingPayment = paymentConfirmationKeywords.test(userMessage) &&
        (userMessage.includes('qr') || userMessage.includes('transferencia') || userMessage.includes('método') || userMessage.includes('pago') || /(\d+|uno|dos|tres|primero|segundo|tercero)/i.test(userMessage));

      // If user is just asking for payment methods, show them (don't create order yet)
      if (isAskingForPayment && !isConfirmingPayment) {
        this.logger.debug(`[generateResponse] Usuario pregunta por métodos de pago (solo consulta)`);

        // Just show payment methods without creating order
        const paymentMethods = await this.prisma.paymentMethod.findMany({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });

        if (paymentMethods.length > 0) {
          // Use configured message or build default
          const paymentMethodsText = (config as any).paymentMethodsMessage || `💳 Métodos de Pago Disponibles:\n\n`;
          response = paymentMethodsText;

          const qrMethods = paymentMethods.filter(pm => pm.type === 'QR');
          const bankMethods = paymentMethods.filter(pm => pm.type === 'BANK_ACCOUNT');

          if (qrMethods.length > 0) {
            response += `📱 QR Code:\n`;
            qrMethods.forEach((pm, idx) => {
              response += `${idx + 1}. ${pm.name}`;
              if (pm.description) response += ` - ${pm.description}`;
              response += `\n`;
            });
            response += `\n`;
          }

          if (bankMethods.length > 0) {
            response += `🏦 Transferencia Bancaria:\n`;
            bankMethods.forEach((pm, idx) => {
              response += `${idx + 1}. ${pm.name}`;
              if (pm.bankName) response += ` (${pm.bankName})`;
              if (pm.accountNumber) response += `\n   Cuenta: ${pm.accountNumber}`;
              if (pm.accountType) response += ` - ${pm.accountType}`;
              if (pm.cci) response += `\n   CCI: ${pm.cci}`;
              if (pm.description) response += `\n   ${pm.description}`;
              response += `\n`;
            });
            response += `\n`;
          }

          const confirmationText = (config as any).paymentConfirmationMessage || `Por favor, confirma con qué método deseas pagar para proceder con tu pedido. 😊`;
          response += confirmationText;
        } else {
          response = (config as any).paymentMethodsNotFoundMessage || `No hay métodos de pago configurados en este momento. Por favor, contacta con un agente para más información.`;
        }
      }

      // If user is confirming payment method, create the order
      if (isConfirmingPayment && config.autoCreateOrderOnPaymentRequest) {
        this.logger.debug(`[generateResponse] Usuario confirma método de pago, creando pedido...`);

        // Try to extract order information from recent context
        const recentMessages = conversation.messages.slice(0, 10).reverse();

        // Extract order info from context
        const extractedOrder = config.extractOrderFromContext
          ? await this.extractOrderFromContext(recentMessages)
          : null;

        if (extractedOrder) {
          this.logger.debug(`[generateResponse] Información de pedido encontrada en contexto, creando pedido...`);
          this.logger.debug(`[generateResponse] Orden extraída: ${JSON.stringify(extractedOrder)}`);

          const orderResult = await this.handleCreateOrder(conversation.user.id, extractedOrder);

          if (orderResult.success) {
            // Get active payment methods
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

            // Add payment methods information
            if (paymentMethods.length > 0) {
              response += `💳 Métodos de Pago Disponibles:\n\n`;

              const qrMethods = paymentMethods.filter(pm => pm.type === 'QR');
              const bankMethods = paymentMethods.filter(pm => pm.type === 'BANK_ACCOUNT');

              if (qrMethods.length > 0) {
                response += `📱 QR Code:\n`;
                qrMethods.forEach((pm, idx) => {
                  response += `${idx + 1}. ${pm.name}`;
                  if (pm.description) response += ` - ${pm.description}`;
                  response += `\n`;
                });
                response += `\n`;
              }

              if (bankMethods.length > 0) {
                response += `🏦 Transferencia Bancaria:\n`;
                bankMethods.forEach((pm, idx) => {
                  response += `${idx + 1}. ${pm.name}`;
                  if (pm.bankName) response += ` (${pm.bankName})`;
                  if (pm.accountNumber) response += `\n   Cuenta: ${pm.accountNumber}`;
                  if (pm.accountType) response += ` - ${pm.accountType}`;
                  if (pm.cci) response += `\n   CCI: ${pm.cci}`;
                  if (pm.description) response += `\n   ${pm.description}`;
                  response += `\n`;
                });
                response += `\n`;
              }

              // Store order ID and QR methods for WhatsApp service to send images
              (response as any).orderId = orderResult.orderId;
              (response as any).qrMethods = qrMethods;
            }

            const thankYouMessage = (config as any).paymentConfirmationMessage || `Gracias por tu pedido. Te contactaremos pronto para confirmar el pago. 😊`;
            response += thankYouMessage;
          } else {
            const errorMessage = (config as any).orderErrorMessage || `❌ Error al crear el pedido: ${orderResult.error}\n\nPor favor, verifica la información e intenta de nuevo.`;
            response = errorMessage.replace(/\$\{error\}/g, orderResult.error || 'Error desconocido');
          }
        } else {
          // No order info found, ask user to provide order details first
          response = (config as any).orderNotFoundMessage || `No encuentro información de tu pedido. Por favor, primero indica los productos y la sucursal, luego pregunta por los métodos de pago.`;
        }
      }

      // Handle function call for creating orders directly (if prepareOrderInsteadOfCreate is false)
      if (functionCall && functionCall.name === 'create_order' && !config.prepareOrderInsteadOfCreate) {
        try {
          const args = JSON.parse(functionCall.arguments);
          const orderResult = await this.handleCreateOrder(conversation.user.id, args);

          if (orderResult.success) {
            // Get active payment methods
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

            // Add payment methods information
            if (paymentMethods.length > 0) {
              response += `💳 Métodos de Pago Disponibles:\n\n`;

              const qrMethods = paymentMethods.filter(pm => pm.type === 'QR');
              const bankMethods = paymentMethods.filter(pm => pm.type === 'BANK_ACCOUNT');

              if (qrMethods.length > 0) {
                response += `📱 QR Code:\n`;
                qrMethods.forEach((pm, idx) => {
                  response += `${idx + 1}. ${pm.name}`;
                  if (pm.description) response += ` - ${pm.description}`;
                  response += `\n`;
                });
                response += `\n`;
              }

              if (bankMethods.length > 0) {
                response += `🏦 Transferencia Bancaria:\n`;
                bankMethods.forEach((pm, idx) => {
                  response += `${idx + 1}. ${pm.name}`;
                  if (pm.bankName) response += ` (${pm.bankName})`;
                  if (pm.accountNumber) response += `\n   Cuenta: ${pm.accountNumber}`;
                  if (pm.accountType) response += ` - ${pm.accountType}`;
                  if (pm.cci) response += `\n   CCI: ${pm.cci}`;
                  if (pm.description) response += `\n   ${pm.description}`;
                  response += `\n`;
                });
                response += `\n`;
              }
            }

            const thankYouMessage = (config as any).paymentConfirmationMessage || `Gracias por tu pedido. Te contactaremos pronto para confirmar el pago. 😊`;
            response += thankYouMessage;
          } else {
            const errorMessage = (config as any).orderErrorMessage || `❌ Error al crear el pedido: ${orderResult.error}\n\nPor favor, verifica la información e intenta de nuevo.`;
            response = errorMessage.replace(/\$\{error\}/g, orderResult.error || 'Error desconocido');
          }
        } catch (error) {
          this.logger.error('Error handling create_order function:', error);
          response = (config as any).orderPrepareErrorMessage || (config as any).generalErrorMessage || `❌ Lo siento, hubo un error al procesar tu pedido. Por favor, intenta de nuevo o contacta con un agente.`;
        }
      }

      // Handle function call for preparing orders (not creating yet)
      if (functionCall && functionCall.name === 'prepare_order' && config.prepareOrderInsteadOfCreate) {
        try {
          const args = JSON.parse(functionCall.arguments);

          // Check what information we have
          const hasItems = args.items && args.items.length > 0;
          const hasBranch = args.branchName && args.branchName.trim() !== '';

          // Calculate total to show user
          const allProducts = await this.prisma.product.findMany();
          let total = 0;
          const itemsSummary = [];

          if (hasItems) {
            for (const item of args.items || []) {
              const product = allProducts.find(
                (p) => p.name.toLowerCase() === item.productName.toLowerCase() ||
                  p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
                  item.productName.toLowerCase().includes(p.name.toLowerCase())
              );

              if (product) {
                const itemTotal = product.price * item.quantity;
                total += itemTotal;
                itemsSummary.push(`${product.name} x${item.quantity} (Bs.${itemTotal.toFixed(2)})`);
              }
            }
          }

          // Step 1: Only products mentioned - ask for branch
          if (hasItems && !hasBranch) {
            const branches = await this.branchesService.findAll(true);
            const branchList = branches.map((b, idx) => `${idx + 1}. ${b.name}`).join('\n');

            response = `📦 Productos agregados:\n${itemsSummary.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n` +
              `💰 Subtotal: Bs.${total.toFixed(2)}\n\n` +
              `🏢 Ahora necesito saber en qué sucursal deseas recibir tu pedido:\n\n${branchList}\n\n` +
              `Por favor, indica el nombre de la sucursal.`;
          }
          // Step 2: Both products and branch - ask for payment method
          else if (hasItems && hasBranch) {
            // Verify branch exists
            const branches = await this.branchesService.findAll(true);
            const branch = branches.find(
              (b) => b.name.toLowerCase() === args.branchName.toLowerCase() ||
                b.name.toLowerCase().includes(args.branchName.toLowerCase()) ||
                args.branchName.toLowerCase().includes(b.name.toLowerCase())
            );

            if (!branch) {
              const branchNotFoundMsg = (config as any).branchNotFoundMessage || `❌ No encontré la sucursal "${args.branchName}". Por favor, verifica el nombre e intenta de nuevo.`;
              response = branchNotFoundMsg.replace('${branchName}', args.branchName || '');
            } else {
              response = `📋 Resumen de tu pedido:\n\n` +
                `🏢 Sucursal: ${branch.name}\n` +
                `📦 Productos:\n${itemsSummary.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n` +
                `💰 Total: Bs.${total.toFixed(2)}\n\n` +
                ((config as any).paymentConfirmationMessage || `Para proceder con el pago, pregunta por los métodos de pago disponibles. Una vez que elijas un método, crearemos tu pedido. 😊`);
            }
          }
          // Invalid state - should have items
          else {
            response = (config as any).productsRequiredMessage || `Por favor, indica los productos que deseas ordenar.`;
          }

          // Store order info in response metadata for later use
          (response as any).preparedOrder = args;
        } catch (error) {
          this.logger.error('Error handling prepare_order function:', error);
          response = (config as any).orderPrepareErrorMessage || (config as any).generalErrorMessage || `❌ Lo siento, hubo un error al preparar tu pedido. Por favor, intenta de nuevo o contacta con un agente.`;
        }
      }

      // Check if user is asking about location/branches but hasn't shared location
      const locationKeywordsPattern = config.locationKeywords || 'ubicación|sucursal|tienda|local|dónde|más cercan|más próxim|necesito.*sucursal|busco.*sucursal';
      const locationKeywords = new RegExp(`(${locationKeywordsPattern})`, 'i');
      const isLocationQuery = locationKeywords.test(userMessage);
      const googleMapsUrlPattern = /(https?:\/\/)?(www\.)?(maps\.(google\.com|app\.goo\.gl)|google\.com\/maps|goo\.gl\/maps)[^\s]*/gi;
      const mapsMatch = userMessage.match(googleMapsUrlPattern);

      // If user asks about location but hasn't shared it, replace response with instructions from config
      if (isLocationQuery && !mapsMatch && config.showLocationInstructions) {
        // If config has custom location instructions, use them completely (replace the response)
        if (config.locationInstructions && config.locationInstructions.trim()) {
          // Extract the instruction part from config (remove the IMPORTANT prefix if present)
          let locationInstructionsText = config.locationInstructions;
          if (locationInstructionsText.includes('IMPORTANT:')) {
            locationInstructionsText = locationInstructionsText.split('IMPORTANT:')[1].trim();
          }

          // Remove any "provide step-by-step" instructions as they are replaced by the actual message
          if (locationInstructionsText && !locationInstructionsText.includes('provide step-by-step')) {
            // Replace the entire response with the configured location instructions
            response = locationInstructionsText;
          } else {
            // If config only has the default instruction format, use configured default message
            response = (config as any).locationDefaultMessage || config.locationInstructions || `Para mostrarte la **ubicación más cercana** a ti, necesito que compartas tu ubicación en tiempo real.

**¿Cómo compartir tu ubicación desde Google Maps?**
1.  Abre la aplicación **Google Maps** en tu teléfono.
2.  Mantén presionado el **punto azul** que muestra tu ubicación actual.
3.  Selecciona la opción **"Compartir ubicación"**.
4.  Elige la duración (por ejemplo, 15 minutos).
5.  Copia el enlace generado y **pégalo aquí en el chat**.

**¿Cómo compartir tu ubicación directamente en WhatsApp?**
1.  En nuestro chat de WhatsApp, toca el clip 📎.
2.  Selecciona **"Ubicación"**.
3.  Elige **"Compartir ubicación en tiempo real"**.
4.  Selecciona la duración y envíala.

**Una vez que comparta su ubicación, podré:**
*   Indicarte cuál de nuestras sucursales en Santa Cruz te queda más cerca.
*   Darte la dirección exacta, teléfono y horarios.
*   Calcular la mejor ruta para llegar.

**Nuestras sucursales en Santa Cruz son:**
*   **Kokun Remanso:** Av. El Remanso. Horario: 09:00-21:00 todos los días.
*   **Oficina Santa Cruz:** Esquina Sucre & Cobija. Horario: L-V 08:00-12:00 y 14:30-18:30, Sáb 08:00-13:00.

¿En qué más puedo ayudarte?`;
          }
        } else {
          // Default instructions if no custom instructions are configured
          response = (config as any).locationDefaultMessage || config.locationInstructions || `Para mostrarte la **ubicación más cercana** a ti, necesito que compartas tu ubicación en tiempo real.

**¿Cómo compartir tu ubicación desde Google Maps?**
1.  Abre la aplicación **Google Maps** en tu teléfono.
2.  Mantén presionado el **punto azul** que muestra tu ubicación actual.
3.  Selecciona la opción **"Compartir ubicación"**.
4.  Elige la duración (por ejemplo, 15 minutos).
5.  Copia el enlace generado y **pégalo aquí en el chat**.

**¿Cómo compartir tu ubicación directamente en WhatsApp?**
1.  En nuestro chat de WhatsApp, toca el clip 📎.
2.  Selecciona **"Ubicación"**.
3.  Elige **"Compartir ubicación en tiempo real"**.
4.  Selecciona la duración y envíala.

**Una vez que comparta su ubicación, podré:**
*   Indicarte cuál de nuestras sucursales en Santa Cruz te queda más cerca.
*   Darte la dirección exacta, teléfono y horarios.
*   Calcular la mejor ruta para llegar.

**Nuestras sucursales en Santa Cruz son:**
*   **Kokun Remanso:** Av. El Remanso. Horario: 09:00-21:00 todos los días.
*   **Oficina Santa Cruz:** Esquina Sucre & Cobija. Horario: L-V 08:00-12:00 y 14:30-18:30, Sáb 08:00-13:00.

¿En qué más puedo ayudarte?`;
        }
      }

      // Check if user message contains a Google Maps link (including short links) and find nearest branch
      if (mapsMatch && mapsMatch.length > 0 && response && config.findNearestBranchOnLocationShare) {
        try {
          const coords = await this.branchesService.extractCoordinatesFromGoogleMaps(mapsMatch[0]);

          if (coords) {
            const nearestBranch = await this.branchesService.findNearest(
              coords.latitude,
              coords.longitude,
            );

            if (nearestBranch) {
              const distanceKm = nearestBranch.distance.toFixed(2);
              // Use configured message or build default
              const nearestBranchMsg = (config as any).nearestBranchMessage || `\n\n📍 Sucursal más cercana a tu ubicación:\n\n`;
              response += nearestBranchMsg +
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
        } catch (error) {
          this.logger.warn('Error finding nearest branch:', error);
        }
      }

      this.logger.debug(`[generateResponse] Respuesta final generada exitosamente`);
      return response;
    } catch (error: any) {
      this.logger.error(`[generateResponse] ERROR GENERAL al generar respuesta`);
      this.logger.error(`[generateResponse] Error type: ${error?.constructor?.name || typeof error}`);
      this.logger.error(`[generateResponse] Error message: ${error?.message || 'Sin mensaje'}`);
      this.logger.error(`[generateResponse] Error stack: ${error?.stack || 'Sin stack trace'}`);
      this.logger.error(`[generateResponse] Error code: ${error?.code || 'N/A'}`);
      this.logger.error(`[generateResponse] Error status: ${error?.status || 'N/A'}`);
      this.logger.error(`[generateResponse] Error response: ${JSON.stringify(error?.response || error?.error || 'N/A', null, 2)}`);

      // Log adicional para errores de API
      if (error?.response) {
        this.logger.error(`[generateResponse] API Error Response Status: ${error.response.status}`);
        this.logger.error(`[generateResponse] API Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }

      console.error('Error generating bot response:', error);
      // Get config for error message (may fail, so use try-catch)
      try {
        const errorConfig = await this.getBotConfig();
        return (errorConfig as any).generalErrorMessage || 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
      } catch {
        return 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
      }
    }
  }

  /**
   * Busca una pregunta frecuente que coincida con el mensaje del usuario
   * Retorna la respuesta automática si encuentra una coincidencia
   */
  private async findFAQMatch(userMessage: string): Promise<{ question: string; answer: string } | null> {
    try {
      // Obtener todas las FAQs activas
      // Note: Prisma converts model name 'FAQ' to 'fAQ' in the client
      let faqs: any[] = [];
      try {
        faqs = await (this.prisma as any).fAQ.findMany({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });
      } catch (prismaError: any) {
        // If FAQ model doesn't exist yet (migration not run), return null
        if (prismaError.code === 'P2001' || prismaError.message?.includes('does not exist') || prismaError.message?.includes('Unknown model')) {
          this.logger.debug('[findFAQMatch] FAQ model not found in database yet. Run migration to enable FAQs.');
          return null;
        }
        throw prismaError;
      }

      if (faqs.length === 0) {
        return null;
      }

      // Usar IA para detectar si el mensaje corresponde a alguna FAQ
      const matchedFAQ = await this.detectFAQWithAI(userMessage, faqs);

      if (matchedFAQ) {
        this.logger.log(`[findFAQMatch] AI detected FAQ match: "${matchedFAQ.question}" - Returning predefined answer`);
        return { question: matchedFAQ.question, answer: matchedFAQ.answer };
      }

      return null;
    } catch (error) {
      this.logger.error(`[findFAQMatch] Error searching FAQs: ${error.message}`);
      return null;
    }
  }

  /**
   * Usa IA para detectar si el mensaje del usuario corresponde a alguna FAQ
   * @param userMessage Mensaje del usuario
   * @param faqs Lista de FAQs activas
   * @returns La FAQ que mejor coincide con el mensaje, o null si no hay coincidencia
   */
  private async detectFAQWithAI(userMessage: string, faqs: any[]): Promise<{ question: string; answer: string } | null> {
    try {
      // Si no hay API key configurada, retornar null
      const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        this.logger.warn('[detectFAQWithAI] No API key found, skipping AI detection');
        return null;
      }

      // Construir el prompt para la IA
      const faqList = faqs.map((faq, index) => {
        const keywords = faq.keywords && faq.keywords.length > 0
          ? `Palabras clave: ${faq.keywords.join(', ')}`
          : '';
        return `${index + 1}. Pregunta: "${faq.question}"${keywords ? `\n   ${keywords}` : ''}`;
      }).join('\n\n');

      const prompt = `Eres un asistente que ayuda a identificar si un mensaje del usuario corresponde a alguna de las siguientes preguntas frecuentes (FAQs).

FAQs disponibles:
${faqList}

Mensaje del usuario: "${userMessage}"

INSTRUCCIONES:
1. Analiza el mensaje del usuario y determina si corresponde a alguna de las FAQs listadas.
2. Considera el significado y la intención del mensaje, no solo palabras exactas.
3. Si el mensaje corresponde a una FAQ, responde SOLO con el número de la FAQ (ej: "1", "2", "3", etc.).
4. Si el mensaje NO corresponde a ninguna FAQ, responde SOLO con "0".
5. Responde ÚNICAMENTE con el número, sin explicaciones ni texto adicional.

Respuesta:`;

      this.logger.debug(`[detectFAQWithAI] Sending request to AI to detect FAQ match for message: "${userMessage.substring(0, 50)}..."`);

      const completion = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en identificar si un mensaje corresponde a una pregunta frecuente. Responde solo con el número de la FAQ (1, 2, 3, etc.) o 0 si no hay coincidencia.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Baja temperatura para respuestas más consistentes
        max_tokens: 10, // Solo necesitamos un número
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim() || '';
      this.logger.debug(`[detectFAQWithAI] AI response: "${aiResponse}"`);

      // Extraer el número de la respuesta (puede venir como "1", "FAQ 1", "La FAQ 1 es", etc.)
      const match = aiResponse.match(/\d+/);
      if (match) {
        const faqIndex = parseInt(match[0], 10);

        // Validar que el índice esté en el rango válido
        if (faqIndex >= 1 && faqIndex <= faqs.length) {
          const matchedFAQ = faqs[faqIndex - 1]; // Convertir a índice base 0
          this.logger.log(`[detectFAQWithAI] ✅ AI matched message to FAQ #${faqIndex}: "${matchedFAQ.question}"`);
          return { question: matchedFAQ.question, answer: matchedFAQ.answer };
        } else if (faqIndex === 0) {
          this.logger.debug(`[detectFAQWithAI] AI determined message does not match any FAQ`);
          return null;
        } else {
          this.logger.warn(`[detectFAQWithAI] AI returned invalid FAQ index: ${faqIndex} (valid range: 1-${faqs.length})`);
          return null;
        }
      } else {
        this.logger.warn(`[detectFAQWithAI] Could not extract FAQ number from AI response: "${aiResponse}"`);
        return null;
      }
    } catch (error: any) {
      this.logger.error(`[detectFAQWithAI] Error using AI to detect FAQ: ${error.message}`);
      // En caso de error, retornar null para que el flujo continúe normalmente
      return null;
    }
  }

  async classifyIntent(message: string): Promise<string> {
    try {
      this.logger.debug(`[classifyIntent] Clasificando mensaje: ${message.substring(0, 50)}...`);
      const config = await this.getBotConfig();
      const categories = config.classificationCategories || ['ventas', 'soporte', 'facturacion', 'otros'];
      this.logger.debug(`[classifyIntent] Categorías disponibles: ${categories.join(', ')}`);

      const modelToUse = config.model || 'deepseek-chat';
      this.logger.debug(`[classifyIntent] Usando modelo: ${modelToUse}`);

      // Optimized prompt using TOON format
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
          max_tokens: 10, // Reduced from 20
        });
        this.logger.debug(`[classifyIntent] Respuesta de clasificación recibida`);
      } catch (apiError: any) {
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
    } catch (error: any) {
      this.logger.error(`[classifyIntent] ERROR al clasificar intención`);
      this.logger.error(`[classifyIntent] Error type: ${error?.constructor?.name || typeof error}`);
      this.logger.error(`[classifyIntent] Error message: ${error?.message || 'Sin mensaje'}`);
      this.logger.error(`[classifyIntent] Error stack: ${error?.stack || 'Sin stack trace'}`);
      console.error('Error classifying intent:', error);
      return 'otros';
    }
  }

  private async handleCreateOrder(userId: string, args: any): Promise<{
    success: boolean;
    orderId?: string;
    branchName?: string;
    itemsSummary?: string;
    total?: number;
    error?: string;
  }> {
    try {
      this.logger.debug(`[handleCreateOrder] Iniciando creación de pedido para usuario: ${userId}`);
      this.logger.debug(`[handleCreateOrder] Args recibidos: ${JSON.stringify(args)}`);

      // Find branch by name
      const branches = await this.branchesService.findAll(true);
      const branch = branches.find(
        (b) => b.name.toLowerCase().includes(args.branchName.toLowerCase()) ||
          args.branchName.toLowerCase().includes(b.name.toLowerCase())
      );

      if (!branch) {
        this.logger.warn(`[handleCreateOrder] Sucursal no encontrada: ${args.branchName}`);
        return {
          success: false,
          error: `No se encontró la sucursal "${args.branchName}". Por favor, verifica el nombre.`,
        };
      }

      this.logger.debug(`[handleCreateOrder] Sucursal encontrada: ${branch.name} (${branch.id})`);

      // Find products by name
      const allProducts = await this.prisma.product.findMany();
      this.logger.debug(`[handleCreateOrder] Productos disponibles: ${allProducts.length}`);

      const orderItems = [];
      for (const item of args.items || []) {
        const product = allProducts.find(
          (p) => p.name.toLowerCase() === item.productName.toLowerCase() ||
            p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
            item.productName.toLowerCase().includes(p.name.toLowerCase())
        );

        if (!product) {
          this.logger.warn(`[handleCreateOrder] Producto no encontrado: ${item.productName}`);
          return {
            success: false,
            error: `No se encontró el producto "${item.productName}". Por favor, verifica el nombre.`,
          };
        }

        this.logger.debug(`[handleCreateOrder] Producto encontrado: ${product.name} (${product.id}), cantidad: ${item.quantity}, precio: ${product.price}`);

        // Stock validation will be done by OrdersService

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

      // Create order using OrdersService (same service used by POS)
      const order = await this.ordersService.create(
        {
          branchId: branch.id,
          userId: userId,
          items: orderItems,
          notes: args.notes || undefined,
        },
        undefined, // No agentId for bot orders - this indicates it was created by the bot
      );

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
    } catch (error: any) {
      this.logger.error(`[handleCreateOrder] ❌ Error al crear pedido:`, error);
      this.logger.error(`[handleCreateOrder] Error message: ${error?.message}`);
      this.logger.error(`[handleCreateOrder] Error stack: ${error?.stack}`);
      return {
        success: false,
        error: error.message || 'Error desconocido al crear el pedido',
      };
    }
  }

  /**
   * Extract order information from conversation context messages
   * Looks for the most recent order summary that has both products and branch
   */
  private async extractOrderFromContext(messages: any[]): Promise<any | null> {
    try {
      this.logger.debug(`[extractOrderFromContext] Buscando información de pedido en ${messages.length} mensajes`);

      // Look for the most recent prepare_order function call result in assistant messages
      // We want the message that has BOTH products AND branch (the final summary)
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];

        // Check if this is an assistant message that contains order summary
        if (msg.sender === 'assistant' && msg.content) {
          this.logger.debug(`[extractOrderFromContext] Revisando mensaje del asistente: ${msg.content.substring(0, 100)}...`);

          // Look for order summary pattern: "Resumen de tu pedido" - this is the final summary with both products and branch
          if (msg.content.includes('Resumen de tu pedido')) {
            this.logger.debug(`[extractOrderFromContext] Mensaje contiene resumen completo de pedido`);

            // Try to extract branch name
            const branchMatch = msg.content.match(/Sucursal:\s*([^\n]+)/i);
            if (!branchMatch) {
              this.logger.debug(`[extractOrderFromContext] No se encontró nombre de sucursal en resumen`);
              continue;
            }

            const branchName = branchMatch[1].trim();
            this.logger.debug(`[extractOrderFromContext] Sucursal encontrada: ${branchName}`);

            // Try multiple patterns to extract items
            // Pattern 1: "1. Producto x2 (Bs.10.00)" or "Producto x2 (Bs.10.00)"
            let itemsMatches = msg.content.match(/(?:^\d+\.\s*)?([^(]+?)\s*x(\d+)\s*\(/gm);

            // Pattern 2: "1. Producto x2" or "Producto x2" (without price)
            if (!itemsMatches || itemsMatches.length === 0) {
              itemsMatches = msg.content.match(/(?:^\d+\.\s*)?([^x\n]+?)\s*x(\d+)/gm);
            }

            // Pattern 3: Just look for "x" followed by number (more flexible)
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
              // Try to extract product name and quantity
              let productName = '';
              let quantity = 0;

              // Pattern 1: "1. Producto x2 (Bs.10.00)"
              const pattern1 = itemMatch.match(/\d+\.\s*([^(]+?)\s*x(\d+)\s*\(/);
              if (pattern1) {
                productName = pattern1[1].trim();
                quantity = parseInt(pattern1[2].trim());
              } else {
                // Pattern 2: "Producto x2"
                const pattern2 = itemMatch.match(/([^x\n]+?)\s*x(\d+)/);
                if (pattern2) {
                  productName = pattern2[1].trim().replace(/^\d+\.\s*/, ''); // Remove leading number and dot
                  quantity = parseInt(pattern2[2].trim());
                }
              }

              if (productName && quantity > 0) {
                this.logger.debug(`[extractOrderFromContext] Intentando encontrar producto: "${productName}" x${quantity}`);

                // Find matching product
                const product = allProducts.find(
                  (p) => {
                    const pName = p.name.toLowerCase().trim();
                    const searchName = productName.toLowerCase().trim();
                    return pName === searchName ||
                      pName.includes(searchName) ||
                      searchName.includes(pName);
                  }
                );

                if (product) {
                  this.logger.debug(`[extractOrderFromContext] Producto encontrado: ${product.name}`);
                  items.push({
                    productName: product.name,
                    quantity: quantity,
                  });
                } else {
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
            } else {
              this.logger.debug(`[extractOrderFromContext] ⚠️ Orden incompleta: branchName=${!!branchName}, items=${items.length}`);
            }
          }
        }
      }

      this.logger.debug(`[extractOrderFromContext] ❌ No se encontró información de pedido en el contexto`);
      return null;
    } catch (error) {
      this.logger.error(`[extractOrderFromContext] Error extracting order: ${error.message}`);
      this.logger.error(`[extractOrderFromContext] Error stack: ${error.stack}`);
      return null;
    }
  }
}

