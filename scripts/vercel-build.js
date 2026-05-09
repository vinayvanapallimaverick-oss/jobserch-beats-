import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outputDirectory = 'public';

mkdirSync(outputDirectory, { recursive: true });
copyFileSync('job-search.html', join(outputDirectory, 'job-search.html'));
copyFileSync('job-search.html', join(outputDirectory, 'index.html'));

console.log('Copied static app files to public/ for Vercel.');