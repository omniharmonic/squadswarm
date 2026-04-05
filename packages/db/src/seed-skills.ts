import { skills } from './schema/skills';
import type { Database } from './client';

const CANONICAL_SKILLS = [
  // Frontend
  { name: 'React', slug: 'react', category: 'frontend', description: 'Building user interfaces with React component architecture', synonyms: ['React.js', 'ReactJS'] },
  { name: 'Vue', slug: 'vue', category: 'frontend', description: 'Building reactive web applications with the Vue framework', synonyms: ['Vue.js', 'VueJS'] },
  { name: 'Angular', slug: 'angular', category: 'frontend', description: 'Enterprise web application development with Angular', synonyms: ['AngularJS', 'Angular 2+'] },
  { name: 'Svelte', slug: 'svelte', category: 'frontend', description: 'Building compiled web applications with Svelte', synonyms: ['SvelteKit'] },
  { name: 'Next.js', slug: 'nextjs', category: 'frontend', description: 'Full-stack React framework for production applications', synonyms: ['Next', 'NextJS'] },
  { name: 'TypeScript', slug: 'typescript', category: 'frontend', description: 'Typed JavaScript for scalable application development', synonyms: ['TS'] },
  { name: 'JavaScript', slug: 'javascript', category: 'frontend', description: 'Core web programming language for interactive experiences', synonyms: ['JS', 'ECMAScript', 'ES6+'] },
  { name: 'HTML/CSS', slug: 'html-css', category: 'frontend', description: 'Semantic markup and styling for web pages', synonyms: ['HTML5', 'CSS3', 'HTML', 'CSS'] },
  { name: 'Tailwind CSS', slug: 'tailwind-css', category: 'frontend', description: 'Utility-first CSS framework for rapid UI development', synonyms: ['Tailwind', 'TailwindCSS'] },
  { name: 'Responsive Design', slug: 'responsive-design', category: 'frontend', description: 'Creating layouts that adapt across screen sizes and devices', synonyms: ['Mobile-First Design', 'Adaptive Design'] },

  // Backend
  { name: 'Node.js', slug: 'nodejs', category: 'backend', description: 'Server-side JavaScript runtime for scalable applications', synonyms: ['Node', 'NodeJS'] },
  { name: 'Python', slug: 'python', category: 'backend', description: 'General-purpose programming language for backend services', synonyms: ['Python 3'] },
  { name: 'Go', slug: 'go', category: 'backend', description: 'Statically typed compiled language for high-performance services', synonyms: ['Golang'] },
  { name: 'Rust', slug: 'rust', category: 'backend', description: 'Systems programming language focused on safety and performance', synonyms: ['Rust Lang'] },
  { name: 'Java', slug: 'java', category: 'backend', description: 'Enterprise programming language for robust backend systems', synonyms: ['JVM', 'Java SE'] },
  { name: 'Ruby', slug: 'ruby', category: 'backend', description: 'Dynamic language for rapid web application development', synonyms: ['Ruby on Rails', 'Rails', 'RoR'] },
  { name: 'PHP', slug: 'php', category: 'backend', description: 'Server-side scripting language for web development', synonyms: ['Laravel', 'PHP8'] },
  { name: 'GraphQL', slug: 'graphql', category: 'backend', description: 'Query language and runtime for flexible API design', synonyms: ['GQL'] },
  { name: 'REST API Design', slug: 'rest-api-design', category: 'backend', description: 'Designing RESTful HTTP APIs with proper resource modeling', synonyms: ['RESTful APIs', 'REST', 'API Design'] },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'backend', description: 'Advanced open-source relational database management', synonyms: ['Postgres', 'PG'] },
  { name: 'MySQL', slug: 'mysql', category: 'backend', description: 'Relational database management for web applications', synonyms: ['MariaDB'] },
  { name: 'MongoDB', slug: 'mongodb', category: 'backend', description: 'Document-oriented NoSQL database for flexible data models', synonyms: ['Mongo'] },
  { name: 'Redis', slug: 'redis', category: 'backend', description: 'In-memory data store for caching and real-time applications', synonyms: ['Redis Cache'] },

  // Design
  { name: 'UI Design', slug: 'ui-design', category: 'design', description: 'Creating visual interfaces that are aesthetically pleasing and functional', synonyms: ['User Interface Design', 'Visual Design'] },
  { name: 'UX Research', slug: 'ux-research', category: 'design', description: 'Conducting user research to inform product design decisions', synonyms: ['User Research', 'Usability Testing'] },
  { name: 'Figma', slug: 'figma', category: 'design', description: 'Collaborative interface design and prototyping tool', synonyms: ['Figma Design'] },
  { name: 'Illustration', slug: 'illustration', category: 'design', description: 'Creating original artwork and visual assets for digital products', synonyms: ['Digital Illustration'] },
  { name: 'Brand Design', slug: 'brand-design', category: 'design', description: 'Developing cohesive visual identity systems for organizations', synonyms: ['Branding', 'Brand Identity'] },
  { name: 'Motion Design', slug: 'motion-design', category: 'design', description: 'Creating animations and motion graphics for digital experiences', synonyms: ['Animation', 'Motion Graphics'] },
  { name: 'Design Systems', slug: 'design-systems', category: 'design', description: 'Building and maintaining reusable component libraries and style guides', synonyms: ['Component Libraries'] },

  // Data
  { name: 'Data Analysis', slug: 'data-analysis', category: 'data', description: 'Extracting insights from structured and unstructured datasets', synonyms: ['Data Analytics', 'Analytics'] },
  { name: 'Machine Learning', slug: 'machine-learning', category: 'data', description: 'Building predictive models from data using statistical techniques', synonyms: ['ML', 'Statistical Learning'] },
  { name: 'Data Engineering', slug: 'data-engineering', category: 'data', description: 'Building data pipelines and infrastructure for analytics', synonyms: ['ETL', 'Data Pipelines'] },
  { name: 'SQL', slug: 'sql', category: 'data', description: 'Querying and manipulating data in relational databases', synonyms: ['Structured Query Language'] },
  { name: 'Python Data Science', slug: 'python-data-science', category: 'data', description: 'Using Python ecosystem (pandas, numpy, scipy) for data analysis', synonyms: ['Pandas', 'NumPy', 'SciPy'] },
  { name: 'Statistics', slug: 'statistics', category: 'data', description: 'Applying statistical methods to analyze and interpret data', synonyms: ['Statistical Analysis', 'Biostatistics'] },
  { name: 'Data Visualization', slug: 'data-visualization', category: 'data', description: 'Presenting data insights through charts, dashboards, and visual narratives', synonyms: ['DataViz', 'Dashboard Design'] },

  // DevOps
  { name: 'Docker', slug: 'docker', category: 'devops', description: 'Containerizing applications for consistent deployment environments', synonyms: ['Docker Compose', 'Containers'] },
  { name: 'Kubernetes', slug: 'kubernetes', category: 'devops', description: 'Orchestrating containerized applications at scale', synonyms: ['K8s', 'K8'] },
  { name: 'AWS', slug: 'aws', category: 'devops', description: 'Building and deploying on Amazon Web Services cloud infrastructure', synonyms: ['Amazon Web Services', 'Amazon Cloud'] },
  { name: 'GCP', slug: 'gcp', category: 'devops', description: 'Building and deploying on Google Cloud Platform infrastructure', synonyms: ['Google Cloud', 'Google Cloud Platform'] },
  { name: 'Azure', slug: 'azure', category: 'devops', description: 'Building and deploying on Microsoft Azure cloud infrastructure', synonyms: ['Microsoft Azure', 'Azure Cloud'] },
  { name: 'CI/CD', slug: 'ci-cd', category: 'devops', description: 'Automating build, test, and deployment pipelines', synonyms: ['Continuous Integration', 'Continuous Deployment', 'GitHub Actions'] },
  { name: 'Linux', slug: 'linux', category: 'devops', description: 'Managing Linux servers and system administration', synonyms: ['Linux Administration', 'Ubuntu', 'Debian'] },
  { name: 'Terraform', slug: 'terraform', category: 'devops', description: 'Infrastructure as code for provisioning cloud resources', synonyms: ['IaC', 'Infrastructure as Code'] },
  { name: 'Monitoring', slug: 'monitoring', category: 'devops', description: 'Setting up observability, alerting, and performance monitoring', synonyms: ['Observability', 'APM', 'Datadog', 'Grafana'] },

  // AI/ML
  { name: 'LLM Integration', slug: 'llm-integration', category: 'ai_ml', description: 'Integrating large language models into applications and workflows', synonyms: ['LLM', 'ChatGPT Integration', 'Claude Integration'] },
  { name: 'Prompt Engineering', slug: 'prompt-engineering', category: 'ai_ml', description: 'Designing effective prompts for AI model interactions', synonyms: ['Prompt Design'] },
  { name: 'Computer Vision', slug: 'computer-vision', category: 'ai_ml', description: 'Building systems that interpret and process visual information', synonyms: ['CV', 'Image Recognition'] },
  { name: 'NLP', slug: 'nlp', category: 'ai_ml', description: 'Processing and understanding human language with computational methods', synonyms: ['Natural Language Processing', 'Text Analysis'] },
  { name: 'Model Training', slug: 'model-training', category: 'ai_ml', description: 'Training and fine-tuning machine learning models on custom data', synonyms: ['Fine-Tuning', 'Model Fine-Tuning'] },

  // Blockchain
  { name: 'Smart Contracts', slug: 'smart-contracts', category: 'blockchain', description: 'Developing self-executing contracts on blockchain platforms', synonyms: ['Smart Contract Development'] },
  { name: 'Solidity', slug: 'solidity', category: 'blockchain', description: 'Programming language for Ethereum smart contract development', synonyms: ['Solidity Development'] },
  { name: 'Web3', slug: 'web3', category: 'blockchain', description: 'Building decentralized applications with blockchain integration', synonyms: ['Web3.js', 'Ethers.js', 'Viem', 'dApp Development'] },
  { name: 'DeFi', slug: 'defi', category: 'blockchain', description: 'Building decentralized finance protocols and applications', synonyms: ['Decentralized Finance'] },
  { name: 'Token Economics', slug: 'token-economics', category: 'blockchain', description: 'Designing sustainable token models and incentive structures', synonyms: ['Tokenomics', 'Token Design'] },

  // Business
  { name: 'Project Management', slug: 'project-management', category: 'business', description: 'Planning, executing, and delivering projects on time and within scope', synonyms: ['PM', 'Agile', 'Scrum'] },
  { name: 'Technical Writing', slug: 'technical-writing', category: 'business', description: 'Creating clear technical documentation for developers and users', synonyms: ['Tech Writing'] },
  { name: 'Content Strategy', slug: 'content-strategy', category: 'business', description: 'Planning and managing content creation for strategic objectives', synonyms: ['Content Planning'] },
  { name: 'Marketing', slug: 'marketing', category: 'business', description: 'Developing and executing marketing strategies for products', synonyms: ['Digital Marketing', 'Growth Marketing'] },
  { name: 'Business Analysis', slug: 'business-analysis', category: 'business', description: 'Analyzing business needs and translating them into requirements', synonyms: ['BA', 'Requirements Analysis'] },

  // Writing
  { name: 'Documentation', slug: 'documentation', category: 'writing', description: 'Writing comprehensive documentation for software and processes', synonyms: ['Docs', 'API Documentation'] },
  { name: 'Copywriting', slug: 'copywriting', category: 'writing', description: 'Writing persuasive copy for marketing and product interfaces', synonyms: ['Copy', 'UX Writing'] },
  { name: 'Content Writing', slug: 'content-writing', category: 'writing', description: 'Creating engaging written content for blogs, articles, and media', synonyms: ['Blog Writing', 'Article Writing'] },
  { name: 'Technical Documentation', slug: 'technical-documentation', category: 'writing', description: 'Creating structured technical guides, API references, and specs', synonyms: ['Tech Docs', 'API Docs'] },
] as const;

export async function seedSkills(db: Database) {
  for (const skill of CANONICAL_SKILLS) {
    await db
      .insert(skills)
      .values({
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        description: skill.description,
        synonyms: [...skill.synonyms] as string[],
      })
      .onConflictDoNothing({ target: skills.slug });
  }
}

export { CANONICAL_SKILLS };
