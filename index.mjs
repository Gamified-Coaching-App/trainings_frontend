import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';

const region = 'eu-west-2'
AWS.config.update({ region: region });
const dynamoDB = new AWS.DynamoDB({ region });
const dynamoDbClient = new AWS.DynamoDB.DocumentClient({ service: dynamoDB });

// Handler function
export const handler = async (event) => {
    try {
        // Retrieve the JWT token from the Authorization header and decode
        const token = event.headers.Authorization.split(' ')[1];
        const decoded = jwt.decode(token);
        const user_id = decoded.sub;
        console.log("Decoded JWT user ID:", user_id);

        // Get seconds since last monday
        const now = new Date();
        let dayOfWeek = now.getDay(); // 0 = Sunday; 1 = Monday etc.
        let daysSinceLastMonday = (dayOfWeek + 6) % 7
        let mondayDate = new Date(now.getTime() - daysSinceLastMonday * 24 * 60 * 60 * 1000)
        mondayDate.setHours(0, 0, 0, 0); // Set time to 00:00:00
        let mondayTime = Math.floor(mondayDate.getTime() / 1000) // Convert back to seconds
    
        // Construct the DynamoDB parameters
        const params = {
            TableName: 'trainings_log',
            KeyConditionExpression: 'user_id = :user_id and timestamp_local >= :monday_time',
            ExpressionAttributeValues: { ':user_id': user_id, ':monday_time': mondayTime }
        };
    
        // Perform a scan operation to retrieve the items from the table
        const data = await dynamoDbClient.query(params).promise();
    
        // Return the retrieved items
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
            headers: {
            'Content-Type': 'application/json',
            'Authorization': token
            }
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({
            message: error.message || 'An error occurred during the operation.'
            })
        };
    }
};