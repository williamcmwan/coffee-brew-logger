# CoffeeBrew Health Check Lambda

AWS Lambda function that monitors the CoffeeBrew application health at regular intervals.

## Deployment

### 1. Create the Lambda Function

```bash
# Zip the function
cd lambda/health-check
zip -r health-check.zip index.mjs

# Create Lambda function via AWS CLI
aws lambda create-function \
  --function-name coffeebrew-health-check \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://health-check.zip \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-basic-execution \
  --timeout 15 \
  --memory-size 128 \
  --environment "Variables={HEALTH_CHECK_URL=https://coffeebrew.dpdns.org/api/health}"
```

### 2. Create EventBridge Rule (5-minute interval)

```bash
# Create the rule
aws events put-rule \
  --name coffeebrew-health-check-schedule \
  --schedule-expression "rate(5 minutes)" \
  --state ENABLED

# Add Lambda as target
aws events put-targets \
  --rule coffeebrew-health-check-schedule \
  --targets "Id"="1","Arn"="arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT_ID:function:coffeebrew-health-check"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
  --function-name coffeebrew-health-check \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:YOUR_REGION:YOUR_ACCOUNT_ID:rule/coffeebrew-health-check-schedule
```

### 3. (Optional) Set up SNS Notifications

```bash
# Create SNS topic
aws sns create-topic --name coffeebrew-health-alerts

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:YOUR_REGION:YOUR_ACCOUNT_ID:coffeebrew-health-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name coffeebrew-health-check \
  --environment "Variables={HEALTH_CHECK_URL=https://coffeebrew.dpdns.org/api/health,SNS_TOPIC_ARN=arn:aws:sns:YOUR_REGION:YOUR_ACCOUNT_ID:coffeebrew-health-alerts}"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HEALTH_CHECK_URL` | No | Health endpoint URL (default: https://coffeebrew.dpdns.org/api/health) |
| `SNS_TOPIC_ARN` | No | SNS topic ARN for failure notifications |
| `SLACK_WEBHOOK_URL` | No | Slack webhook URL for notifications |

## IAM Role Permissions

The Lambda execution role needs:
- `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)
- `sns:Publish` (if using SNS notifications)

## Testing

Test locally or invoke manually:

```bash
aws lambda invoke \
  --function-name coffeebrew-health-check \
  --payload '{}' \
  response.json

cat response.json
```
