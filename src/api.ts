import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = "TradeLedger";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers":
    "Content-Type,Cache-Control,Pragma,Accept,Expires,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-email,user-email",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const handler = async (event) => {
  console.log("EVENT DUMP:", JSON.stringify(event, null, 2));
  const httpMethod = event.httpMethod;

  // Robust extraction of userEmail from anywhere
  let userEmail =
    (event.queryStringParameters && event.queryStringParameters.userEmail) ||
    (event.headers &&
      (event.headers["x-user-email"] ||
        event.headers["X-User-Email"] ||
        event.headers["user-email"] ||
        event.headers["User-Email"])) ||
    (event.body &&
      (() => {
        try {
          return JSON.parse(event.body).userEmail;
        } catch {
          return undefined;
        }
      })());

  // Robust extraction of tradeId from both path and query
  const tradeId =
    (event.pathParameters &&
      (event.pathParameters.id || event.pathParameters.tradeId)) ||
    (event.queryStringParameters &&
      (event.queryStringParameters.id || event.queryStringParameters.tradeId));

  // Handle CORS preflight
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // Require userEmail for all except GET
  if (httpMethod !== "GET" && !userEmail) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "User email is required" }),
    };
  }

  try {
    if (httpMethod === "GET") {
      // Fetch all trades for a user
      const email =
        (event.queryStringParameters &&
          event.queryStringParameters.userEmail) ||
        userEmail;
      if (!email) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "User email is required" }),
        };
      }
      console.log("Fetching trades for userEmail:", email);
      const params = {
        TableName: tableName,
        FilterExpression: "userEmail = :userEmail",
        ExpressionAttributeValues: {
          ":userEmail": email,
        },
      };
      const command = new ScanCommand(params);
      const result = await docClient.send(command);
      console.log("Fetched trades:", JSON.stringify(result.Items, null, 2));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ items: result.Items || [] }),
      };
    } else if (httpMethod === "POST") {
      // Create a new trade
      const trade = JSON.parse(event.body);
      trade.id = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      // Always set userEmail from robust extraction if not present or mismatched
      if (!trade.userEmail || trade.userEmail !== userEmail) {
        trade.userEmail = userEmail;
      }
      console.log("Saving trade:", JSON.stringify(trade, null, 2));
      const params = {
        TableName: tableName,
        Item: trade,
      };
      const command = new PutCommand(params);
      await docClient.send(command);
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify(trade),
      };
    } else if (httpMethod === "PUT") {
      // Update a trade
      if (!tradeId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Trade ID is required" }),
        };
      }
      const trade = JSON.parse(event.body);
      const getParams = {
        TableName: tableName,
        Key: { id: tradeId },
      };
      const existingTrade = await docClient.send(new GetCommand(getParams));
      if (!existingTrade.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Trade not found" }),
        };
      }
      if (existingTrade.Item.userEmail !== userEmail) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }
      // Update all fields sent in the request
      const updateParams = {
        TableName: tableName,
        Key: { id: tradeId },
        UpdateExpression:
          "SET #status = :status, exitDate = :exitDate, exitPremium = :exitPremium, pnl = :pnl, notes = :notes",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": trade.status,
          ":exitDate": trade.exitDate,
          ":exitPremium": trade.exitPremium,
          ":pnl": trade.pnl,
          ":notes": trade.notes,
        },
        ReturnValues: "ALL_NEW",
      };
      const command = new UpdateCommand(updateParams);
      const result = await docClient.send(command);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result.Attributes),
      };
    } else if (httpMethod === "DELETE") {
      // Delete a trade
      if (!tradeId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Trade ID is required" }),
        };
      }
      const getParams = {
        TableName: tableName,
        Key: { id: tradeId },
      };
      const existingTrade = await docClient.send(new GetCommand(getParams));
      if (!existingTrade.Item || existingTrade.Item.userEmail !== userEmail) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Trade not found" }),
        };
      }
      const params = {
        TableName: tableName,
        Key: { id: tradeId },
      };
      const command = new DeleteCommand(params);
      await docClient.send(command);
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: "",
      };
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Unsupported method "${httpMethod}"` }),
      };
    }
  } catch (error) {
    console.error("Lambda function error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
