/**
 * Skill normalization for AI-generated skill strings.
 * Maps variations to canonical forms and filters vague/useless skills.
 */

export interface NormalizedSkill {
  canonical: string;  // The canonical name (e.g., "React")
  slug: string;       // URL-safe slug (e.g., "react")
  category: string;   // Skill category
  original: string;   // What the AI originally said
}

// Map of common variations to canonical names
const SKILL_SYNONYMS: Record<string, { canonical: string; slug: string; category: string }> = {
  // Frontend
  'react': { canonical: 'React', slug: 'react', category: 'frontend' },
  'react.js': { canonical: 'React', slug: 'react', category: 'frontend' },
  'reactjs': { canonical: 'React', slug: 'react', category: 'frontend' },
  'next.js': { canonical: 'Next.js', slug: 'nextjs', category: 'frontend' },
  'nextjs': { canonical: 'Next.js', slug: 'nextjs', category: 'frontend' },
  'next': { canonical: 'Next.js', slug: 'nextjs', category: 'frontend' },
  'typescript': { canonical: 'TypeScript', slug: 'typescript', category: 'frontend' },
  'ts': { canonical: 'TypeScript', slug: 'typescript', category: 'frontend' },
  'javascript': { canonical: 'JavaScript', slug: 'javascript', category: 'frontend' },
  'js': { canonical: 'JavaScript', slug: 'javascript', category: 'frontend' },
  'css': { canonical: 'CSS', slug: 'css', category: 'frontend' },
  'css3': { canonical: 'CSS', slug: 'css', category: 'frontend' },
  'html': { canonical: 'HTML', slug: 'html', category: 'frontend' },
  'html5': { canonical: 'HTML', slug: 'html', category: 'frontend' },
  'html/css': { canonical: 'HTML/CSS', slug: 'html-css', category: 'frontend' },
  'tailwind': { canonical: 'Tailwind CSS', slug: 'tailwind-css', category: 'frontend' },
  'tailwind css': { canonical: 'Tailwind CSS', slug: 'tailwind-css', category: 'frontend' },
  'tailwindcss': { canonical: 'Tailwind CSS', slug: 'tailwind-css', category: 'frontend' },
  'vue': { canonical: 'Vue', slug: 'vue', category: 'frontend' },
  'vue.js': { canonical: 'Vue', slug: 'vue', category: 'frontend' },
  'vuejs': { canonical: 'Vue', slug: 'vue', category: 'frontend' },
  'angular': { canonical: 'Angular', slug: 'angular', category: 'frontend' },
  'angularjs': { canonical: 'Angular', slug: 'angular', category: 'frontend' },
  'svelte': { canonical: 'Svelte', slug: 'svelte', category: 'frontend' },
  'sveltekit': { canonical: 'SvelteKit', slug: 'sveltekit', category: 'frontend' },
  'sass': { canonical: 'Sass', slug: 'sass', category: 'frontend' },
  'scss': { canonical: 'Sass', slug: 'sass', category: 'frontend' },
  'redux': { canonical: 'Redux', slug: 'redux', category: 'frontend' },
  'zustand': { canonical: 'Zustand', slug: 'zustand', category: 'frontend' },
  'responsive design': { canonical: 'Responsive Design', slug: 'responsive-design', category: 'frontend' },
  'accessibility': { canonical: 'Accessibility', slug: 'accessibility', category: 'frontend' },
  'a11y': { canonical: 'Accessibility', slug: 'accessibility', category: 'frontend' },
  'web accessibility': { canonical: 'Accessibility', slug: 'accessibility', category: 'frontend' },
  'storybook': { canonical: 'Storybook', slug: 'storybook', category: 'frontend' },

  // Backend
  'node': { canonical: 'Node.js', slug: 'nodejs', category: 'backend' },
  'node.js': { canonical: 'Node.js', slug: 'nodejs', category: 'backend' },
  'nodejs': { canonical: 'Node.js', slug: 'nodejs', category: 'backend' },
  'python': { canonical: 'Python', slug: 'python', category: 'backend' },
  'django': { canonical: 'Django', slug: 'django', category: 'backend' },
  'flask': { canonical: 'Flask', slug: 'flask', category: 'backend' },
  'fastapi': { canonical: 'FastAPI', slug: 'fastapi', category: 'backend' },
  'express': { canonical: 'Express', slug: 'express', category: 'backend' },
  'express.js': { canonical: 'Express', slug: 'express', category: 'backend' },
  'expressjs': { canonical: 'Express', slug: 'express', category: 'backend' },
  'rust': { canonical: 'Rust', slug: 'rust', category: 'backend' },
  'go': { canonical: 'Go', slug: 'go', category: 'backend' },
  'golang': { canonical: 'Go', slug: 'go', category: 'backend' },
  'java': { canonical: 'Java', slug: 'java', category: 'backend' },
  'spring': { canonical: 'Spring', slug: 'spring', category: 'backend' },
  'spring boot': { canonical: 'Spring Boot', slug: 'spring-boot', category: 'backend' },
  'ruby': { canonical: 'Ruby', slug: 'ruby', category: 'backend' },
  'ruby on rails': { canonical: 'Ruby on Rails', slug: 'ruby-on-rails', category: 'backend' },
  'rails': { canonical: 'Ruby on Rails', slug: 'ruby-on-rails', category: 'backend' },
  'php': { canonical: 'PHP', slug: 'php', category: 'backend' },
  'laravel': { canonical: 'Laravel', slug: 'laravel', category: 'backend' },
  'graphql': { canonical: 'GraphQL', slug: 'graphql', category: 'backend' },
  'rest api': { canonical: 'REST API Design', slug: 'rest-api-design', category: 'backend' },
  'rest': { canonical: 'REST API Design', slug: 'rest-api-design', category: 'backend' },
  'restful api': { canonical: 'REST API Design', slug: 'rest-api-design', category: 'backend' },
  'api design': { canonical: 'REST API Design', slug: 'rest-api-design', category: 'backend' },
  'websockets': { canonical: 'WebSockets', slug: 'websockets', category: 'backend' },
  'websocket': { canonical: 'WebSockets', slug: 'websockets', category: 'backend' },
  'grpc': { canonical: 'gRPC', slug: 'grpc', category: 'backend' },

  // Databases
  'postgres': { canonical: 'PostgreSQL', slug: 'postgresql', category: 'data' },
  'postgresql': { canonical: 'PostgreSQL', slug: 'postgresql', category: 'data' },
  'mysql': { canonical: 'MySQL', slug: 'mysql', category: 'data' },
  'mongodb': { canonical: 'MongoDB', slug: 'mongodb', category: 'data' },
  'mongo': { canonical: 'MongoDB', slug: 'mongodb', category: 'data' },
  'redis': { canonical: 'Redis', slug: 'redis', category: 'data' },
  'sql': { canonical: 'SQL', slug: 'sql', category: 'data' },
  'sqlite': { canonical: 'SQLite', slug: 'sqlite', category: 'data' },
  'dynamodb': { canonical: 'DynamoDB', slug: 'dynamodb', category: 'data' },
  'elasticsearch': { canonical: 'Elasticsearch', slug: 'elasticsearch', category: 'data' },
  'prisma': { canonical: 'Prisma', slug: 'prisma', category: 'data' },
  'drizzle': { canonical: 'Drizzle ORM', slug: 'drizzle-orm', category: 'data' },
  'drizzle orm': { canonical: 'Drizzle ORM', slug: 'drizzle-orm', category: 'data' },
  'data analysis': { canonical: 'Data Analysis', slug: 'data-analysis', category: 'data' },
  'data modeling': { canonical: 'Data Modeling', slug: 'data-modeling', category: 'data' },
  'data visualization': { canonical: 'Data Visualization', slug: 'data-visualization', category: 'data' },

  // Design
  'figma': { canonical: 'Figma', slug: 'figma', category: 'design' },
  'sketch': { canonical: 'Sketch', slug: 'sketch', category: 'design' },
  'adobe xd': { canonical: 'Adobe XD', slug: 'adobe-xd', category: 'design' },
  'ui design': { canonical: 'UI Design', slug: 'ui-design', category: 'design' },
  'ux design': { canonical: 'UX Research', slug: 'ux-research', category: 'design' },
  'ux research': { canonical: 'UX Research', slug: 'ux-research', category: 'design' },
  'ux': { canonical: 'UX Research', slug: 'ux-research', category: 'design' },
  'ui/ux': { canonical: 'UI Design', slug: 'ui-design', category: 'design' },
  'ui/ux design': { canonical: 'UI Design', slug: 'ui-design', category: 'design' },
  'user interface design': { canonical: 'UI Design', slug: 'ui-design', category: 'design' },
  'user experience': { canonical: 'UX Research', slug: 'ux-research', category: 'design' },
  'graphic design': { canonical: 'Graphic Design', slug: 'graphic-design', category: 'design' },
  'motion design': { canonical: 'Motion Design', slug: 'motion-design', category: 'design' },
  'illustration': { canonical: 'Illustration', slug: 'illustration', category: 'design' },
  'prototyping': { canonical: 'Prototyping', slug: 'prototyping', category: 'design' },
  'design systems': { canonical: 'Design Systems', slug: 'design-systems', category: 'design' },
  'wireframing': { canonical: 'Wireframing', slug: 'wireframing', category: 'design' },

  // DevOps
  'docker': { canonical: 'Docker', slug: 'docker', category: 'devops' },
  'kubernetes': { canonical: 'Kubernetes', slug: 'kubernetes', category: 'devops' },
  'k8s': { canonical: 'Kubernetes', slug: 'kubernetes', category: 'devops' },
  'aws': { canonical: 'AWS', slug: 'aws', category: 'devops' },
  'amazon web services': { canonical: 'AWS', slug: 'aws', category: 'devops' },
  'gcp': { canonical: 'GCP', slug: 'gcp', category: 'devops' },
  'google cloud': { canonical: 'GCP', slug: 'gcp', category: 'devops' },
  'google cloud platform': { canonical: 'GCP', slug: 'gcp', category: 'devops' },
  'azure': { canonical: 'Azure', slug: 'azure', category: 'devops' },
  'ci/cd': { canonical: 'CI/CD', slug: 'ci-cd', category: 'devops' },
  'cicd': { canonical: 'CI/CD', slug: 'ci-cd', category: 'devops' },
  'github actions': { canonical: 'GitHub Actions', slug: 'github-actions', category: 'devops' },
  'terraform': { canonical: 'Terraform', slug: 'terraform', category: 'devops' },
  'ansible': { canonical: 'Ansible', slug: 'ansible', category: 'devops' },
  'linux': { canonical: 'Linux', slug: 'linux', category: 'devops' },
  'nginx': { canonical: 'Nginx', slug: 'nginx', category: 'devops' },
  'vercel': { canonical: 'Vercel', slug: 'vercel', category: 'devops' },
  'netlify': { canonical: 'Netlify', slug: 'netlify', category: 'devops' },

  // Blockchain
  'solidity': { canonical: 'Solidity', slug: 'solidity', category: 'blockchain' },
  'web3': { canonical: 'Web3', slug: 'web3', category: 'blockchain' },
  'web3.js': { canonical: 'Web3', slug: 'web3', category: 'blockchain' },
  'ethers': { canonical: 'Ethers.js', slug: 'ethersjs', category: 'blockchain' },
  'ethers.js': { canonical: 'Ethers.js', slug: 'ethersjs', category: 'blockchain' },
  'viem': { canonical: 'Viem', slug: 'viem', category: 'blockchain' },
  'smart contracts': { canonical: 'Smart Contracts', slug: 'smart-contracts', category: 'blockchain' },
  'smart contract': { canonical: 'Smart Contracts', slug: 'smart-contracts', category: 'blockchain' },
  'defi': { canonical: 'DeFi', slug: 'defi', category: 'blockchain' },
  'nft': { canonical: 'NFT Development', slug: 'nft-development', category: 'blockchain' },
  'hardhat': { canonical: 'Hardhat', slug: 'hardhat', category: 'blockchain' },
  'foundry': { canonical: 'Foundry', slug: 'foundry', category: 'blockchain' },

  // AI/ML
  'machine learning': { canonical: 'Machine Learning', slug: 'machine-learning', category: 'ai_ml' },
  'ml': { canonical: 'Machine Learning', slug: 'machine-learning', category: 'ai_ml' },
  'deep learning': { canonical: 'Deep Learning', slug: 'deep-learning', category: 'ai_ml' },
  'llm': { canonical: 'LLM Integration', slug: 'llm-integration', category: 'ai_ml' },
  'llm integration': { canonical: 'LLM Integration', slug: 'llm-integration', category: 'ai_ml' },
  'large language models': { canonical: 'LLM Integration', slug: 'llm-integration', category: 'ai_ml' },
  'prompt engineering': { canonical: 'Prompt Engineering', slug: 'prompt-engineering', category: 'ai_ml' },
  'nlp': { canonical: 'NLP', slug: 'nlp', category: 'ai_ml' },
  'natural language processing': { canonical: 'NLP', slug: 'nlp', category: 'ai_ml' },
  'computer vision': { canonical: 'Computer Vision', slug: 'computer-vision', category: 'ai_ml' },
  'tensorflow': { canonical: 'TensorFlow', slug: 'tensorflow', category: 'ai_ml' },
  'pytorch': { canonical: 'PyTorch', slug: 'pytorch', category: 'ai_ml' },
  'openai': { canonical: 'OpenAI API', slug: 'openai-api', category: 'ai_ml' },
  'openai api': { canonical: 'OpenAI API', slug: 'openai-api', category: 'ai_ml' },

  // Business
  'project management': { canonical: 'Project Management', slug: 'project-management', category: 'business' },
  'product management': { canonical: 'Product Management', slug: 'product-management', category: 'business' },
  'agile': { canonical: 'Agile', slug: 'agile', category: 'business' },
  'scrum': { canonical: 'Scrum', slug: 'scrum', category: 'business' },
  'business analysis': { canonical: 'Business Analysis', slug: 'business-analysis', category: 'business' },
  'strategy': { canonical: 'Strategy', slug: 'strategy', category: 'business' },

  // Writing
  'technical writing': { canonical: 'Technical Writing', slug: 'technical-writing', category: 'writing' },
  'copywriting': { canonical: 'Copywriting', slug: 'copywriting', category: 'writing' },
  'content writing': { canonical: 'Content Writing', slug: 'content-writing', category: 'writing' },
  'content strategy': { canonical: 'Content Strategy', slug: 'content-strategy', category: 'writing' },
  'documentation': { canonical: 'Technical Writing', slug: 'technical-writing', category: 'writing' },
  'api documentation': { canonical: 'API Documentation', slug: 'api-documentation', category: 'writing' },

  // Testing
  'jest': { canonical: 'Jest', slug: 'jest', category: 'frontend' },
  'vitest': { canonical: 'Vitest', slug: 'vitest', category: 'frontend' },
  'cypress': { canonical: 'Cypress', slug: 'cypress', category: 'frontend' },
  'playwright': { canonical: 'Playwright', slug: 'playwright', category: 'frontend' },
  'unit testing': { canonical: 'Unit Testing', slug: 'unit-testing', category: 'backend' },
  'integration testing': { canonical: 'Integration Testing', slug: 'integration-testing', category: 'backend' },
  'e2e testing': { canonical: 'E2E Testing', slug: 'e2e-testing', category: 'frontend' },
  'end-to-end testing': { canonical: 'E2E Testing', slug: 'e2e-testing', category: 'frontend' },
  'test automation': { canonical: 'Test Automation', slug: 'test-automation', category: 'backend' },
  'qa': { canonical: 'QA', slug: 'qa', category: 'backend' },
  'quality assurance': { canonical: 'QA', slug: 'qa', category: 'backend' },

  // Mobile
  'react native': { canonical: 'React Native', slug: 'react-native', category: 'frontend' },
  'swift': { canonical: 'Swift', slug: 'swift', category: 'frontend' },
  'kotlin': { canonical: 'Kotlin', slug: 'kotlin', category: 'frontend' },
  'flutter': { canonical: 'Flutter', slug: 'flutter', category: 'frontend' },
  'ios': { canonical: 'iOS Development', slug: 'ios-development', category: 'frontend' },
  'android': { canonical: 'Android Development', slug: 'android-development', category: 'frontend' },

  // Security
  'security': { canonical: 'Security Engineering', slug: 'security-engineering', category: 'devops' },
  'cybersecurity': { canonical: 'Security Engineering', slug: 'security-engineering', category: 'devops' },
  'penetration testing': { canonical: 'Penetration Testing', slug: 'penetration-testing', category: 'devops' },
  'oauth': { canonical: 'OAuth', slug: 'oauth', category: 'backend' },
  'authentication': { canonical: 'Authentication', slug: 'authentication', category: 'backend' },
  'auth': { canonical: 'Authentication', slug: 'authentication', category: 'backend' },
};

/**
 * Normalize a single raw skill string to its canonical form.
 */
export function normalizeSkill(rawSkill: string): NormalizedSkill {
  const key = rawSkill.toLowerCase().trim();
  const match = SKILL_SYNONYMS[key];
  if (match) {
    return { ...match, original: rawSkill };
  }
  // Fallback: slugify the raw skill and keep as-is
  const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    canonical: rawSkill.trim(),
    slug,
    category: 'other',
    original: rawSkill,
  };
}

/**
 * Normalize an array of skills, deduplicating by slug.
 */
export function normalizeSkills(rawSkills: string[]): NormalizedSkill[] {
  const seen = new Set<string>();
  const results: NormalizedSkill[] = [];
  for (const raw of rawSkills) {
    const normalized = normalizeSkill(raw);
    if (!seen.has(normalized.slug)) {
      seen.add(normalized.slug);
      results.push(normalized);
    }
  }
  return results;
}

// Skills that are too vague to be meaningful for attestation
const VAGUE_SKILLS = new Set([
  'development',
  'programming',
  'coding',
  'software',
  'engineering',
  'software development',
  'web development',
  'software engineering',
  'general design',
  'design',
  'analysis',
  'testing',
  'management',
  'communication',
  'problem solving',
  'teamwork',
  'collaboration',
  'research',
  'implementation',
  'architecture',
  'optimization',
  'debugging',
  'troubleshooting',
  'maintenance',
  'support',
  'planning',
  'execution',
  'delivery',
  'frontend development',
  'backend development',
  'full stack',
  'full-stack',
  'fullstack',
  'full stack development',
  'mobile development',
  'app development',
  'application development',
]);

/**
 * Filter out vague/useless skills that don't map to specific, attestable competencies.
 */
export function filterVagueSkills(skills: string[]): string[] {
  return skills.filter(s => !VAGUE_SKILLS.has(s.toLowerCase().trim()));
}
