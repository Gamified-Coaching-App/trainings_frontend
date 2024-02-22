import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';

const region = 'eu-west-2'
AWS.config.update({ region: region });
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

// Handler function
export const handler = async (event) => {
    try {
        // Check for headers in the event
        if (!event.headers) {
            console.error("No headers found in the event.");
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "No headers provided in the request." })
            };
        }
        console.log("Header present in the event.");

        // Retrieve the JWT token from the Authorization header and decode
        const token = event.headers.Authorization.split(' ')[1];
        console.log(token);
        const decoded = jwt.decode(token);
        const user_id = decoded.sub;
        console.log("Decoded JWT user ID:", user_id);

        // Get seconds since last monday
        const now = new Date();
        let dayOfWeek = now.getDay(); // 0 = Sunday; 1 = Monday etc.
        let daysSinceLastMonday = (dayOfWeek + 6) % 7
        let mondayDate = new Date(now.getTime() - daysSinceLastMonday * 24 * 60 * 60 * 1000)
        mondayDate.setHours(0, 0, 0, 0); // Set time to 00:00:00
        let mondayTime = Math.floor(mondayDate.getTime() / 1000); // Convert back to seconds
    
        // Construct the DynamoDB parameters
        let returned_items = 'timestamp_local, ' +
            'active_calories, ' +
            'activity_type, ' +
            'average_heart_rate_in_bpm, ' +
            'average_pace_min_per_km, ' +
            'average_speed_km_h, ' +
            'distance_meters_total, ' +
            'elevation_gain_meters_total, ' + 
            'max_heart_rate_in_bpm, ' + 
            'max_pace_min_per_km, ' + 
            'max_speed_km_h, ' + 
            'points_gained, ' + 
            'session_id';

        const params = {
            TableName: 'trainings_log',
            KeyConditionExpression: 'user_id = :user_id AND timestamp_local >= :monday_time',
            ExpressionAttributeValues: { 
                ':user_id': user_id,
                ':monday_time': mondayTime
            },
            ProjectionExpression: returned_items
        };
        console.log(params)
    
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