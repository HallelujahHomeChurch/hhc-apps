import {copyFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const source=resolve(process.argv[2]||'../frontend-platform/packages/operations-client');
const schema=readFileSync(resolve(source,'openapi/operations-api.yaml'),'utf8');
if(!schema.includes('ServiceAssignment:'))throw new Error('Source is missing the service contract');
copyFileSync(resolve(source,'src/generated.ts'),'src/generated.ts');
copyFileSync(resolve(source,'openapi/operations-api.yaml'),'contracts/operations-api.yaml');
console.log('Copied the canonical generated Operations types and their source contract.');
