import fs from 'fs';
import path from 'path';

function findRoutes(dir, routes = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findRoutes(fullPath, routes);
        } else if (entry.name === 'route.ts') {
            routes.push(fullPath);
        }
    }
    return routes;
}

const routes = findRoutes('src/app/api');
for (const r of routes) {
    const content = fs.readFileSync(r, 'utf8');
    const exports = [...content.matchAll(/export\s+(?:const|async function|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g)];
    if (exports.length === 0) {
        console.log(`NO HTTP METHODS: ${r}`);
    }
}
