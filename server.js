import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 8000);
const rapidApiHost = process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
const rapidApiKey = process.env.RAPIDAPI_KEY;

const skillVocabulary = [
  'javascript', 'typescript', 'react', 'node', 'python', 'java', 'spring', 'aws', 'azure',
  'gcp', 'docker', 'kubernetes', 'sql', 'postgres', 'mongodb', 'redis', 'graphql', 'rest',
  'next.js', 'vue', 'angular', 'html', 'css', 'tailwind', 'machine learning', 'data analysis',
  'pandas', 'spark', 'airflow', 'terraform', 'ci/cd', 'devops', 'security', 'figma',
  'product', 'analytics', 'prompt engineering', 'llm', 'langchain', 'prisma', 'fastapi'
];

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, provider: 'RapidAPI JSearch', configured: Boolean(rapidApiKey) });
});

app.post('/api/jobs/search', async (request, response) => {
  if (!rapidApiKey || rapidApiKey === 'your_rapidapi_key_here') {
    response.status(500).json({
      message: 'RapidAPI key is missing. Create .env from .env.example and set RAPIDAPI_KEY.'
    });
    return;
  }

  const body = request.body || {};
  const query = buildQuery(body);
  const params = new URLSearchParams({
    query,
    page: '1',
    num_pages: String(Number(body.numPages || 1)),
    date_posted: datePostedFromDays(Number(body.days || 14))
  });

  const employmentType = employmentTypeForRapidApi(body.jobType);
  if (employmentType) params.set('employment_types', employmentType);
  if (body.remoteOnly) params.set('remote_jobs_only', 'true');

  try {
    const apiResponse = await fetch(`https://${rapidApiHost}/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });

    const payload = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      response.status(apiResponse.status).json({
        message: payload.message || payload.error || `RapidAPI request failed with ${apiResponse.status}`
      });
      return;
    }

    const jobs = normalizeRapidApiJobs(payload.data || []);
    response.json({ provider: 'RapidAPI JSearch', query, jobs });
  } catch (error) {
    response.status(502).json({ message: error.message || 'RapidAPI request failed' });
  }
});

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, 'job-search.html'));
});

app.listen(port, () => {
  console.log(`Job Search Beats running at http://localhost:${port}/job-search.html`);
});

function buildQuery(body) {
  const query = String(body.query || '').trim();
  const location = String(body.location || '').trim();
  const skills = Array.isArray(body.skills) ? body.skills.slice(0, 5).join(' ') : '';
  const role = query || skills || 'software engineer';
  return location ? `${role} in ${location}` : role;
}

function datePostedFromDays(days) {
  if (days <= 1) return 'today';
  if (days <= 3) return '3days';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  return 'all';
}

function employmentTypeForRapidApi(type) {
  const map = {
    'full-time': 'FULLTIME',
    contract: 'CONTRACTOR',
    internship: 'INTERN'
  };
  return map[type] || '';
}

function normalizeRapidApiJobs(jobs) {
  return jobs.map((job, index) => {
    const description = cleanText(job.job_description || '');
    const highlights = flattenHighlights(job.job_highlights);
    const tags = extractTags(`${job.job_title || ''} ${description} ${highlights.join(' ')}`, job.job_required_skills);

    return {
      id: job.job_id || `rapidapi-${index}`,
      title: job.job_title || 'Untitled role',
      company: job.employer_name || 'Unknown company',
      location: formatLocation(job),
      remote: Boolean(job.job_is_remote),
      postedDays: daysAgo(job.job_posted_at_datetime_utc || job.job_posted_at_timestamp),
      type: normalizeEmploymentType(job.job_employment_type),
      level: inferLevel(`${job.job_title || ''} ${description}`),
      salaryMin: Number(job.job_min_salary || 0),
      salaryMax: Number(job.job_max_salary || 0),
      source: 'RapidAPI JSearch',
      tags,
      summary: summaryFrom(description, highlights),
      url: job.job_apply_link || job.job_google_link || '#'
    };
  });
}

function formatLocation(job) {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  if (job.job_is_remote && parts.length) return `Remote, ${parts.join(', ')}`;
  if (job.job_is_remote) return 'Remote';
  return parts.join(', ') || job.job_location || 'Not listed';
}

function daysAgo(value) {
  if (!value) return 0;
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.ceil((Date.now() - date.getTime()) / 86400000));
}

function normalizeEmploymentType(value = '') {
  const type = String(value).toUpperCase();
  if (type.includes('CONTRACT')) return 'contract';
  if (type.includes('INTERN')) return 'internship';
  return 'full-time';
}

function inferLevel(text) {
  const value = text.toLowerCase();
  if (/\b(lead|principal|staff)\b/.test(value)) return 'lead';
  if (/\b(senior|sr\.?|architect)\b/.test(value)) return 'senior';
  if (/\b(junior|jr\.?|entry|graduate|new grad)\b/.test(value)) return 'junior';
  return 'mid';
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function flattenHighlights(highlights = {}) {
  return Object.values(highlights).flat().map(cleanText).filter(Boolean);
}

function extractTags(text, apiSkills) {
  const explicitSkills = Array.isArray(apiSkills) ? apiSkills : [];
  const haystack = ` ${text.toLowerCase()} `;
  const detected = skillVocabulary.filter((skill) => haystack.includes(` ${skill} `) || haystack.includes(skill));
  return [...new Set([...explicitSkills, ...detected])].slice(0, 8);
}

function summaryFrom(description, highlights) {
  const text = description || highlights[0] || 'No summary provided by RapidAPI.';
  return text.length > 260 ? `${text.slice(0, 257)}...` : text;
}