"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
(0, index_1.ingestDocuments)().catch((err) => {
    console.error(err);
    process.exit(1);
});
