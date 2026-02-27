"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
function initializeAdminApp() {
    if ((0, app_1.getApps)().length > 0)
        return (0, app_1.getApps)()[0];
    const projectId = process.env.ADMIN_PROJECT_ID;
    const clientEmail = process.env.ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
        return (0, app_1.initializeApp)({
            credential: (0, app_1.cert)({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
    return (0, app_1.initializeApp)();
}
const app = initializeAdminApp();
exports.adminDb = (0, firestore_1.getFirestore)(app);
