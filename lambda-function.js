// AWS Lambda function to retrieve GitHub token from Secrets Manager
// This creates a serverless API endpoint for your static GitHub Pages site

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Initialize AWS Secrets Manager client
const secretsManager = new SecretsManagerClient({ 
    region: process.env.AWS_REGION || 'us-east-1'
});

// Configuration
const SECRET_NAME = process.env.GITHUB_TOKEN_SECRET_NAME || 'github-token';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache (for this Lambda execution context)
let tokenCache = {
    token: null,
    expiry: null
};

// Function to retrieve GitHub token from AWS Secrets Manager
async function getGitHubTokenFromSecrets() {
    try {
        console.log(`Fetching secret: ${SECRET_NAME}`);
        
        const command = new GetSecretValueCommand({
            SecretId: SECRET_NAME
        });

        const response = await secretsManager.send(command);
        
        if (response.SecretString) {
            // Parse the secret value
            let secret;
            try {
                secret = JSON.parse(response.SecretString);
            } catch (e) {
                // If it's not JSON, treat as plain text
                secret = { token: response.SecretString };
            }
            
            // Return the token (handle different secret formats)
            return secret.token || secret.github_token || secret.GITHUB_TOKEN || response.SecretString;
        } else if (response.SecretBinary) {
            // Handle binary secrets if needed
            const buff = Buffer.from(response.SecretBinary, 'base64');
            return buff.toString('ascii');
        } else {
            throw new Error('No secret value found');
        }
    } catch (error) {
        console.error('Error retrieving secret:', error);
        throw error;
    }
}

// Lambda handler function
exports.handler = async (event) => {
    // CORS headers for browser requests
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // You may want to restrict this to your domain
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    try {
        // Handle preflight OPTIONS request
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'OK' })
            };
        }

        // Only allow GET requests
        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Method not allowed',
                    message: 'Only GET requests are supported'
                })
            };
        }

        // Check cache first
        if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
            console.log('Returning cached GitHub token');
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
                },
                body: JSON.stringify({ 
                    token: tokenCache.token,
                    source: 'cache',
                    timestamp: new Date().toISOString()
                })
            };
        }

        console.log('Fetching fresh GitHub token from AWS Secrets Manager');
        
        // Fetch token from AWS Secrets Manager
        const token = await getGitHubTokenFromSecrets();
        
        if (!token) {
            throw new Error('No token received from AWS Secrets Manager');
        }

        // Update cache
        tokenCache = {
            token: token,
            expiry: Date.now() + CACHE_DURATION
        };

        console.log('GitHub token retrieved successfully');
        
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify({ 
                token: token,
                source: 'aws-secrets-manager',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error in Lambda function:', error);
        
        return {
            statusCode: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to retrieve GitHub token',
                message: error.message,
                code: error.name || 'UNKNOWN_ERROR',
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Health check endpoint (optional)
exports.healthCheck = async (event) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            region: process.env.AWS_REGION || 'us-east-1',
            secretName: SECRET_NAME
        })
    };
};
