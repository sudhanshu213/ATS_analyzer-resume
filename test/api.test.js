/**
 * Automated End-to-End API Test Suite
 * Tests Auth, File Upload, Text Extraction, Skill Extraction, AI Feedback, Job Matching
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../server');

let server;
const PORT = 5599;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let jwtToken = '';
let uploadedResumeId = '';

async function runTests() {
  console.log('🚀 Starting ATS Resume Analyser Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log('❌ FAIL');
      console.error('  Error:', err.message);
      failed++;
    }
  }

  // Start temporary server
  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });

  try {
    // Test 1: Health Check
    await test('GET /api/health returns 200 and healthy status', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      const body = await res.json();
      if (res.status !== 200 || !body.success || body.data.status !== 'healthy') {
        throw new Error(`Expected 200 healthy, got ${res.status}: ${JSON.stringify(body)}`);
      }
    });

    // Test 2: Protected Route Rejection
    await test('GET /api/resumes without token returns 401 Unauthorized', async () => {
      const res = await fetch(`${BASE_URL}/resumes`);
      if (res.status !== 401) {
        throw new Error(`Expected status 401, got ${res.status}`);
      }
    });

    // Test 3: User Registration
    const testEmail = `test_${Date.now()}@example.com`;
    await test('POST /api/auth/register creates user and returns JWT token', async () => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Engineer',
          email: testEmail,
          password: 'Password123!',
          role: 'candidate',
        }),
      });
      const body = await res.json();
      if (res.status !== 201 || !body.success || !body.data.token) {
        throw new Error(`Registration failed: ${JSON.stringify(body)}`);
      }
      jwtToken = body.data.token;
    });

    // Test 4: User Login
    await test('POST /api/auth/login authenticates user with correct credentials', async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Password123!',
        }),
      });
      const body = await res.json();
      if (res.status !== 200 || !body.success || !body.data.token) {
        throw new Error(`Login failed: ${JSON.stringify(body)}`);
      }
      jwtToken = body.data.token;
    });

    // Test 5: Protected Profile
    await test('GET /api/auth/profile retrieves authenticated user info', async () => {
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const body = await res.json();
      if (res.status !== 200 || !body.success || body.data.user.email !== testEmail) {
        throw new Error(`Profile check failed: ${JSON.stringify(body)}`);
      }
    });

    // Test 6: Resume Upload (Multipart Form Data)
    await test('POST /api/resumes/upload uploads file and extracts text + skills + ATS score', async () => {
      const filePath = path.join(__dirname, 'sample_resumes/software_engineer_resume.txt');
      const fileBuffer = fs.readFileSync(filePath);
      const fileBlob = new Blob([fileBuffer], { type: 'text/plain' });

      const formData = new FormData();
      formData.append('resume', fileBlob, 'software_engineer_resume.txt');

      const res = await fetch(`${BASE_URL}/resumes/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
        body: formData,
      });
      const body = await res.json();

      if (res.status !== 201 || !body.success) {
        throw new Error(`Upload failed: ${JSON.stringify(body)}`);
      }

      uploadedResumeId = body.data.resumeId;
      if (!uploadedResumeId) throw new Error('Missing resumeId in response');
      if (body.data.atsScore.totalScore < 50) {
        throw new Error(`Expected score >= 50, got ${body.data.atsScore.totalScore}`);
      }
      if (!body.data.topSkills || body.data.topSkills.length === 0) {
        throw new Error('Skills were not extracted');
      }
    });

    // Test 7: Get My Resumes
    await test('GET /api/resumes lists uploaded resumes', async () => {
      const res = await fetch(`${BASE_URL}/resumes`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const body = await res.json();
      if (res.status !== 200 || !body.success || body.data.count < 1) {
        throw new Error(`Failed to list resumes: ${JSON.stringify(body)}`);
      }
    });

    // Test 8: Extract Skills Standalone
    await test('POST /api/analysis/skills extracts and categorizes skills from text', async () => {
      const res = await fetch(`${BASE_URL}/analysis/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          text: 'Expert in React, Node.js, Python, PostgreSQL, Docker, AWS, and Agile.',
        }),
      });
      const body = await res.json();
      if (res.status !== 200 || !body.success) {
        throw new Error(`Skills extraction failed: ${JSON.stringify(body)}`);
      }
      const skills = body.data.skills;
      if (!skills.includes('React') || !skills.includes('Docker')) {
        throw new Error(`Expected skills missing: ${JSON.stringify(skills)}`);
      }
    });

    // Test 9: Deep ATS AI Feedback
    await test('POST /api/analysis/analyze generates ATS score and AI feedback', async () => {
      const res = await fetch(`${BASE_URL}/analysis/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ resumeId: uploadedResumeId }),
      });
      const body = await res.json();
      if (res.status !== 200 || !body.success) {
        throw new Error(`Analysis failed: ${JSON.stringify(body)}`);
      }
      const fb = body.data.aiFeedback;
      if (!fb.summary || !fb.strengths || !fb.quantifiableSuggestions) {
        throw new Error(`AI feedback missing required fields: ${JSON.stringify(fb)}`);
      }
    });

    // Test 10: Job Matching
    await test('POST /api/match matches resume against job description and calculates match score', async () => {
      const jobDescription = `
        We are seeking a Senior Backend Engineer with deep expertise in Node.js, TypeScript, PostgreSQL, and Docker.
        Nice to have: Kubernetes, Redis, and Golang.
        Must have strong experience building scalable REST APIs and microservices.
      `;

      const res = await fetch(`${BASE_URL}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          resumeId: uploadedResumeId,
          jobTitle: 'Senior Backend Engineer',
          jobCompany: 'Acme Corp',
          jobDescription,
        }),
      });
      const body = await res.json();

      if (res.status !== 200 || !body.success) {
        throw new Error(`Job match failed: ${JSON.stringify(body)}`);
      }
      const match = body.data;
      if (match.matchScore < 60) {
        throw new Error(`Expected match score >= 60, got ${match.matchScore}`);
      }
      if (!match.matchedSkills.includes('Node.js') || !match.matchedSkills.includes('PostgreSQL')) {
        throw new Error(`Expected matched skills missing: ${JSON.stringify(match.matchedSkills)}`);
      }
      if (!match.missingSkills.includes('Golang') && !match.missingSkills.includes('Go')) {
        throw new Error(`Expected Golang in missing skills: ${JSON.stringify(match.missingSkills)}`);
      }
    });

    // Test 11: Download Resume File
    await test('GET /api/resumes/:id/download serves file content with attachment header', async () => {
      const res = await fetch(`${BASE_URL}/resumes/${uploadedResumeId}/download`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.status !== 200) {
        throw new Error(`Download failed with status ${res.status}`);
      }
      const content = await res.text();
      if (!content.includes('ALEX MORGAN')) {
        throw new Error('Downloaded file content did not match uploaded resume');
      }
    });

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  } catch (outerErr) {
    console.error('Fatal error in tests:', outerErr);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
