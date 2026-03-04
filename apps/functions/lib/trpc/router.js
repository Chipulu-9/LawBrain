import { router } from './trpc.js';
import { userRouter } from './routers/user.js';
import { chatRouter } from './routers/chat.js';
export const appRouter = router({
    user: userRouter,
    chat: chatRouter,
});
