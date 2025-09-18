import { BoardTemplate } from '../types/BoardTypes';

export const BuiltInTemplates: BoardTemplate[] = [
  // Project Management Templates
  {
    id: 'basic-kanban',
    name: 'Basic Kanban',
    description: 'A simple and effective Kanban board for managing tasks and workflows. Perfect for teams getting started with visual project management.',
    category: 'project-management',
    boardType: 'kanban',
    columnCount: 4,
    isPopular: true,
    isBuiltIn: true,
    isPublic: true,
    tags: ['kanban', 'simple', 'tasks', 'workflow', 'beginner'],
    usageCount: 15420,
    averageRating: 4.7,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    features: [
      'Visual task management',
      'Drag and drop workflow',
      'Simple progress tracking',
      'Team collaboration'
    ],
    useCases: [
      'Personal task management',
      'Small team workflows',
      'Simple project tracking',
      'Daily standup management'
    ],
    columns: [
      {
        name: 'To Do',
        description: 'Tasks that need to be started',
        color: '#EF4444',
        settings: { wipLimit: null }
      },
      {
        name: 'In Progress',
        description: 'Tasks currently being worked on',
        color: '#F59E0B',
        settings: { wipLimit: 3 }
      },
      {
        name: 'Review',
        description: 'Tasks that need review or approval',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Done',
        description: 'Completed tasks',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'agile-sprint',
    name: 'Agile Sprint Board',
    description: 'Scrum board designed for agile software development teams. Track sprint backlogs, user stories, and sprint progress.',
    category: 'software-development',
    boardType: 'scrum',
    columnCount: 5,
    isPopular: true,
    isBuiltIn: true,
    isPublic: true,
    tags: ['scrum', 'agile', 'sprint', 'development', 'user stories'],
    usageCount: 12890,
    averageRating: 4.8,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    features: [
      'Sprint planning',
      'User story management',
      'Sprint progress tracking',
      'Team velocity metrics',
      'Burndown chart integration'
    ],
    useCases: [
      'Software development sprints',
      'Agile project management',
      'Sprint planning and tracking',
      'Development team coordination'
    ],
    columns: [
      {
        name: 'Product Backlog',
        description: 'Features and tasks to be developed',
        color: '#6366F1',
        settings: { wipLimit: null }
      },
      {
        name: 'Sprint Backlog',
        description: 'Tasks planned for current sprint',
        color: '#3B82F6',
        settings: { wipLimit: null }
      },
      {
        name: 'In Development',
        description: 'Currently being coded',
        color: '#F59E0B',
        settings: { wipLimit: 5 }
      },
      {
        name: 'Testing',
        description: 'Quality assurance and testing',
        color: '#8B5CF6',
        settings: { wipLimit: 3 }
      },
      {
        name: 'Done',
        description: 'Completed and approved',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Comprehensive bug tracking system for software development teams. Manage bug reports, triage, and resolution workflows.',
    category: 'software-development',
    boardType: 'kanban',
    columnCount: 6,
    isPopular: true,
    isBuiltIn: true,
    isPublic: true,
    tags: ['bugs', 'issues', 'qa', 'testing', 'development'],
    usageCount: 9876,
    averageRating: 4.6,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    features: [
      'Bug lifecycle management',
      'Priority-based sorting',
      'Severity tracking',
      'Assignee management',
      'Duplicate detection'
    ],
    useCases: [
      'Software quality assurance',
      'Bug reporting and tracking',
      'Issue resolution management',
      'QA team workflows'
    ],
    columns: [
      {
        name: 'New Bugs',
        description: 'Recently reported issues',
        color: '#EF4444',
        settings: { wipLimit: null }
      },
      {
        name: 'Triaged',
        description: 'Assessed and prioritized',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'In Progress',
        description: 'Being investigated or fixed',
        color: '#F59E0B',
        settings: { wipLimit: 3 }
      },
      {
        name: 'Testing',
        description: 'Fix verification in progress',
        color: '#8B5CF6',
        settings: { wipLimit: 5 }
      },
      {
        name: 'Verified',
        description: 'Fix confirmed working',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Closed',
        description: 'Issue resolved',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and track content creation across multiple channels. Perfect for marketing teams and content creators.',
    category: 'marketing',
    boardType: 'calendar',
    columnCount: 5,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['content', 'calendar', 'marketing', 'publishing', 'social media'],
    usageCount: 6543,
    averageRating: 4.5,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
    features: [
      'Content scheduling',
      'Multi-channel management',
      'Publication tracking',
      'Content type categorization',
      'Team assignment'
    ],
    useCases: [
      'Content marketing planning',
      'Social media scheduling',
      'Blog post management',
      'Email campaign planning'
    ],
    columns: [
      {
        name: 'Ideas',
        description: 'Content concepts and topics',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Research',
        description: 'Content in research phase',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Writing',
        description: 'Content being created',
        color: '#F59E0B',
        settings: { wipLimit: 3 }
      },
      {
        name: 'Review',
        description: 'Content awaiting approval',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'Published',
        description: 'Live content',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline',
    description: 'Track leads and opportunities through your sales funnel. Monitor deal progress and forecast revenue.',
    category: 'sales',
    boardType: 'kanban',
    columnCount: 6,
    isPopular: true,
    isBuiltIn: true,
    isPublic: true,
    tags: ['sales', 'leads', 'pipeline', 'crm', 'revenue'],
    usageCount: 11234,
    averageRating: 4.7,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    features: [
      'Lead qualification tracking',
      'Deal stage management',
      'Revenue forecasting',
      'Sales activity tracking',
      'Performance metrics'
    ],
    useCases: [
      'Sales team management',
      'Lead qualification',
      'Deal pipeline tracking',
      'Revenue forecasting'
    ],
    columns: [
      {
        name: 'Leads',
        description: 'New potential customers',
        color: '#6366F1',
        settings: { wipLimit: null }
      },
      {
        name: 'Qualified',
        description: 'Qualified opportunities',
        color: '#3B82F6',
        settings: { wipLimit: null }
      },
      {
        name: 'Proposal',
        description: 'Proposal sent',
        color: '#F59E0B',
        settings: { wipLimit: null }
      },
      {
        name: 'Negotiation',
        description: 'In negotiation phase',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'Closed Won',
        description: 'Deals closed successfully',
        color: '#10B981',
        settings: { wipLimit: null }
      },
      {
        name: 'Closed Lost',
        description: 'Deals not won',
        color: '#EF4444',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'recruitment-pipeline',
    name: 'Recruitment Pipeline',
    description: 'Manage the complete hiring process from job posting to onboarding. Track candidates through each stage.',
    category: 'hr',
    boardType: 'kanban',
    columnCount: 7,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['hr', 'recruitment', 'hiring', 'candidates', 'onboarding'],
    usageCount: 4321,
    averageRating: 4.4,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-06'),
    features: [
      'Candidate tracking',
      'Interview scheduling',
      'Application screening',
      'Offer management',
      'Onboarding workflow'
    ],
    useCases: [
      'HR recruitment management',
      'Candidate tracking',
      'Interview coordination',
      'Hiring process management'
    ],
    columns: [
      {
        name: 'Job Posted',
        description: 'Open positions',
        color: '#6366F1',
        settings: { wipLimit: null }
      },
      {
        name: 'Applications',
        description: 'Received applications',
        color: '#3B82F6',
        settings: { wipLimit: null }
      },
      {
        name: 'Screening',
        description: 'Initial review phase',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Interview',
        description: 'Interview scheduled',
        color: '#F59E0B',
        settings: { wipLimit: null }
      },
      {
        name: 'Assessment',
        description: 'Skills testing',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Offer',
        description: 'Offer extended',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'Hired',
        description: 'New team members',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'personal-goals',
    name: 'Personal Goals Tracker',
    description: 'Track and achieve your personal goals. Perfect for habit building, learning objectives, and personal development.',
    category: 'personal',
    boardType: 'kanban',
    columnCount: 4,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['personal', 'goals', 'habits', 'productivity', 'self-improvement'],
    usageCount: 8765,
    averageRating: 4.6,
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-07'),
    features: [
      'Goal setting and tracking',
      'Progress visualization',
      'Milestone management',
      'Personal development tracking'
    ],
    useCases: [
      'Personal goal management',
      'Habit tracking',
      'Learning objectives',
      'Self-improvement projects'
    ],
    columns: [
      {
        name: 'Ideas',
        description: 'Goals to consider',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Planning',
        description: 'Goals being planned',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'In Progress',
        description: 'Active goals',
        color: '#F59E0B',
        settings: { wipLimit: 5 }
      },
      {
        name: 'Achieved',
        description: 'Completed goals',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'it-helpdesk',
    name: 'IT Help Desk',
    description: 'Manage IT support tickets and technical issues. Track resolution progress and ensure timely support.',
    category: 'operations',
    boardType: 'kanban',
    columnCount: 5,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['it', 'helpdesk', 'support', 'tickets', 'technical'],
    usageCount: 3456,
    averageRating: 4.3,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
    features: [
      'Ticket management',
      'Priority assignment',
      'SLA tracking',
      'Resolution time monitoring',
      'Team assignment'
    ],
    useCases: [
      'IT support management',
      'Help desk ticketing',
      'Technical issue resolution',
      'IT service management'
    ],
    columns: [
      {
        name: 'New Tickets',
        description: 'Recently reported issues',
        color: '#EF4444',
        settings: { wipLimit: null }
      },
      {
        name: 'Triaged',
        description: 'Assessed and prioritized',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'In Progress',
        description: 'Being investigated',
        color: '#F59E0B',
        settings: { wipLimit: 3 }
      },
      {
        name: 'Resolved',
        description: 'Issue fixed',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Closed',
        description: 'Ticket completed',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'product-roadmap',
    name: 'Product Roadmap',
    description: 'Plan and track product development initiatives. Align stakeholders and communicate product strategy.',
    category: 'project-management',
    boardType: 'timeline',
    columnCount: 4,
    isPopular: true,
    isBuiltIn: true,
    isPublic: true,
    tags: ['product', 'roadmap', 'planning', 'strategy', 'development'],
    usageCount: 9876,
    averageRating: 4.8,
    createdAt: new Date('2024-01-09'),
    updatedAt: new Date('2024-01-09'),
    features: [
      'Strategic planning',
      'Timeline visualization',
      'Milestone tracking',
      'Stakeholder alignment',
      'Progress reporting'
    ],
    useCases: [
      'Product strategy planning',
      'Release planning',
      'Feature roadmap management',
      'Stakeholder communication'
    ],
    columns: [
      {
        name: 'Ideation',
        description: 'Product ideas and concepts',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Backlog',
        description: 'Prioritized features',
        color: '#6366F1',
        settings: { wipLimit: null }
      },
      {
        name: 'In Development',
        description: 'Features being built',
        color: '#F59E0B',
        settings: { wipLimit: null }
      },
      {
        name: 'Released',
        description: 'Live features',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'event-planning',
    name: 'Event Planning',
    description: 'Coordinate all aspects of event planning from concept to execution. Perfect for conferences, workshops, and social events.',
    category: 'project-management',
    boardType: 'kanban',
    columnCount: 5,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['events', 'planning', 'coordination', 'logistics', 'management'],
    usageCount: 5432,
    averageRating: 4.5,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    features: [
      'Task coordination',
      'Timeline management',
      'Vendor management',
      'Budget tracking',
      'Team collaboration'
    ],
    useCases: [
      'Conference planning',
      'Workshop organization',
      'Social event management',
      'Corporate event coordination'
    ],
    columns: [
      {
        name: 'Planning',
        description: 'Event concepts and ideas',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Booking',
        description: 'Venue and vendor bookings',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Promotion',
        description: 'Marketing and outreach',
        color: '#F59E0B',
        settings: { wipLimit: null }
      },
      {
        name: 'Execution',
        description: 'Event day activities',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'Follow-up',
        description: 'Post-event activities',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Plan, execute, and track marketing campaigns across multiple channels. Monitor performance and ROI.',
    category: 'marketing',
    boardType: 'kanban',
    columnCount: 6,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['marketing', 'campaign', 'advertising', 'analytics', 'roi'],
    usageCount: 7654,
    averageRating: 4.4,
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
    features: [
      'Campaign planning',
      'Multi-channel coordination',
      'Performance tracking',
      'ROI measurement',
      'A/B testing management'
    ],
    useCases: [
      'Digital marketing campaigns',
      'Product launches',
      'Brand awareness campaigns',
      'Lead generation campaigns'
    ],
    columns: [
      {
        name: 'Strategy',
        description: 'Campaign planning',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Creative',
        description: 'Content and design',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Setup',
        description: 'Technical configuration',
        color: '#F59E0B',
        settings: { wipLimit: null }
      },
      {
        name: 'Live',
        description: 'Active campaigns',
        color: '#10B981',
        settings: { wipLimit: null }
      },
      {
        name: 'Analysis',
        description: 'Performance review',
        color: '#F97316',
        settings: { wipLimit: null }
      },
      {
        name: 'Optimization',
        description: 'Campaign improvements',
        color: '#6366F1',
        settings: { wipLimit: null }
      }
    ]
  },

  {
    id: 'customer-onboarding',
    name: 'Customer Onboarding',
    description: 'Streamline the customer onboarding process. Ensure new customers have a smooth and successful start.',
    category: 'operations',
    boardType: 'kanban',
    columnCount: 5,
    isPopular: false,
    isBuiltIn: true,
    isPublic: true,
    tags: ['onboarding', 'customers', 'success', 'support', 'experience'],
    usageCount: 4321,
    averageRating: 4.6,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    features: [
      'Onboarding workflow',
      'Progress tracking',
      'Customer satisfaction monitoring',
      'Team coordination',
      'Documentation management'
    ],
    useCases: [
      'SaaS customer onboarding',
      'Service implementation',
      'Customer success management',
      'Training coordination'
    ],
    columns: [
      {
        name: 'New Customer',
        description: 'Recently signed up',
        color: '#6366F1',
        settings: { wipLimit: null }
      },
      {
        name: 'Welcome',
        description: 'Initial setup',
        color: '#06B6D4',
        settings: { wipLimit: null }
      },
      {
        name: 'Configuration',
        description: 'System setup',
        color: '#F59E0B',
        settings: { wipLimit: null }
      },
      {
        name: 'Training',
        description: 'Customer education',
        color: '#8B5CF6',
        settings: { wipLimit: null }
      },
      {
        name: 'Active',
        description: 'Fully onboarded',
        color: '#10B981',
        settings: { wipLimit: null }
      }
    ]
  }
];