/**
 * CareerPilot AI — static data.
 * Skill dictionary, role profiles, curated project ideas, sample texts and demo records.
 * Plain data only: no network access, no logic beyond simple lookups.
 */

export const SKILL_CATEGORIES = ['Programming', 'ML/AI', 'Data', 'Web', 'Cloud/DevOps', 'Tools', 'Soft skills'];

export const APPLICATION_STATUSES = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];

/**
 * Skill dictionary (140 entries).
 * - `aliases` are matched case-insensitively.
 * - `cs` lists case-sensitive terms, used for short or ambiguous names (C, R, Go, Excel…).
 */
export const SKILLS = [
  // Programming
  { name: 'Python', aliases: ['python3'], category: 'Programming' },
  { name: 'JavaScript', aliases: ['js', 'es6', 'ecmascript'], category: 'Programming' },
  { name: 'TypeScript', aliases: [], category: 'Programming' },
  { name: 'Java', aliases: [], category: 'Programming' },
  { name: 'C', aliases: [], cs: ['C'], category: 'Programming' },
  { name: 'C++', aliases: ['cpp'], category: 'Programming' },
  { name: 'C#', aliases: ['c sharp', 'csharp'], category: 'Programming' },
  { name: '.NET', aliases: ['dotnet', 'asp.net'], category: 'Programming' },
  { name: 'Go', aliases: ['golang'], cs: ['Go'], category: 'Programming' },
  { name: 'Rust', aliases: [], category: 'Programming' },
  { name: 'Kotlin', aliases: [], category: 'Programming' },
  { name: 'Swift', aliases: [], cs: ['Swift'], category: 'Programming' },
  { name: 'PHP', aliases: [], category: 'Programming' },
  { name: 'Ruby', aliases: ['ruby on rails', 'rails'], category: 'Programming' },
  { name: 'R', aliases: ['rstudio', 'r programming'], cs: ['R'], category: 'Programming' },
  { name: 'MATLAB', aliases: [], category: 'Programming' },
  { name: 'Scala', aliases: [], category: 'Programming' },
  { name: 'Shell Scripting', aliases: ['bash', 'shell script', 'bash scripting', 'powershell'], category: 'Programming' },
  { name: 'Object-Oriented Programming', aliases: ['oop', 'object oriented programming', 'object-oriented'], category: 'Programming' },
  { name: 'Data Structures & Algorithms', aliases: ['data structures', 'algorithms', 'dsa', 'data structures and algorithms'], category: 'Programming' },

  // ML/AI
  { name: 'Machine Learning', aliases: ['machine-learning'], cs: ['ML'], category: 'ML/AI' },
  { name: 'Deep Learning', aliases: ['deep-learning', 'neural networks', 'neural network'], category: 'ML/AI' },
  { name: 'Natural Language Processing', aliases: ['nlp', 'text mining'], category: 'ML/AI' },
  { name: 'Computer Vision', aliases: ['image processing', 'image recognition', 'object detection'], category: 'ML/AI' },
  { name: 'TensorFlow', aliases: ['tensor flow'], category: 'ML/AI' },
  { name: 'PyTorch', aliases: ['torch'], category: 'ML/AI' },
  { name: 'Keras', aliases: [], category: 'ML/AI' },
  { name: 'scikit-learn', aliases: ['sklearn', 'scikit learn', 'scikit'], category: 'ML/AI' },
  { name: 'XGBoost', aliases: [], category: 'ML/AI' },
  { name: 'LightGBM', aliases: [], category: 'ML/AI' },
  { name: 'Hugging Face', aliases: ['huggingface', 'transformers'], category: 'ML/AI' },
  { name: 'spaCy', aliases: [], category: 'ML/AI' },
  { name: 'Large Language Models', aliases: ['llm', 'llms', 'large language model'], category: 'ML/AI' },
  { name: 'Prompt Engineering', aliases: ['prompting', 'prompt design'], category: 'ML/AI' },
  { name: 'Generative AI', aliases: ['genai', 'gen ai', 'generative models'], category: 'ML/AI' },
  { name: 'LangChain', aliases: [], category: 'ML/AI' },
  { name: 'OpenCV', aliases: ['open cv'], category: 'ML/AI' },
  { name: 'MLOps', aliases: ['ml ops'], category: 'ML/AI' },
  { name: 'MLflow', aliases: [], category: 'ML/AI' },
  { name: 'Reinforcement Learning', aliases: [], category: 'ML/AI' },
  { name: 'Feature Engineering', aliases: [], category: 'ML/AI' },
  { name: 'Model Deployment', aliases: ['deploying models', 'model serving', 'deploy models', 'deploying ml models'], category: 'ML/AI' },
  { name: 'Time Series Forecasting', aliases: ['time series', 'time-series', 'time series analysis'], category: 'ML/AI' },
  { name: 'Recommender Systems', aliases: ['recommendation systems', 'recommendation engine', 'recommender system'], category: 'ML/AI' },

  // Data
  { name: 'SQL', aliases: [], category: 'Data' },
  { name: 'PostgreSQL', aliases: ['postgres'], category: 'Data' },
  { name: 'MySQL', aliases: [], category: 'Data' },
  { name: 'MongoDB', aliases: ['mongo'], category: 'Data' },
  { name: 'SQLite', aliases: [], category: 'Data' },
  { name: 'Redis', aliases: [], category: 'Data' },
  { name: 'NoSQL', aliases: [], category: 'Data' },
  { name: 'Pandas', aliases: [], category: 'Data' },
  { name: 'NumPy', aliases: [], category: 'Data' },
  { name: 'Statistics', aliases: ['statistical analysis', 'statistical modeling', 'statistical modelling', 'probability'], category: 'Data' },
  { name: 'Data Analysis', aliases: ['data analytics', 'analyzing data', 'analysing data', 'exploratory data analysis', 'eda'], category: 'Data' },
  { name: 'Data Visualization', aliases: ['data visualisation', 'data viz', 'visualization', 'visualisation', 'dashboards', 'dashboarding'], category: 'Data' },
  { name: 'Data Cleaning', aliases: ['data wrangling', 'data preprocessing', 'data cleansing', 'data preparation'], category: 'Data' },
  { name: 'Excel', aliases: ['microsoft excel', 'ms excel', 'spreadsheets', 'google sheets'], cs: ['Excel'], category: 'Data' },
  { name: 'Power BI', aliases: ['powerbi', 'power-bi'], category: 'Data' },
  { name: 'Tableau', aliases: [], category: 'Data' },
  { name: 'Looker', aliases: ['looker studio'], category: 'Data' },
  { name: 'Apache Spark', aliases: ['pyspark', 'spark sql'], cs: ['Spark'], category: 'Data' },
  { name: 'Hadoop', aliases: [], category: 'Data' },
  { name: 'Airflow', aliases: ['apache airflow'], category: 'Data' },
  { name: 'ETL', aliases: ['elt', 'data pipelines', 'data pipeline'], category: 'Data' },
  { name: 'Data Warehousing', aliases: ['data warehouse', 'data warehouses'], category: 'Data' },
  { name: 'Snowflake', aliases: [], category: 'Data' },
  { name: 'BigQuery', aliases: ['big query'], category: 'Data' },
  { name: 'dbt', aliases: [], category: 'Data' },
  { name: 'Matplotlib', aliases: [], category: 'Data' },
  { name: 'Seaborn', aliases: [], category: 'Data' },
  { name: 'Plotly', aliases: [], category: 'Data' },
  { name: 'A/B Testing', aliases: ['ab testing', 'a/b tests', 'split testing', 'experimentation'], category: 'Data' },
  { name: 'Jupyter', aliases: ['jupyter notebook', 'jupyter notebooks', 'jupyterlab'], category: 'Data' },

  // Web
  { name: 'HTML', aliases: ['html5'], category: 'Web' },
  { name: 'CSS', aliases: ['css3'], category: 'Web' },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'], category: 'Web' },
  { name: 'Bootstrap', aliases: [], category: 'Web' },
  { name: 'React', aliases: ['react.js', 'reactjs'], category: 'Web' },
  { name: 'React Native', aliases: [], category: 'Web' },
  { name: 'Next.js', aliases: ['nextjs'], category: 'Web' },
  { name: 'Vue.js', aliases: ['vue', 'vuejs'], category: 'Web' },
  { name: 'Angular', aliases: ['angularjs'], category: 'Web' },
  { name: 'Svelte', aliases: [], category: 'Web' },
  { name: 'Node.js', aliases: ['nodejs', 'node js'], category: 'Web' },
  { name: 'Express.js', aliases: ['expressjs', 'express js'], cs: ['Express'], category: 'Web' },
  { name: 'FastAPI', aliases: ['fast api'], category: 'Web' },
  { name: 'Django', aliases: [], category: 'Web' },
  { name: 'Flask', aliases: [], category: 'Web' },
  { name: 'Spring Boot', aliases: ['springboot'], category: 'Web' },
  { name: 'Laravel', aliases: [], category: 'Web' },
  { name: 'REST APIs', aliases: ['rest api', 'restful', 'restful api', 'restful apis', 'rest apis'], cs: ['REST'], category: 'Web' },
  { name: 'GraphQL', aliases: [], category: 'Web' },
  { name: 'Redux', aliases: [], category: 'Web' },
  { name: 'Responsive Design', aliases: ['responsive web design', 'mobile-first', 'mobile first'], category: 'Web' },
  { name: 'Web Accessibility', aliases: ['accessibility', 'wcag', 'a11y'], category: 'Web' },

  // Cloud/DevOps
  { name: 'AWS', aliases: ['amazon web services', 'ec2', 'sagemaker', 'aws lambda'], category: 'Cloud/DevOps' },
  { name: 'Azure', aliases: ['microsoft azure'], category: 'Cloud/DevOps' },
  { name: 'Google Cloud', aliases: ['gcp', 'google cloud platform'], category: 'Cloud/DevOps' },
  { name: 'Docker', aliases: ['containerization', 'dockerfile', 'docker compose'], category: 'Cloud/DevOps' },
  { name: 'Kubernetes', aliases: ['k8s', 'kubectl', 'helm'], category: 'Cloud/DevOps' },
  { name: 'CI/CD', aliases: ['ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment'], category: 'Cloud/DevOps' },
  { name: 'GitHub Actions', aliases: [], category: 'Cloud/DevOps' },
  { name: 'Jenkins', aliases: [], category: 'Cloud/DevOps' },
  { name: 'Terraform', aliases: ['infrastructure as code'], category: 'Cloud/DevOps' },
  { name: 'Linux', aliases: ['ubuntu', 'unix', 'debian'], category: 'Cloud/DevOps' },
  { name: 'Nginx', aliases: [], category: 'Cloud/DevOps' },
  { name: 'Serverless', aliases: [], category: 'Cloud/DevOps' },
  { name: 'Firebase', aliases: [], category: 'Cloud/DevOps' },
  { name: 'Microservices', aliases: ['microservice', 'micro-services'], category: 'Cloud/DevOps' },

  // Tools
  { name: 'Git', aliases: ['version control'], category: 'Tools' },
  { name: 'GitHub', aliases: [], category: 'Tools' },
  { name: 'GitLab', aliases: [], category: 'Tools' },
  { name: 'Jira', aliases: [], category: 'Tools' },
  { name: 'Figma', aliases: [], category: 'Tools' },
  { name: 'Adobe XD', aliases: [], category: 'Tools' },
  { name: 'Postman', aliases: [], category: 'Tools' },
  { name: 'VS Code', aliases: ['visual studio code', 'vscode'], category: 'Tools' },
  { name: 'Agile', aliases: ['agile methodology', 'agile methodologies'], category: 'Tools' },
  { name: 'Scrum', aliases: ['sprint planning', 'scrum master'], category: 'Tools' },
  { name: 'Unit Testing', aliases: ['unit tests', 'unit test', 'tdd', 'test-driven development', 'automated testing'], category: 'Tools' },
  { name: 'Jest', aliases: [], category: 'Tools' },
  { name: 'Pytest', aliases: ['py.test'], category: 'Tools' },
  { name: 'UI/UX Design', aliases: ['ui/ux', 'ux/ui', 'ux design', 'ui design', 'user experience', 'user interface design'], category: 'Tools' },
  { name: 'Wireframing', aliases: ['wireframes', 'wireframe'], category: 'Tools' },
  { name: 'Prototyping', aliases: ['interactive prototypes', 'prototypes'], category: 'Tools' },
  { name: 'User Research', aliases: ['usability testing', 'user interviews', 'user testing'], category: 'Tools' },

  // Soft skills
  { name: 'Communication', aliases: ['communication skills', 'communicating', 'verbal and written', 'written and verbal'], category: 'Soft skills' },
  { name: 'Teamwork', aliases: ['team player', 'team work', 'working in teams'], category: 'Soft skills' },
  { name: 'Collaboration', aliases: ['collaborative', 'cross-functional', 'collaborated', 'collaborate'], category: 'Soft skills' },
  { name: 'Leadership', aliases: ['led a team', 'team lead', 'leading teams', 'led teams'], category: 'Soft skills' },
  { name: 'Problem Solving', aliases: ['problem-solving', 'solving problems', 'troubleshooting'], category: 'Soft skills' },
  { name: 'Critical Thinking', aliases: ['analytical thinking', 'analytical skills'], category: 'Soft skills' },
  { name: 'Time Management', aliases: ['prioritization', 'prioritisation', 'meeting deadlines'], category: 'Soft skills' },
  { name: 'Adaptability', aliases: ['adaptable', 'fast learner', 'quick learner'], category: 'Soft skills' },
  { name: 'Presentation Skills', aliases: ['presentations', 'presenting', 'public speaking', 'presented'], category: 'Soft skills' },
  { name: 'Stakeholder Management', aliases: ['stakeholders', 'stakeholder'], category: 'Soft skills' },
  { name: 'Mentoring', aliases: ['mentor', 'mentored', 'mentorship'], category: 'Soft skills' },
  { name: 'Attention to Detail', aliases: ['detail-oriented', 'detail oriented'], category: 'Soft skills' },
  { name: 'Creativity', aliases: ['creative'], category: 'Soft skills' },
];

/** Typical skill sets per target role (used for suggestions, roadmap context and project ranking). */
export const ROLE_PROFILES = [
  { id: 'ml-engineer', title: 'Machine Learning Engineer', match: ['machine learning', 'ml engineer', 'mlops', 'ml intern'],
    skills: ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'scikit-learn', 'SQL', 'Docker', 'MLOps', 'Statistics', 'Git', 'AWS'] },
  { id: 'data-scientist', title: 'Data Scientist', match: ['data scientist', 'data science'],
    skills: ['Python', 'Statistics', 'Machine Learning', 'Pandas', 'NumPy', 'SQL', 'scikit-learn', 'Data Visualization', 'A/B Testing', 'Jupyter', 'Communication'] },
  { id: 'data-analyst', title: 'Data Analyst', match: ['data analyst', 'business analyst', 'bi analyst', 'business intelligence', 'analytics'],
    skills: ['SQL', 'Excel', 'Power BI', 'Tableau', 'Python', 'Statistics', 'Data Visualization', 'Data Cleaning', 'Communication', 'Presentation Skills'] },
  { id: 'ai-engineer', title: 'AI Engineer', match: ['ai engineer', 'llm', 'generative ai', 'nlp engineer', 'nlp'],
    skills: ['Python', 'Large Language Models', 'Prompt Engineering', 'LangChain', 'Natural Language Processing', 'Hugging Face', 'FastAPI', 'Docker', 'Git'] },
  { id: 'data-engineer', title: 'Data Engineer', match: ['data engineer'],
    skills: ['Python', 'SQL', 'ETL', 'Airflow', 'Apache Spark', 'Data Warehousing', 'PostgreSQL', 'Docker', 'AWS'] },
  { id: 'frontend', title: 'Frontend Developer', match: ['frontend', 'front-end', 'front end', 'ui developer', 'react developer'],
    skills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Responsive Design', 'Web Accessibility', 'Git', 'Tailwind CSS', 'Unit Testing'] },
  { id: 'full-stack', title: 'Full Stack Developer', match: ['full stack', 'full-stack', 'fullstack'],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express.js', 'PostgreSQL', 'REST APIs', 'Docker', 'Git', 'Unit Testing'] },
  { id: 'backend', title: 'Backend Developer', match: ['backend', 'back-end', 'back end', 'api developer', 'python developer'],
    skills: ['Python', 'FastAPI', 'Django', 'PostgreSQL', 'REST APIs', 'Docker', 'Redis', 'Linux', 'Git', 'Unit Testing'] },
  { id: 'ui-ux', title: 'UI/UX Designer', match: ['ui/ux', 'ux designer', 'ui designer', 'product designer', 'ux'],
    skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'User Research', 'Web Accessibility', 'HTML', 'CSS', 'Communication'] },
  { id: 'devops', title: 'DevOps Engineer', match: ['devops', 'site reliability', 'sre', 'platform engineer', 'cloud engineer'],
    skills: ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'GitHub Actions', 'Shell Scripting', 'Nginx', 'Git'] },
];

export const PROJECT_CATEGORIES = ['AI/ML', 'Data', 'Web', 'Full Stack', 'Analytics'];
export const PROJECT_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
export const PROJECT_OBJECTIVES = [
  'Model training & evaluation', 'Deployment & MLOps', 'NLP & LLM apps', 'Computer vision',
  'Data pipelines', 'Databases & SQL', 'Visualization & storytelling', 'Statistics & experiments',
  'UI engineering', 'Accessibility & UX', 'API design', 'Testing & quality',
];

/** Curated portfolio project ideas. `technologies` use dictionary skill names. */
export const PROJECTS = [
  { id: 'churn-service', title: 'Customer Churn Prediction Service', category: 'AI/ML', difficulty: 'Intermediate', weeks: 3,
    roles: ['ml-engineer', 'data-scientist'], technologies: ['Python', 'scikit-learn', 'Pandas', 'FastAPI', 'Docker'],
    objectives: ['Model training & evaluation', 'Deployment & MLOps'],
    summary: 'Train a churn classifier on a public telecom dataset and expose predictions through a small REST API.',
    milestones: ['Explore and clean the dataset', 'Train and compare 3 baseline models', 'Wrap the best model in a FastAPI endpoint', 'Containerize with Docker and document the API'] },
  { id: 'resume-nlp', title: 'Resume Skill Extractor (NLP)', category: 'AI/ML', difficulty: 'Intermediate', weeks: 3,
    roles: ['ai-engineer', 'ml-engineer'], technologies: ['Python', 'Natural Language Processing', 'spaCy', 'Hugging Face', 'FastAPI'],
    objectives: ['NLP & LLM apps', 'API design'],
    summary: 'Extract skills and entities from resume text with rule-based and transformer-based approaches, then compare them.',
    milestones: ['Collect 50 anonymised sample resumes', 'Build a rule-based baseline with spaCy', 'Fine-tune a small transformer', 'Serve both behind one API and compare accuracy'] },
  { id: 'transfer-vision', title: 'Image Classifier with Transfer Learning', category: 'AI/ML', difficulty: 'Intermediate', weeks: 2,
    roles: ['ml-engineer', 'ai-engineer'], technologies: ['PyTorch', 'Deep Learning', 'Computer Vision', 'Python'],
    objectives: ['Computer vision', 'Model training & evaluation'],
    summary: 'Fine-tune a pretrained CNN on a small custom image dataset and report per-class metrics.',
    milestones: ['Assemble and split the dataset', 'Fine-tune a pretrained backbone', 'Analyse the confusion matrix', 'Publish a demo notebook with results'] },
  { id: 'rag-assistant', title: 'Document Q&A Assistant (RAG)', category: 'AI/ML', difficulty: 'Advanced', weeks: 4,
    roles: ['ai-engineer'], technologies: ['Large Language Models', 'LangChain', 'Python', 'Prompt Engineering', 'FastAPI'],
    objectives: ['NLP & LLM apps', 'API design'],
    summary: 'Build a retrieval-augmented question answering app over your own documents, with source citations.',
    milestones: ['Chunk and embed a document set', 'Implement retrieval with citations', 'Design and evaluate prompts', 'Add a simple chat UI and usage limits'] },
  { id: 'mlops-pipeline', title: 'MLOps Pipeline with Experiment Tracking', category: 'AI/ML', difficulty: 'Advanced', weeks: 4,
    roles: ['ml-engineer', 'devops'], technologies: ['MLflow', 'Docker', 'GitHub Actions', 'scikit-learn', 'MLOps'],
    objectives: ['Deployment & MLOps', 'Testing & quality'],
    summary: 'Automate training, tracking and packaging of a model so every commit produces a versioned, tested artefact.',
    milestones: ['Track experiments with MLflow', 'Add data and model tests', 'Automate training in CI', 'Build and publish a serving image'] },
  { id: 'sales-forecast', title: 'Time-Series Sales Forecaster', category: 'AI/ML', difficulty: 'Intermediate', weeks: 3,
    roles: ['data-scientist', 'ml-engineer'], technologies: ['Time Series Forecasting', 'Pandas', 'XGBoost', 'Plotly'],
    objectives: ['Model training & evaluation', 'Visualization & storytelling'],
    summary: 'Forecast weekly sales for a retail dataset and visualise prediction intervals for planners.',
    milestones: ['Resample and engineer lag features', 'Compare naive, statistical and XGBoost models', 'Backtest on rolling windows', 'Build an interactive forecast chart'] },
  { id: 'recommender', title: 'Movie Recommender System', category: 'AI/ML', difficulty: 'Intermediate', weeks: 3,
    roles: ['data-scientist', 'ml-engineer'], technologies: ['Recommender Systems', 'Python', 'Pandas', 'Flask'],
    objectives: ['Model training & evaluation', 'API design'],
    summary: 'Implement content-based and collaborative filtering recommenders and compare their hit rate.',
    milestones: ['Prepare a ratings matrix', 'Build a content-based baseline', 'Add collaborative filtering', 'Serve top-N recommendations via Flask'] },
  { id: 'object-detection', title: 'Real-time Object Detection Demo', category: 'AI/ML', difficulty: 'Advanced', weeks: 3,
    roles: ['ml-engineer', 'ai-engineer'], technologies: ['OpenCV', 'PyTorch', 'Computer Vision', 'Docker'],
    objectives: ['Computer vision', 'Deployment & MLOps'],
    summary: 'Run a pretrained detector on webcam video with OpenCV and measure latency on CPU.',
    milestones: ['Load a pretrained detector', 'Stream frames with OpenCV', 'Optimise for CPU latency', 'Package the demo in Docker'] },
  { id: 'airflow-etl', title: 'ETL Pipeline with Airflow', category: 'Data', difficulty: 'Advanced', weeks: 3,
    roles: ['data-engineer', 'data-analyst'], technologies: ['Airflow', 'Python', 'PostgreSQL', 'ETL', 'Docker'],
    objectives: ['Data pipelines', 'Databases & SQL'],
    summary: 'Schedule a daily pipeline that pulls open data, validates it and loads a PostgreSQL warehouse.',
    milestones: ['Design the target schema', 'Write extract and transform tasks', 'Add data quality checks', 'Run everything with Docker Compose'] },
  { id: 'cleaning-toolkit', title: 'Data Cleaning Toolkit', category: 'Data', difficulty: 'Beginner', weeks: 1,
    roles: ['data-analyst', 'data-scientist'], technologies: ['Pandas', 'Data Cleaning', 'Jupyter', 'Python'],
    objectives: ['Data pipelines', 'Testing & quality'],
    summary: 'Create reusable Pandas functions for missing values, outliers and type fixes, demonstrated on a messy dataset.',
    milestones: ['Profile a messy dataset', 'Write reusable cleaning functions', 'Add simple tests', 'Document before/after results'] },
  { id: 'sql-case-study', title: 'SQL Analytics Case Study', category: 'Data', difficulty: 'Beginner', weeks: 1,
    roles: ['data-analyst', 'data-engineer'], technologies: ['SQL', 'PostgreSQL', 'Data Analysis'],
    objectives: ['Databases & SQL', 'Visualization & storytelling'],
    summary: 'Answer 12 business questions on an e-commerce schema using joins, window functions and CTEs.',
    milestones: ['Load the sample schema', 'Write 12 analytical queries', 'Explain each query in plain language', 'Summarise 3 business recommendations'] },
  { id: 'spark-logs', title: 'Spark Log Analytics', category: 'Data', difficulty: 'Advanced', weeks: 3,
    roles: ['data-engineer'], technologies: ['Apache Spark', 'Python', 'Data Warehousing', 'AWS'],
    objectives: ['Data pipelines', 'Databases & SQL'],
    summary: 'Process millions of web log lines with PySpark and produce daily traffic aggregates.',
    milestones: ['Parse raw logs into a schema', 'Aggregate with Spark SQL', 'Partition output efficiently', 'Benchmark and document performance'] },
  { id: 'kpi-dashboard', title: 'Sales KPI Dashboard', category: 'Analytics', difficulty: 'Beginner', weeks: 1,
    roles: ['data-analyst'], technologies: ['Power BI', 'Excel', 'Data Visualization', 'SQL'],
    objectives: ['Visualization & storytelling', 'Databases & SQL'],
    summary: 'Design a one-page KPI dashboard with drill-downs for a fictional retail company.',
    milestones: ['Define 6 KPIs with stakeholders in mind', 'Model the data', 'Build the dashboard', 'Write a short insight memo'] },
  { id: 'ab-test', title: 'A/B Test Analyzer', category: 'Analytics', difficulty: 'Intermediate', weeks: 2,
    roles: ['data-scientist', 'data-analyst'], technologies: ['Statistics', 'A/B Testing', 'Python', 'Plotly'],
    objectives: ['Statistics & experiments', 'Visualization & storytelling'],
    summary: 'Build a notebook that checks sample size, runs significance tests and explains results for non-experts.',
    milestones: ['Simulate an experiment dataset', 'Implement power and significance checks', 'Visualise effect sizes', 'Write a plain-language recommendation'] },
  { id: 'health-story', title: 'Public Health Data Story', category: 'Analytics', difficulty: 'Beginner', weeks: 2,
    roles: ['data-analyst', 'data-scientist'], technologies: ['Tableau', 'Data Visualization', 'Pandas', 'Presentation Skills'],
    objectives: ['Visualization & storytelling'],
    summary: 'Tell a clear story with open health data: one question, five charts, one recommendation.',
    milestones: ['Pick one focused question', 'Clean the open dataset', 'Design five supporting charts', 'Present the story in 5 minutes'] },
  { id: 'segmentation', title: 'Customer Segmentation', category: 'Analytics', difficulty: 'Intermediate', weeks: 2,
    roles: ['data-scientist', 'data-analyst'], technologies: ['scikit-learn', 'Pandas', 'Machine Learning', 'Seaborn'],
    objectives: ['Model training & evaluation', 'Visualization & storytelling'],
    summary: 'Cluster customers by behaviour and describe each segment with actionable personas.',
    milestones: ['Engineer RFM features', 'Compare clustering methods', 'Profile each segment', 'Propose one action per segment'] },
  { id: 'a11y-portfolio', title: 'Accessible Portfolio Website', category: 'Web', difficulty: 'Beginner', weeks: 1,
    roles: ['frontend', 'ui-ux'], technologies: ['HTML', 'CSS', 'JavaScript', 'Responsive Design', 'Web Accessibility'],
    objectives: ['UI engineering', 'Accessibility & UX'],
    summary: 'Hand-code a fast, accessible personal portfolio that scores well on automated audits.',
    milestones: ['Design a mobile-first layout', 'Build semantic HTML sections', 'Add keyboard and screen-reader support', 'Audit and fix accessibility issues'] },
  { id: 'design-system', title: 'Design System Component Library', category: 'Web', difficulty: 'Intermediate', weeks: 3,
    roles: ['frontend', 'ui-ux'], technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Figma', 'Unit Testing'],
    objectives: ['UI engineering', 'Testing & quality'],
    summary: 'Turn a small Figma design system into tested, documented React components.',
    milestones: ['Define tokens in Figma', 'Build 8 core components', 'Add unit tests', 'Publish a documentation page'] },
  { id: 'weather-spa', title: 'Weather Dashboard SPA', category: 'Web', difficulty: 'Beginner', weeks: 1,
    roles: ['frontend'], technologies: ['JavaScript', 'REST APIs', 'CSS', 'Responsive Design'],
    objectives: ['UI engineering', 'API design'],
    summary: 'Fetch data from a public weather API and present it with loading, empty and error states.',
    milestones: ['Design the layout', 'Fetch and cache API data', 'Handle loading and error states', 'Deploy to a static host'] },
  { id: 'ux-case-study', title: 'UX Case Study: App Redesign', category: 'Web', difficulty: 'Intermediate', weeks: 2,
    roles: ['ui-ux', 'frontend'], technologies: ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'UI/UX Design'],
    objectives: ['Accessibility & UX'],
    summary: 'Research, redesign and test one flow of an everyday app; document decisions as a case study.',
    milestones: ['Interview 5 users', 'Map pain points', 'Wireframe and prototype a new flow', 'Run a usability test and iterate'] },
  { id: 'job-tracker-fs', title: 'Full Stack Job Tracker', category: 'Full Stack', difficulty: 'Intermediate', weeks: 3,
    roles: ['full-stack', 'backend', 'frontend'], technologies: ['React', 'Node.js', 'Express.js', 'PostgreSQL', 'Docker'],
    objectives: ['API design', 'Databases & SQL'],
    summary: 'Build a multi-user job tracker with authentication, CRUD and a status board.',
    milestones: ['Design the data model', 'Build the REST API with auth', 'Create the React board UI', 'Deploy with Docker Compose'] },
  { id: 'ml-api-dashboard', title: 'ML Model API + Dashboard', category: 'Full Stack', difficulty: 'Advanced', weeks: 4,
    roles: ['full-stack', 'ml-engineer'], technologies: ['FastAPI', 'React', 'scikit-learn', 'Docker', 'PostgreSQL'],
    objectives: ['Deployment & MLOps', 'API design'],
    summary: 'Serve a trained model through an API, log predictions to PostgreSQL and monitor them in a dashboard.',
    milestones: ['Train and export a model', 'Build prediction and logging endpoints', 'Create a monitoring dashboard', 'Containerize all services'] },
  { id: 'chat-app', title: 'Real-time Chat App', category: 'Full Stack', difficulty: 'Advanced', weeks: 3,
    roles: ['full-stack', 'backend'], technologies: ['Node.js', 'React', 'MongoDB', 'Redis'],
    objectives: ['API design', 'Databases & SQL'],
    summary: 'Create a chat app with rooms, presence and message history.',
    milestones: ['Model users, rooms and messages', 'Implement real-time messaging', 'Add presence with Redis', 'Load-test and optimise'] },
  { id: 'rest-starter', title: 'Auth & REST API Starter', category: 'Full Stack', difficulty: 'Intermediate', weeks: 2,
    roles: ['backend', 'full-stack'], technologies: ['FastAPI', 'PostgreSQL', 'REST APIs', 'Docker', 'Pytest'],
    objectives: ['API design', 'Testing & quality'],
    summary: 'A production-style API template with JWT auth, migrations, validation and tests.',
    milestones: ['Set up project structure and migrations', 'Implement register/login with JWT', 'Add CRUD with validation', 'Reach 80% test coverage'] },
  { id: 'cicd-webapp', title: 'CI/CD for a Web App', category: 'Full Stack', difficulty: 'Intermediate', weeks: 2,
    roles: ['devops', 'full-stack'], technologies: ['GitHub Actions', 'Docker', 'CI/CD', 'Nginx', 'Linux'],
    objectives: ['Deployment & MLOps', 'Testing & quality'],
    summary: 'Add linting, tests, image builds and automatic deployment to an existing web project.',
    milestones: ['Write lint and test jobs', 'Build and tag Docker images', 'Deploy behind Nginx on a Linux VM', 'Add status badges and a rollback guide'] },
  { id: 'k8s-microservices', title: 'Kubernetes Microservices Deployment', category: 'Full Stack', difficulty: 'Advanced', weeks: 4,
    roles: ['devops', 'backend'], technologies: ['Kubernetes', 'Docker', 'Microservices', 'Terraform'],
    objectives: ['Deployment & MLOps'],
    summary: 'Deploy three small services to a local Kubernetes cluster with infrastructure defined as code.',
    milestones: ['Containerize three services', 'Write Kubernetes manifests', 'Provision infrastructure with Terraform', 'Add health checks and autoscaling'] },
];

/** Sample CV used when a PDF is dropped (the prototype does not parse PDF contents). */
export const SAMPLE_CV_TEXT = `ALEX RAHMAN
Aspiring Machine Learning Engineer · Dhaka, Bangladesh
alex.rahman@example.com · +880 1700-000000

PROFESSIONAL SUMMARY
Computer Science graduate with hands-on experience building machine learning models in Python. Comfortable with the full data workflow: data cleaning with Pandas and NumPy, model training with scikit-learn, and communicating results with clear data visualization. Looking for an entry-level ML engineering role.

EDUCATION
B.Sc. in Computer Science & Engineering, Demo University of Technology (2020 – 2024)
CGPA 3.65 / 4.00 · Thesis: Transformer-based sentiment analysis for Bangla text

TECHNICAL SKILLS
Languages: Python, SQL, JavaScript, C++
ML / Data: scikit-learn, TensorFlow, Pandas, NumPy, Matplotlib, Seaborn, Jupyter
Web & Tools: HTML, CSS, Git, GitHub, Figma, Linux

PROJECTS
- Bangla Sentiment Classifier: fine-tuned a transformer model with TensorFlow and Hugging Face; improved F1 score by 9% over the baseline.
- House Price Prediction: built an end-to-end regression pipeline with feature engineering; reduced RMSE by 14%.
- Student Performance Dashboard: designed an interactive dashboard with Plotly used by 120+ students.

EXPERIENCE
Data Science Intern, Demo Analytics Ltd. (Jun 2023 – Aug 2023)
- Cleaned and analyzed 50k+ customer records with Pandas and SQL.
- Automated weekly reporting, saving the team 6 hours per week.
- Collaborated with a cross-functional team and presented findings to stakeholders.

ACTIVITIES
Mentored junior students in the university programming club and worked as team lead for a 48-hour hackathon project.`;

/** Sample job descriptions (fictional companies). The first two are also used as demo saved jobs. */
export const SAMPLE_JOBS = [
  {
    key: 'ml-engineer',
    title: 'Machine Learning Engineer',
    company: 'Nimbus Analytics',
    description: `About the role
Nimbus Analytics is looking for a Machine Learning Engineer to design, train and deploy models that power our forecasting products.

Responsibilities
- Build and maintain machine learning pipelines from data ingestion to model deployment
- Train, evaluate and optimize models using PyTorch or TensorFlow
- Work with data engineers and product managers to define success metrics
- Monitor models in production and improve reliability
- Write clean, tested Python code and document your work

Requirements
- 2+ years of experience with Python and machine learning
- Strong knowledge of scikit-learn, Pandas and NumPy
- Solid SQL skills and a good understanding of statistics
- Experience with Docker and Git
- Good communication and problem-solving skills

Nice to have
- Experience with AWS (SageMaker) or Google Cloud
- Familiarity with MLOps tools such as MLflow
- Kubernetes or Airflow experience is a plus
- FastAPI for model serving`,
  },
  {
    key: 'data-analyst',
    title: 'Data Analyst',
    company: 'Quantia Health',
    description: `About us
Quantia Health helps clinics make better decisions with data.

What you'll do
- Turn raw clinical and operational data into clear dashboards and reports
- Write SQL queries to analyze trends and answer business questions
- Present insights to stakeholders and non-technical teams
- Maintain data quality through data cleaning and validation

Required qualifications
- 1-3 years of experience in data analysis
- Advanced SQL and Excel
- Experience with Power BI or Tableau
- Working knowledge of Python (Pandas) or R
- Understanding of statistics and A/B testing
- Strong communication and attention to detail

Preferred
- Experience with Looker or BigQuery
- Healthcare domain knowledge
- Familiarity with dbt`,
  },
  {
    key: 'frontend',
    title: 'Frontend Developer',
    company: 'Cobalt Studio',
    description: `Role overview
Cobalt Studio builds accessible web products for education startups.

Key responsibilities
- Build responsive, accessible interfaces with React and TypeScript
- Translate Figma designs into reusable components
- Integrate REST APIs and manage state with Redux
- Write unit tests with Jest

Must have
- 1+ years of experience building web applications
- Strong HTML, CSS and JavaScript fundamentals
- Experience with React and Git
- Knowledge of web accessibility (WCAG)

Bonus
- Next.js or Tailwind CSS
- Experience with CI/CD and GitHub Actions
- UI/UX design sensibility`,
  },
];

/* ------------------------------------------------------------------------- */
/* Demo records (loaded on first visit, removable from Settings)             */
/* ------------------------------------------------------------------------- */

export const DEMO_PROFILE = {
  fullName: 'Alex Rahman',
  headline: 'CSE Graduate · Aspiring Machine Learning Engineer',
  location: 'Dhaka, Bangladesh',
  targetRole: 'Machine Learning Engineer',
  experienceLevel: 'Entry level',
  summary: 'Computer Science graduate who enjoys turning data into useful products. Experienced with Python, Pandas and scikit-learn through university projects and a data science internship; now focused on deep learning and model deployment.',
  education: [
    { degree: 'B.Sc. in Computer Science & Engineering', institution: 'Demo University of Technology', startYear: '2020', endYear: '2024', grade: 'CGPA 3.65 / 4.00' },
  ],
  links: { linkedin: '', github: '', portfolio: '' },
};

export const DEMO_SKILLS = [
  { name: 'Python', level: 82 },
  { name: 'Pandas', level: 75 },
  { name: 'NumPy', level: 72 },
  { name: 'Machine Learning', level: 70 },
  { name: 'scikit-learn', level: 68 },
  { name: 'SQL', level: 62 },
  { name: 'Statistics', level: 58 },
  { name: 'Data Visualization', level: 64 },
  { name: 'Deep Learning', level: 45 },
  { name: 'TensorFlow', level: 38 },
  { name: 'Git', level: 72 },
  { name: 'Docker', level: 22 },
  { name: 'JavaScript', level: 52 },
  { name: 'HTML', level: 70 },
  { name: 'Figma', level: 60 },
  { name: 'Communication', level: 74 },
  { name: 'Teamwork', level: 80 },
  { name: 'Problem Solving', level: 76 },
];

/**
 * Demo applications. Dates are relative (days ago) so the demo always looks current.
 * `history` lists [status, daysAgo] steps.
 */
export const DEMO_APPLICATIONS = [
  { jobTitle: 'Machine Learning Engineer', company: 'Nimbus Analytics', location: 'Remote', status: 'Interview', applied: 24,
    history: [['Applied', 24], ['Screening', 17], ['Interview', 8]], notes: 'Technical interview booked. Revise model deployment and SQL window functions.' },
  { jobTitle: 'Data Analyst', company: 'Quantia Health', location: 'Dhaka', status: 'Screening', applied: 12,
    history: [['Applied', 12], ['Screening', 5]], notes: 'Recruiter call went well; waiting on the take-home task.' },
  { jobTitle: 'Junior Data Scientist', company: 'Bluepeak Labs', location: 'Hybrid · Dhaka', status: 'Applied', applied: 6,
    history: [['Applied', 6]], notes: '' },
  { jobTitle: 'AI Engineer (NLP)', company: 'Riverstone AI', location: 'Remote', status: 'Rejected', applied: 40,
    history: [['Applied', 40], ['Screening', 33], ['Rejected', 26]], notes: 'Feedback: needs more production LLM experience.' },
  { jobTitle: 'ML Intern', company: 'Helix Robotics', location: 'Chattogram', status: 'Offer', applied: 55,
    history: [['Applied', 55], ['Screening', 48], ['Interview', 41], ['Offer', 30]], notes: '6-month internship offer. Decide by end of month.' },
  { jobTitle: 'Frontend Developer', company: 'Cobalt Studio', location: 'Remote', status: 'Saved', applied: null, created: 3,
    history: [['Saved', 3]], notes: 'Interesting accessibility focus. Tailor portfolio before applying.' },
  { jobTitle: 'Data Engineer', company: 'Northwind Data', location: 'Dhaka', status: 'Withdrawn', applied: 35,
    history: [['Applied', 35], ['Withdrawn', 28]], notes: 'Withdrew: role required relocation.' },
  { jobTitle: 'Business Intelligence Analyst', company: 'Lumen Fintech', location: 'Dhaka', status: 'Applied', applied: 18,
    history: [['Applied', 18]], notes: '' },
  { jobTitle: 'Computer Vision Engineer', company: 'Vertex Mobility', location: 'Remote', status: 'Rejected', applied: 62,
    history: [['Applied', 62], ['Rejected', 50]], notes: '' },
  { jobTitle: 'Research Assistant (ML)', company: 'Demo University Lab', location: 'On-site', status: 'Interview', applied: 15,
    history: [['Applied', 15], ['Interview', 4]], notes: 'Prepare a 10-minute thesis presentation.' },
  { jobTitle: 'Python Developer', company: 'Orbital Commerce', location: 'Hybrid · Dhaka', status: 'Screening', applied: 30,
    history: [['Applied', 30], ['Screening', 20]], notes: '' },
  { jobTitle: 'UI/UX Designer', company: 'Pixelcraft', location: 'Remote', status: 'Saved', applied: null, created: 1,
    history: [['Saved', 1]], notes: '' },
];
