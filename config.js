// GitHub Dashboard Configuration
// GitHub token will be loaded dynamically from AWS Secrets Manager
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

// Your GitHub username
const GITHUB_USERNAME = 'aws-crypto-tools-ci-bot';

// API Configuration
const GITHUB_API_BASE = 'https://api.github.com';

// Cache configuration (in milliseconds)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// AWS Secrets Manager configuration
const AWS_CONFIG = {
    secretName: 'github-token', // Your secret name in AWS Secrets Manager
    region: 'us-east-1', // Your AWS region
    lambdaApiUrl: 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/github-token' // Lambda API Gateway URL
};

// Function to load GitHub token from AWS Secrets Manager via Lambda
async function loadGitHubToken() {
    try {
        console.log('Fetching GitHub token from Lambda API...');
        
        const response = await fetch(AWS_CONFIG.lambdaApiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Lambda API error: ${response.status} - ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.token) {
            throw new Error('No token received from Lambda function');
        }
        
        GITHUB_TOKEN = data.token;
        
        // Update the global config
        window.GitHubConfig.token = GITHUB_TOKEN;
        
        console.log(`GitHub token loaded successfully from AWS Secrets Manager (${data.source})`);
        return GITHUB_TOKEN;
        
    } catch (error) {
        console.error('Error loading GitHub token:', error);
        throw new Error(`Failed to load GitHub token: ${error.message}`);
    }
}

// Export configuration for use in dashboard.js
window.GitHubConfig = {
    token: GITHUB_TOKEN,
    repositories: REPOSITORIES,
    username: GITHUB_USERNAME,
    apiBase: GITHUB_API_BASE,
    cacheDuration: CACHE_DURATION,
    aws: AWS_CONFIG,
    loadToken: loadGitHubToken
};
