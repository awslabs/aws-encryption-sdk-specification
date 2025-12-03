// GitHub Dashboard Configuration
// GitHub token will be managed through session storage
let GITHUB_TOKEN = null;

// Repository configuration - easily extensible
const REPOSITORIES = [
    {
        id: 'aws-encryption-sdk-specification',
        owner: 'awslabs',
        name: 'aws-encryption-sdk-specification',
        displayName: 'AWS Encryption SDK Specification',
        
    },
    {
        id: 'aws-cryptographic-material-providers-library',
        owner: 'aws',
        name: 'aws-cryptographic-material-providers-library',
        displayName: 'AWS Material Providers Library',
        workflows: [
            'Daily CI',
            'Dafny Nightly'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'amazon-s3-encryption-client-go',
        owner: 'aws',
        name: 'amazon-s3-encryption-client-go',
        displayName: 'Amazon S3 Encryption Client for Go',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'amazon-s3-encryption-client-java',
        owner: 'aws',
        name: 'amazon-s3-encryption-client-java',
        displayName: 'Amazon S3 Encryption Client for Java',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'ci-workflow'
        ]
    },
    {
        id: 'aws-encryption-sdk',
        owner: 'aws',
        name: 'aws-encryption-sdk',
        displayName: 'AWS Encryption SDK for .NET/Rust/Go',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'aws-database-encryption-sdk-dynamodb',
        owner: 'aws',
        name: 'aws-database-encryption-sdk-dynamodb',
        displayName: 'AWS Database Encryption SDK for DynamoDB Java/.NET/Rust',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'aws-encryption-sdk-java',
        owner: 'aws',
        name: 'aws-encryption-sdk-java',
        displayName: 'AWS Encryption SDK for Java',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'ci'
        ]
    },
    {
        id: 'aws-encryption-sdk-javascript',
        owner: 'aws',
        name: 'aws-encryption-sdk-javascript',
        displayName: 'AWS Encryption SDK for JavaScript',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'aws-encryption-sdk-python',
        owner: 'aws',
        name: 'aws-encryption-sdk-python',
        displayName: 'AWS Encryption SDK for Python',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'aws-encryption-sdk-cli',
        owner: 'aws',
        name: 'aws-encryption-sdk-cli',
        displayName: 'AWS Encryption SDK for CLI',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'aws-encryption-sdk-c',
        owner: 'aws',
        name: 'aws-encryption-sdk-c',
        displayName: 'AWS Encryption SDK for C',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'daily_ci'
        ]
    },
    {
        id: 'aws-dynamodb-encryption-java',
        owner: 'aws',
        name: 'aws-dynamodb-encryption-java',
        displayName: 'DynamoDB Encryption Client for Java',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'run-codebuild-ci'
        ]
    },
    {
        id: 'aws-dynamodb-encryption-python',
        owner: 'aws',
        name: 'aws-dynamodb-encryption-python',
        displayName: 'DynamoDB Encryption Client for Python',
        workflows: [
            'Daily CI'
        ],
        badgeWorkflows: [
            'ci_integration'
        ]
    }
];

const CRYPTO_TOOLS_USERNAMES = [
    "seebees",
    "texastony", 
    "ShubhamChaturvedi7",
    "mahnushm",
    "lucasmcdonald3",
    "robin-aws",
    "josecorella",
    "imabhichow",
    "rishav-karanjit",
    "antonf-amzn",
    "kessplas",
    "ajewellamz"
];

// Your GitHub username
const GITHUB_USERNAME = 'aws-crypto-tools-ci-bot';

// API Configuration
const GITHUB_API_BASE = 'https://api.github.com';

// Cache configuration (in milliseconds)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Session storage key for GitHub token
const SESSION_TOKEN_KEY = 'github-dashboard-session-token';

// Session storage helper functions
function getSessionToken() {
    try {
        return sessionStorage.getItem(SESSION_TOKEN_KEY);
    } catch (error) {
        console.warn('Error accessing session storage:', error);
        return null;
    }
}

function setSessionToken(token) {
    try {
        if (token && token.trim()) {
            sessionStorage.setItem(SESSION_TOKEN_KEY, token.trim());
            GITHUB_TOKEN = token.trim();
            window.GitHubConfig.token = GITHUB_TOKEN;
            return true;
        }
        return false;
    } catch (error) {
        console.warn('Error setting session storage:', error);
        return false;
    }
}

function clearSessionToken() {
    try {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        GITHUB_TOKEN = null;
        window.GitHubConfig.token = null;
        return true;
    } catch (error) {
        console.warn('Error clearing session storage:', error);
        return false;
    }
}

// Load token from session storage on page load
function loadSessionToken() {
    const token = getSessionToken();
    if (token) {
        GITHUB_TOKEN = token;
        window.GitHubConfig.token = token;
        console.log('GitHub token loaded from session storage');
        return token;
    }
    return null;
}

// Export configuration for use in dashboard.js
window.GitHubConfig = {
    token: GITHUB_TOKEN,
    repositories: REPOSITORIES,
    username: GITHUB_USERNAME,
    apiBase: GITHUB_API_BASE,
    cacheDuration: CACHE_DURATION,
    getSessionToken: getSessionToken,
    setSessionToken: setSessionToken,
    clearSessionToken: clearSessionToken,
    loadSessionToken: loadSessionToken
};
