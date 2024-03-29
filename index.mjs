import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';

const region = 'eu-west-2';
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

        // Get the time for the most recent Monday at 00:00:00
        const now = new Date();
        let dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        let daysSinceLastMonday = (dayOfWeek + 6) % 7;
        let mondayDate = new Date(now.getTime() - daysSinceLastMonday * 24 * 60 * 60 * 1000);
        mondayDate.setHours(0, 0, 0, 0); // Set time to 00:00:00

        // Convert to the specified format: YYYY-MM-DD-HH:MM:SS
        let mondayTimeFormatted = mondayDate.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');

        // Construct the DynamoDB parameters
        let returned_items = 'session_id, ' +
            'active_calories, ' +
            'activity_type, ' +
            'average_heart_rate_in_bpm, ' +
            'average_pace_min_per_km, ' +
            'average_speed_km_h, ' +
            'distance_meters_total, ' +
            '#duration, ' + 
            'elevation_gain_meters_total, ' +
            'max_heart_rate_in_bpm, ' +
            'max_pace_min_per_km, ' +
            'max_speed_km_h, ' +
            'points_gained, ' +
            'timestamp_local, ' +
            'heart_rate';

        const params = {
            TableName: 'trainings_log',
            IndexName: 'user_id-timestamp_local-index', // Use the secondary index
            KeyConditionExpression: 'user_id = :user_id AND timestamp_local >= :monday_time',
            ExpressionAttributeValues: {
                ':user_id': user_id,
                ':monday_time': mondayTimeFormatted // Use the formatted time
            },
            ProjectionExpression: returned_items,
            ExpressionAttributeNames: {
                '#duration': 'duration'
            }
        };
        console.log(params);

        // Perform a query operation to retrieve the items from the table
        const data = await dynamoDbClient.query(params).promise();

        // Return the retrieved items
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
                "Access-Control-Allow-Origin": "*"
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
