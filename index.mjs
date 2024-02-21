import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';

AWS.config.update({ region: 'eu-west-2' });
const dynamo_db_client = DynamoDBDocumentClient.from(new DynamoDB({ region }));
const ddb = new AWS.DynamoDB.DocumentClient();

// Handler function
export const handler = async (event) => {
    try {
      // Retrieve the JWT token from the Authorization header and decode
      const token = event.headers.Authorization || event.headers.authorization;;
      const decoded = jwt.decode(token);
      const user_id = decoded.sub;
      console.log("Decoded JWT user ID:", user_id);
  
      // Construct the DynamoDB parameters
      const params = {
        TableName: 'trainings_log',
        FilterExpression: 'user_id = :user_id',
        ExpressionAttributeValues: { ':user_id': user_id }
      };
  
      // Perform a scan operation to retrieve the items from the table
      const data = await ddb.scan(params).promise();
  
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