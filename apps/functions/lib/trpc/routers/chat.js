"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const rag_1 = require("../../lib/rag");
const SourceSchema = zod_1.z.object({
    source: zod_1.z.string(),
    title: zod_1.z.string(),
    pageNumber: zod_1.z.number().nullable(),
    chunkIndex: zod_1.z.number(),
    snippet: zod_1.z.string(),
});
exports.chatRouter = (0, trpc_1.router)({
    ask: trpc_1.publicProcedure
        .input(zod_1.z.object({
        userId: zod_1.z.string().min(1),
        chatId: zod_1.z.string().min(1),
        question: zod_1.z.string().min(2),
    }))
        .output(zod_1.z.object({
        answer: zod_1.z.string(),
        sources: zod_1.z.array(SourceSchema),
    }))
        .mutation(async ({ input }) => {
        console.log('=== CHAT REQUEST RECEIVED ===');
        console.log('Chat input:', {
            userId: input.userId,
            chatId: input.chatId,
            questionLength: input.question.length,
            questionPreview: input.question.slice(0, 140),
        });
        try {
            const result = await (0, rag_1.generateRagAnswer)(input.question);
            console.log('=== CHAT RESPONSE READY ===');
            console.log('Response summary:', {
                answerLength: result.answer.length,
                sourceCount: result.sources.length,
            });
            return {
                answer: result.answer,
                sources: result.sources,
            };
        }
        catch (error) {
            const err = error;
            const message = err.message || '';
            console.error('=== ERROR ===');
            console.error('Error type:', err.name || 'UnknownError');
            console.error('Error message:', message);
            console.error('Stack:', err.stack);
            if (message.toLowerCase().includes('api key')) {
                console.error('Missing or invalid API key');
            }
            else if (message.toLowerCase().includes('rate limit')) {
                console.error('Rate limited by API');
            }
            else if (message.includes('ECONNREFUSED')) {
                console.error('Cannot connect to external service');
            }
            throw error;
        }
    }),
});
