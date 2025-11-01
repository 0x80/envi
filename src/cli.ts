#!/usr/bin/env node

import { main } from "./index.js";

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
