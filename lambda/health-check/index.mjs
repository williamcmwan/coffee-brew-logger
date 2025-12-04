/**
 * AWS Lambda Health Check Function
 * 
 * Monitors the CoffeeBrew application health every 5 minutes.
 * Configure with CloudWatch Events/EventBridge rule: rate(5 minutes)
 * 
 * Environment Variables:
 * - HEALTH_CHECK_URL: The health endpoint URL (default: https://coffeebrew.dpdns.org/api/health)
 * - SNS_TOPIC_ARN: (Optional) SNS topic ARN for failure notifications
 * - SLACK_WEBHOOK_URL: (Optional) Slack webhook for notifications
 */

const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || 'https://coffeebrew.dpdns.org/api/health';
const TIMEOUT_MS = 10000; // 10 second timeout

export const handler = async (event) => {
  console.log('Starting health check for:', HEALTH_CHECK_URL);
  
  const startTime = Date.now();
  let response;
  let responseData;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    response = await fetch(HEALTH_CHECK_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AWS-Lambda-HealthCheck/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    responseData = await response.json();
    
    const result = {
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      url: HEALTH_CHECK_URL,
      healthy: response.status === 200 && responseData.status === 'healthy',
      details: responseData
    };
    
    console.log('Health check result:', JSON.stringify(result, null, 2));
    
    if (!result.healthy) {
      await sendAlert(result);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Application unhealthy',
          ...result
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Application healthy',
        ...result
      })
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    const errorResult = {
      statusCode: 500,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      url: HEALTH_CHECK_URL,
      healthy: false,
      error: error.name === 'AbortError' ? 'Request timeout' : error.message
    };
    
    console.error('Health check failed:', JSON.stringify(errorResult, null, 2));
    
    await sendAlert(errorResult);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Health check failed',
        ...errorResult
      })
    };
  }
};

async function sendAlert(result) {
  const message = `🚨 CoffeeBrew Health Check Alert\n\nStatus: ${result.healthy ? 'Healthy' : 'UNHEALTHY'}\nURL: ${result.url}\nTime: ${result.timestamp}\nResponse Time: ${result.responseTime}\n${result.error ? `Error: ${result.error}` : ''}\n${result.details ? `Details: ${JSON.stringify(result.details)}` : ''}`;
  
  // Send to SNS if configured
  if (process.env.SNS_TOPIC_ARN) {
    try {
      const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
      const sns = new SNSClient({});
      
      await sns.send(new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: `CoffeeBrew Health Alert - ${result.healthy ? 'Recovered' : 'DOWN'}`,
        Message: message
      }));
      
      console.log('SNS alert sent');
    } catch (err) {
      console.error('Failed to send SNS alert:', err.message);
    }
  }
  
  // Send to Slack if configured
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: 'CoffeeBrew Health Monitor'
        })
      });
      
      console.log('Slack alert sent');
    } catch (err) {
      console.error('Failed to send Slack alert:', err.message);
    }
  }
}
