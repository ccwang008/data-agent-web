import { getDatabaseInfo, listStates } from "./sqlite.mjs";

console.log(JSON.stringify({ database: getDatabaseInfo(), states: listStates() }, null, 2));
