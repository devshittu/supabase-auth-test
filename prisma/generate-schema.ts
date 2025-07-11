// prisma/generate-schema.ts

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Define the path to the template and output schema file.
const templatePath = resolve(__dirname, 'schema.template.prisma');
const outputPath = resolve(__dirname, 'schema.prisma');

// Determine the provider (you can still use an environment variable for flexibility)
const provider = process.env.DATABASE_PROVIDER || 'postgresql';

// Define your production connection strings (hardcoded)
const connectionUrl = process.env.DATABASE_URL || 'postgresql://';
const directConnectionUrl = process.env.DIRECT_URL || 'postgresql://';

// Read the template schema file.
let schema = readFileSync(templatePath, 'utf-8');

// Replace the placeholders with the actual values.
schema = schema.replace(/\$PROVIDER\$/g, provider);
schema = schema.replace(/\$DATABASE_URL\$/g, connectionUrl);
schema = schema.replace(/\$DIRECT_URL\$/g, directConnectionUrl);

// Write out the generated schema.
writeFileSync(outputPath, schema);

console.log(`Generated schema.prisma with provider: ${provider}`);
