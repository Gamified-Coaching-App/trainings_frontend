import AWS from 'aws-sdk';
import { handler } from '../index.mjs';
import jwt from 'jsonwebtoken';

// Resetting modules to ensure a clean mock state
beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});


jest.mock('aws-sdk', () => {
    const queryMock = jest.fn();

    return {
        config: {
            update: jest.fn(),
        },
        DynamoDB: {
            DocumentClient: jest.fn(() => ({
                query: jest.fn(() => ({ promise: queryMock }))
            })),
        },
        queryMock
    };
});


jest.mock('jsonwebtoken', () => ({
    decode: jest.fn(),
}));


describe('handler function', () => {
    it('should return 400 if no headers are provided in the request', async () => {
        const mockEvent = {};

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual(JSON.stringify({ error: "No headers provided in the request." }));
    });

    it('should retrieve items from DynamoDB and return them', async () => {
        const mockEvent = {
            headers: {
                Authorization: 'Bearer mockToken',
            },
        };

        const mockDecodedToken = {
            sub: 'mockUserId',
        };

        jwt.decode.mockReturnValueOnce(mockDecodedToken);

        const mockData = {
            Items: [{ mockItem1: 'value1' }, { mockItem2: 'value2' }],
        };

        AWS.queryMock.mockResolvedValueOnce(mockData);

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual(JSON.stringify(mockData.Items));
        expect(result.headers).toEqual(expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'mockToken',
            'Access-Control-Allow-Origin': '*',
        }));
    });

    it('should return 500 if an error occurs during the operation', async () => {
        const mockEvent = {
            headers: {
                Authorization: 'Bearer mockToken',
            },
        };

        const mockError = new Error('Mock error');
        AWS.queryMock.mockRejectedValueOnce(mockError);

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(500);
    });
});
