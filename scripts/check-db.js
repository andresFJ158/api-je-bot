"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, '../.env') });
const prisma = new client_1.PrismaClient();
async function checkDatabase() {
    try {
        console.log('🔍 Checking database connection...');
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        console.log('\n🔍 Checking tables...');
        try {
            const botConfigCount = await prisma.botConfig.count();
            console.log(`✅ BotConfig table exists (${botConfigCount} records)`);
        }
        catch (error) {
            console.error(`❌ BotConfig table error: ${error.message}`);
        }
        try {
            const conversationCount = await prisma.conversation.count();
            console.log(`✅ Conversation table exists (${conversationCount} records)`);
            const conversations = await prisma.conversation.findMany({
                select: { id: true, userId: true, assignedAgentId: true },
                take: 10,
            });
            for (const conv of conversations) {
                const userExists = await prisma.user.findUnique({
                    where: { id: conv.userId },
                });
                if (!userExists) {
                    console.warn(`⚠️  Conversation ${conv.id} has invalid userId: ${conv.userId}`);
                }
                if (conv.assignedAgentId) {
                    const agentExists = await prisma.agent.findUnique({
                        where: { id: conv.assignedAgentId },
                    });
                    if (!agentExists) {
                        console.warn(`⚠️  Conversation ${conv.id} has invalid assignedAgentId: ${conv.assignedAgentId}`);
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Conversation table error: ${error.message}`);
        }
        try {
            const userCount = await prisma.user.count();
            console.log(`✅ User table exists (${userCount} records)`);
        }
        catch (error) {
            console.error(`❌ User table error: ${error.message}`);
        }
        try {
            const agentCount = await prisma.agent.count();
            console.log(`✅ Agent table exists (${agentCount} records)`);
        }
        catch (error) {
            console.error(`❌ Agent table error: ${error.message}`);
        }
        console.log('\n🔍 Testing BotConfig query...');
        try {
            const config = await prisma.botConfig.findFirst();
            if (config) {
                console.log('✅ BotConfig query successful');
            }
            else {
                console.log('⚠️  No BotConfig found (will be created on first request)');
            }
        }
        catch (error) {
            console.error(`❌ BotConfig query error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
        console.log('\n🔍 Testing Conversations query...');
        try {
            const conversations = await prisma.conversation.findMany({
                take: 1,
                include: {
                    user: true,
                    assignedAgent: true,
                },
            });
            console.log('✅ Conversations query successful');
        }
        catch (error) {
            console.error(`❌ Conversations query error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            if (error.code) {
                console.error(`   Error code: ${error.code}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Database check failed:', error.message);
        console.error('   Stack:', error.stack);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkDatabase();
//# sourceMappingURL=check-db.js.map