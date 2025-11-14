# GitHub Dashboard with AWS Secrets Manager Integration

This GitHub dashboard dynamically loads your GitHub Personal Access Token from AWS Secrets Manager, making it secure for deployment on GitHub Pages.

## Architecture

- **Frontend**: Static files (HTML, CSS, JavaScript) hosted on GitHub Pages
- **Backend**: AWS Lambda function that securely retrieves tokens from AWS Secrets Manager
- **API**: AWS API Gateway provides HTTPS endpoint for the Lambda function

## Setup Instructions

### 1. Store GitHub Token in AWS Secrets Manager

First, create a secret in AWS Secrets Manager to store your GitHub token:

```bash
# Using AWS CLI
aws secretsmanager create-secret \
    --name "github-token" \
    --description "GitHub Personal Access Token for Dashboard" \
    --secret-string "ghp_your_actual_github_token_here" \
    --region us-east-1
```

**Alternative formats for the secret value:**
- **Plain text**: `ghp_your_actual_github_token_here`
- **JSON format**: `{"token": "ghp_your_actual_github_token_here"}`
- **JSON with different key**: `{"github_token": "ghp_your_actual_github_token_here"}`

### 2. Create IAM Role for Lambda

Create an IAM role for your Lambda function with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:github-token-*"
        }
    ]
}
```

### 3. Deploy Lambda Function

#### Option A: Using AWS Console

1. Go to AWS Lambda Console
2. Create a new function
3. Choose "Author from scratch"
4. Set runtime to Node.js 18.x or later
5. Use the IAM role created above
6. Copy the code from `lambda-function.js`
7. Set environment variables:
   - `GITHUB_TOKEN_SECRET_NAME`: `github-token`
   - `AWS_REGION`: `us-east-1` (or your preferred region)

#### Option B: Using AWS CLI

```bash
# Package the Lambda function
zip lambda-deployment.zip lambda-function.js

# Create the function
aws lambda create-function \
    --function-name github-token-retriever \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-secrets-role \
    --handler lambda-function.handler \
    --zip-file fileb://lambda-deployment.zip \
    --environment Variables='{GITHUB_TOKEN_SECRET_NAME=github-token,AWS_REGION=us-east-1}' \
    --region us-east-1
```

#### Option C: Using SAM (Recommended)

Create `template.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  SecretName:
    Type: String
    Default: github-token
    Description: Name of the secret in Secrets Manager

Resources:
  GitHubTokenFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: lambda-function.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          GITHUB_TOKEN_SECRET_NAME: !Ref SecretName
          AWS_REGION: !Ref AWS::Region
      Policies:
        - Statement:
          - Effect: Allow
            Action:
              - secretsmanager:GetSecretValue
            Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${SecretName}-*'
      Events:
        Api:
          Type: Api
          Properties:
            Path: /github-token
            Method: get
            Cors:
              AllowMethods: "'GET,OPTIONS'"
              AllowHeaders: "'Content-Type'"
              AllowOrigin: "'*'"

Outputs:
  ApiEndpoint:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/github-token"
```

Deploy with:
```bash
sam build
sam deploy --guided
```

### 4. Create API Gateway (if not using SAM)

1. Go to API Gateway Console
2. Create a new REST API
3. Create a resource `/github-token`
4. Add a GET method
5. Set integration type to Lambda Function
6. Connect to your Lambda function
7. Enable CORS:
   - Access-Control-Allow-Origin: `*` (or your domain)
   - Access-Control-Allow-Headers: `Content-Type`
   - Access-Control-Allow-Methods: `GET,OPTIONS`
8. Deploy the API

### 5. Update Configuration

Update the `AWS_CONFIG` in `config.js`:

```javascript
const AWS_CONFIG = {
    secretName: 'github-token', // Your secret name
    region: 'us-east-1', // Your AWS region
    lambdaApiUrl: 'https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod/github-token'
};
```

### 6. Deploy to GitHub Pages

1. Push all files to your GitHub repository
2. Go to repository Settings → Pages
3. Set source to your main branch
4. Your dashboard will be available at `https://username.github.io/repository-name`

## Environment Variables

For Lambda function:

- `GITHUB_TOKEN_SECRET_NAME`: Name of the secret in AWS Secrets Manager (default: `github-token`)
- `AWS_REGION`: AWS region where your secret is stored (default: `us-east-1`)

## Security Considerations

1. **CORS**: Consider restricting CORS to your specific domain instead of using `*`
2. **API Gateway**: Add authentication/authorization if needed
3. **Rate Limiting**: Consider adding rate limiting to your API
4. **Token Rotation**: AWS Secrets Manager supports automatic token rotation

## Troubleshooting

### Common Issues

1. **CORS Error**: Make sure CORS is properly configured on API Gateway
2. **Permission Denied**: Check that Lambda has proper IAM permissions for Secrets Manager
3. **Secret Not Found**: Verify the secret name and region
4. **Token Invalid**: Check that your GitHub token has the required scopes

### Testing the Lambda Function

Test your API endpoint directly:

```bash
curl https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod/github-token
```

Expected response:
```json
{
  "token": "ghp_...",
  "source": "aws-secrets-manager",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Cost Considerations

- **Lambda**: Free tier includes 1M requests/month
- **API Gateway**: Free tier includes 1M API calls/month  
- **Secrets Manager**: ~$0.40/month per secret + $0.05 per 10,000 requests
- **GitHub Pages**: Free for public repositories

## Files Structure

```
├── index.html              # Main dashboard page
├── config.js              # Configuration with AWS integration
├── dashboard.js           # Dashboard functionality
├── styles.css             # Styling
├── lambda-function.js     # AWS Lambda function code
├── template.yaml          # SAM template (optional)
└── README.md             # This documentation
