// App State
let authToken = localStorage.getItem('ats_jwt_token') || '';
let currentUser = null;
let currentResumeId = null;
let selectedFile = null;

// API Base
const API_BASE = '/api';

// Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Authentication Handlers
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tabs .tab-btn');

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    tabs[0].classList.add('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    tabs[1].classList.add('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Login failed', 'error');
      return;
    }

    setAuthSession(data.data.token, data.data.user);
    showToast('Login successful!', 'success');
  } catch (err) {
    showToast('Network error during login.', 'error');
  }
}

async function quickDemoLogin() {
  document.getElementById('loginEmail').value = 'demo@example.com';
  document.getElementById('loginPassword').value = 'Password123!';
  const form = document.getElementById('loginForm');
  form.dispatchEvent(new Event('submit'));
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Registration failed', 'error');
      return;
    }

    setAuthSession(data.data.token, data.data.user);
    showToast('Account created successfully!', 'success');
  } catch (err) {
    showToast('Network error during registration.', 'error');
  }
}

function setAuthSession(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('ats_jwt_token', token);

  // Update UI
  const authStatus = document.getElementById('authStatus');
  const userStatusText = document.getElementById('userStatusText');
  const logoutBtn = document.getElementById('logoutBtn');
  const authSection = document.getElementById('authSection');
  const workspace = document.getElementById('workspace');
  const tokenInfo = document.getElementById('tokenInfo');
  const tokenDisplay = document.getElementById('tokenDisplay');

  authStatus.classList.remove('not-logged-in');
  authStatus.classList.add('logged-in');
  userStatusText.innerText = `${user.name} (${user.role})`;
  logoutBtn.classList.remove('hidden');

  tokenInfo.classList.remove('hidden');
  tokenDisplay.innerText = token;

  authSection.classList.add('hidden');
  workspace.classList.remove('hidden');

  fetchMyResumes();
}

function handleLogout() {
  authToken = '';
  currentUser = null;
  currentResumeId = null;
  localStorage.removeItem('ats_jwt_token');

  const authStatus = document.getElementById('authStatus');
  const userStatusText = document.getElementById('userStatusText');
  const logoutBtn = document.getElementById('logoutBtn');
  const authSection = document.getElementById('authSection');
  const workspace = document.getElementById('workspace');
  const tokenInfo = document.getElementById('tokenInfo');

  authStatus.classList.add('not-logged-in');
  authStatus.classList.remove('logged-in');
  userStatusText.innerText = 'Not Authenticated';
  logoutBtn.classList.add('hidden');
  tokenInfo.classList.add('hidden');

  authSection.classList.remove('hidden');
  workspace.classList.add('hidden');
  showToast('Logged out successfully.');
}

function copyToken() {
  if (!authToken) return;
  navigator.clipboard.writeText(authToken);
  showToast('JWT token copied to clipboard!', 'success');
}

// Check session on load
async function checkCurrentSession() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (data.success && data.data && data.data.user) {
      setAuthSession(authToken, data.data.user);
    } else {
      handleLogout();
    }
  } catch (err) {
    handleLogout();
  }
}

// Navigation Tabs
function switchView(viewName) {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  const panels = document.querySelectorAll('.view-panel');

  tabs.forEach(t => t.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));

  if (viewName === 'upload') {
    tabs[0].classList.add('active');
    document.getElementById('view-upload').classList.add('active');
  } else if (viewName === 'matching') {
    tabs[1].classList.add('active');
    document.getElementById('view-matching').classList.add('active');
  } else if (viewName === 'history') {
    tabs[2].classList.add('active');
    document.getElementById('view-history').classList.add('active');
    fetchMyResumes();
  }
}

// Drag & Drop / File Upload
function triggerFileInput() {
  document.getElementById('fileInput').click();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;

  const badge = document.getElementById('fileSelectedName');
  badge.innerText = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  badge.classList.remove('hidden');

  document.getElementById('uploadBtn').disabled = false;
}

// Drag & Drop event bindings
const dropzone = document.getElementById('dropzone');
if (dropzone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      selectedFile = files[0];
      const badge = document.getElementById('fileSelectedName');
      badge.innerText = `📄 ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`;
      badge.classList.remove('hidden');
      document.getElementById('uploadBtn').disabled = false;
    }
  });
}

// Submit Resume Upload
async function submitUpload() {
  if (!selectedFile) {
    showToast('Please select a file to upload.', 'error');
    return;
  }

  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span>⏳ Parsing & Scanning Resume...</span>';

  const formData = new FormData();
  formData.append('resume', selectedFile);

  try {
    const res = await fetch(`${API_BASE}/resumes/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Upload failed', 'error');
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<span>Upload & Scan Resume</span>';
      return;
    }

    currentResumeId = data.data.resumeId;
    renderAtsResults(data.data);
    showToast('Resume analyzed successfully!', 'success');
    fetchMyResumes();
  } catch (err) {
    showToast('Network error uploading resume.', 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<span>Upload & Scan Resume</span>';
  }
}

// Direct Raw Text Analysis
async function submitRawTextAnalysis() {
  const text = document.getElementById('rawTextPaste').value.trim();
  if (!text) {
    showToast('Please paste resume text into the text area.', 'error');
    return;
  }

  showToast('Analyzing resume text...', 'info');
  try {
    const res = await fetch(`${API_BASE}/analysis/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Analysis failed', 'error');
      return;
    }

    renderFullAnalysisResults(data.data);
    showToast('Direct text analysis complete!', 'success');
  } catch (err) {
    showToast('Error during direct analysis.', 'error');
  }
}

// Render Results on UI
function renderAtsResults(data) {
  document.getElementById('scorePlaceholder').classList.add('hidden');
  document.getElementById('scoreContent').classList.remove('hidden');

  const atsScore = data.atsScore;
  const score = atsScore.totalScore;

  // Animate Circular Gauge
  document.getElementById('scoreValue').innerText = score;
  const progressPath = document.getElementById('circleProgress');
  progressPath.setAttribute('stroke-dasharray', `${score}, 100`);

  // Progress Color
  let gradeText = 'Low Compatibility';
  let strokeColor = '#ef4444';
  if (score >= 80) {
    gradeText = 'Excellent ATS Readiness';
    strokeColor = '#10b981';
  } else if (score >= 60) {
    gradeText = 'Good / Moderate ATS Match';
    strokeColor = '#f59e0b';
  }
  progressPath.style.stroke = strokeColor;
  document.getElementById('scoreGrade').innerText = gradeText;
  document.getElementById('scoreSummarySnippet').innerText = `Detected ${data.wordCount} words across ${data.detectedSections.length} core sections.`;

  // Breakdown Bars
  const b = atsScore.breakdown;
  setBar('Contact', b.contactScore.score, b.contactScore.max);
  setBar('Section', b.sectionScore.score, b.sectionScore.max);
  setBar('Skill', b.skillScore.score, b.skillScore.max);
  setBar('Impact', b.impactScore.score, b.impactScore.max);
  setBar('Format', b.formatScore.score, b.formatScore.max);

  // Render Categorized Skills
  renderSkills(data.categorizedSkills, data.skillsCount);
}

function setBar(key, score, max) {
  document.getElementById(`b${key}`).innerText = `${score}/${max}`;
  const pct = Math.round((score / max) * 100);
  document.getElementById(`pb${key}`).style.width = `${pct}%`;
}

function renderSkills(categorized, totalCount) {
  const container = document.getElementById('categorizedSkillsContainer');
  const section = document.getElementById('skillsSection');
  document.getElementById('totalSkillsCount').innerText = totalCount || 0;

  container.innerHTML = '';
  section.classList.remove('hidden');

  const categoryTitles = {
    programmingLanguages: '💻 Programming Languages',
    frontend: '🌐 Frontend & Web',
    backend: '⚙️ Backend & APIs',
    databases: '🗄️ Databases & Storage',
    cloudAndDevOps: '☁️ Cloud & DevOps',
    aiAndDataScience: '🤖 AI & Data Science',
    mobile: '📱 Mobile Development',
    testingAndSecurity: '🧪 Testing & QA',
    softSkills: '🤝 Soft Skills & Agile',
  };

  for (const [key, skills] of Object.entries(categorized || {})) {
    if (skills && skills.length > 0) {
      const block = document.createElement('div');
      block.className = 'category-block';
      const title = categoryTitles[key] || key;
      block.innerHTML = `
        <h4>${title}</h4>
        <div class="tag-cloud">
          ${skills.map(s => `<span class="tag tag-primary">${s}</span>`).join('')}
        </div>
      `;
      container.appendChild(block);
    }
  }
}

// Deep AI Feedback Request
async function triggerDeepAiAnalysis() {
  if (!currentResumeId) {
    showToast('No active resume loaded.', 'error');
    return;
  }

  const btn = document.getElementById('deepAiBtn');
  btn.disabled = true;
  btn.innerText = '🤖 Gemini AI Audit In Progress...';

  try {
    const res = await fetch(`${API_BASE}/analysis/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ resumeId: currentResumeId }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'AI feedback generation failed', 'error');
      return;
    }

    renderAiFeedback(data.data.aiFeedback);
    showToast('AI Audit Report generated!', 'success');
  } catch (err) {
    showToast('Network error requesting AI feedback.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = '✨ Run Deep AI Feedback & Red Flag Audit';
  }
}

function renderFullAnalysisResults(data) {
  renderAtsResults({
    atsScore: data.atsScore,
    wordCount: data.structure.wordCount,
    detectedSections: data.structure.detectedSections,
    categorizedSkills: data.skills.categorized,
    skillsCount: data.skills.totalSkillsCount,
  });

  if (data.aiFeedback) {
    renderAiFeedback(data.aiFeedback);
  }
}

function renderAiFeedback(feedback) {
  const section = document.getElementById('aiFeedbackSection');
  section.classList.remove('hidden');

  document.getElementById('aiModelBadge').innerText = `${feedback.source} (${feedback.model})`;
  document.getElementById('aiSummaryText').innerText = feedback.summary;

  // Strengths
  const strengthsList = document.getElementById('strengthsList');
  strengthsList.innerHTML = (feedback.strengths || []).map(s => `<li>${s}</li>`).join('');

  // Weaknesses
  const weaknessesList = document.getElementById('weaknessesList');
  weaknessesList.innerHTML = (feedback.weaknesses || []).map(w => `<li>${w}</li>`).join('');

  // XYZ Rewrites
  const xyzContainer = document.getElementById('xyzExamples');
  xyzContainer.innerHTML = (feedback.quantifiableSuggestions || []).map(ex => `
    <div class="xyz-card">
      <div class="xyz-before"><strong>❌ Before (Passive):</strong> ${ex.originalConcept}</div>
      <div class="xyz-after"><strong>✅ ATS Optimized (XYZ Formula):</strong> ${ex.improvedExample}</div>
    </div>
  `).join('');

  // Formatting Tips
  const tipsList = document.getElementById('formattingTipsList');
  tipsList.innerHTML = (feedback.formattingTips || []).map(t => `<li>${t}</li>`).join('');

  // Recommended Keywords
  const kwContainer = document.getElementById('recommendedKeywords');
  kwContainer.innerHTML = (feedback.keywordRecommendations || []).map(k => `<span class="tag tag-success">${k}</span>`).join(' ');
}

// Job Matching Logic
async function submitJobMatch() {
  const jobTitle = document.getElementById('matchJobTitle').value.trim();
  const jobCompany = document.getElementById('matchCompany').value.trim();
  const jobDescription = document.getElementById('matchJdText').value.trim();

  if (!jobDescription) {
    showToast('Please paste a job description text.', 'error');
    return;
  }

  showToast('Calculating match score & skill gaps...', 'info');

  const payload = {
    jobTitle,
    jobCompany,
    jobDescription,
  };

  if (currentResumeId) {
    payload.resumeId = currentResumeId;
  } else {
    // Check if raw text is available
    const rawText = document.getElementById('rawTextPaste').value.trim();
    if (rawText) {
      payload.resumeText = rawText;
    } else {
      showToast('Please first upload a resume in the "Upload & Analyse" tab.', 'error');
      return;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Job match failed', 'error');
      return;
    }

    renderJobMatchResults(data.data);
    showToast('Job match calculated!', 'success');
  } catch (err) {
    showToast('Network error during job matching.', 'error');
  }
}

function renderJobMatchResults(match) {
  document.getElementById('matchPlaceholder').classList.add('hidden');
  const resultsContent = document.getElementById('matchResultsContent');
  resultsContent.classList.remove('hidden');

  document.getElementById('matchPercentage').innerText = `${match.matchScore}%`;
  document.getElementById('matchRatingText').innerText = match.rating;
  document.getElementById('matchSummaryText').innerText = match.summary;

  // Matched Skills
  document.getElementById('matchedSkillsCount').innerText = match.matchedSkills.length;
  const matchedContainer = document.getElementById('matchedSkillsTags');
  matchedContainer.innerHTML = match.matchedSkills.length > 0
    ? match.matchedSkills.map(s => `<span class="tag tag-success">${s}</span>`).join('')
    : '<span class="subtext">No direct skill matches detected.</span>';

  // Missing Skills
  document.getElementById('missingSkillsCount').innerText = match.missingSkills.length;
  const missingContainer = document.getElementById('missingSkillsTags');
  missingContainer.innerHTML = match.missingSkills.length > 0
    ? match.missingSkills.map(s => `<span class="tag tag-danger">${s}</span>`).join('')
    : '<span class="subtext">All key JD skills matched!</span>';

  // Additional Skills
  const additionalContainer = document.getElementById('additionalSkillsTags');
  additionalContainer.innerHTML = match.additionalSkills.length > 0
    ? match.additionalSkills.map(s => `<span class="tag tag-primary">${s}</span>`).join('')
    : '<span class="subtext">None</span>';

  // Recommendations
  const recList = document.getElementById('matchRecommendationsList');
  recList.innerHTML = match.recommendations.map(r => `<li>${r}</li>`).join('');
}

// Fetch Resumes History
async function fetchMyResumes() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/resumes`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (data.success) {
      renderResumesHistory(data.data.resumes);
      document.getElementById('resumeCount').innerText = data.data.count;
    }
  } catch (err) {
    console.error('Error fetching resumes:', err);
  }
}

function renderResumesHistory(resumes) {
  const container = document.getElementById('resumesListContainer');
  container.innerHTML = '';

  if (!resumes || resumes.length === 0) {
    container.innerHTML = `
      <div class="placeholder-state">
        <div class="placeholder-icon">📂</div>
        <p>No resumes uploaded yet. Upload a resume in the "Upload & Analyse" tab.</p>
      </div>
    `;
    return;
  }

  resumes.forEach(r => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-meta">
        <h4>📄 ${r.originalName}</h4>
        <div>
          <span>Score: <strong>${r.atsScore}/100</strong></span>
          <span>Skills: <strong>${r.skillsCount}</strong></span>
          <span>Words: <strong>${r.wordCount}</strong></span>
          <span>Date: <strong>${new Date(r.createdAt).toLocaleDateString()}</strong></span>
        </div>
      </div>
      <div class="history-actions">
        <button class="btn btn-secondary btn-sm" onclick="loadResumeById('${r.id}')">Select Active</button>
        <a class="btn btn-outline btn-sm" href="${API_BASE}/resumes/${r.id}/download" download>Download</a>
        <button class="btn btn-outline btn-sm text-danger" onclick="deleteResumeById('${r.id}')">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

async function loadResumeById(id) {
  try {
    const res = await fetch(`${API_BASE}/resumes/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (data.success) {
      const r = data.data.resume;
      currentResumeId = r.id;
      renderAtsResults({
        atsScore: r.parsedData.atsScore,
        wordCount: r.parsedData.structure.wordCount,
        detectedSections: r.parsedData.structure.detectedSections,
        categorizedSkills: r.parsedData.skills.categorized,
        skillsCount: r.parsedData.skills.totalSkillsCount,
      });

      if (r.analysis && r.analysis.aiFeedback) {
        renderAiFeedback(r.analysis.aiFeedback);
      }

      switchView('upload');
      showToast(`Selected "${r.originalName}" as active resume.`, 'success');
    }
  } catch (err) {
    showToast('Failed to load resume details.', 'error');
  }
}

async function deleteResumeById(id) {
  if (!confirm('Are you sure you want to delete this resume?')) return;
  try {
    const res = await fetch(`${API_BASE}/resumes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (data.success) {
      if (currentResumeId === id) currentResumeId = null;
      showToast('Resume deleted successfully.', 'success');
      fetchMyResumes();
    }
  } catch (err) {
    showToast('Failed to delete resume.', 'error');
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  checkCurrentSession();
});

