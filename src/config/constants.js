module.exports = {
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.doc', '.txt'],
  USER_ROLES: {
    CANDIDATE: 'candidate',
    RECRUITER: 'recruiter',
    ADMIN: 'admin',
  },
  ATS_SECTIONS: [
    'contact',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
  ],
  ACTION_VERBS: [
    'achieved', 'accelerated', 'amplified', 'analyzed', 'architected', 'automated',
    'built', 'championed', 'collaborated', 'configured', 'constructed', 'coordinated',
    'created', 'decreased', 'delivered', 'deployed', 'designed', 'developed',
    'devised', 'directed', 'doubled', 'drove', 'engineered', 'enhanced',
    'established', 'executed', 'expanded', 'expedited', 'facilitated', 'formulated',
    'founded', 'generated', 'guided', 'headed', 'identified', 'implemented',
    'improved', 'increased', 'initiated', 'innovated', 'instituted', 'integrated',
    'introduced', 'invented', 'launched', 'led', 'managed', 'maximized',
    'mentored', 'minimized', 'modernized', 'negotiated', 'optimized', 'orchestrated',
    'overhauled', 'pioneered', 'planned', 'produced', 'programmed', 'reduced',
    'refactored', 'resolved', 'restructured', 'revamped', 'scaled', 'simplified',
    'spearheaded', 'standardized', 'streamlined', 'strengthened', 'supervised', 'surpassed',
    'transformed', 'upgraded', 'validated', 'yielded'
  ],
};

