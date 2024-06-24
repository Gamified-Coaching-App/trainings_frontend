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
                headers: {
                    "Access-Control-Allow-Origin": "*", // Allow all origins
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // Allow specific methods
                    "Access-Control-Allow-Headers": "Content-Type,Authorization" // Allow specific headers
                },
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

        const body = JSON.parse(event.body);
        const { startDate, endDate } = body;
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);

        // Convert startDate and endDate to the specified format: YYYY-MM-DD-HH:MM:SS
        let startDateFormatted = new Date(startDate).toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
        let endDateFormatted = new Date(endDate).toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
        
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
            'heart_rate, ' +
            'perceived_exertion, ' +
            'perceived_recovery, ' +
            'perceived_training_success';
            
        const params = {
            TableName: 'trainings_log',
            IndexName: 'user_id-timestamp_local-index', // Use the secondary index
            KeyConditionExpression: 'user_id = :user_id AND timestamp_local BETWEEN :start_date AND :end_date',
            ExpressionAttributeValues: {
                ':user_id': user_id,
                ':start_date': startDateFormatted, // Use the formatted start date
                ':end_date': endDateFormatted // Use the formatted end date
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
                "Access-Control-Allow-Origin": "*", // Allow all origins
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // Allow specific methods
                "Access-Control-Allow-Headers": "Content-Type,Authorization" // Allow specific headers
            },
            body: JSON.stringify(data.Items)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers: {
                "Access-Control-Allow-Origin": "*", // Allow all origins
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // Allow specific methods
                "Access-Control-Allow-Headers": "Content-Type,Authorization" // Allow specific headers
            },
            body: JSON.stringify({
                message: error.message || 'An error occurred during the operation.'
            })
        };
    }
};
