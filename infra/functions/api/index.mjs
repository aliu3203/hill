import { randomUUID } from "node:crypto";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.AWS_REGION;
const tableName = process.env.EVENTS_TABLE;
const bucketName = process.env.FLYERS_BUCKET;
const alertsTopicArn = process.env.ALERTS_TOPIC_ARN;
const modelId = process.env.BEDROCK_MODEL_ID;

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({ region, maxAttempts: 5 });
const sns = new SNSClient({ region, maxAttempts: 5 });
const bedrock = new BedrockRuntimeClient({ region, maxAttempts: 5 });

const isoNow = () => new Date().toISOString();
const encodeToken = (value) => value ? Buffer.from(JSON.stringify(value)).toString("base64url") : null;
const decodeToken = (value) => value ? JSON.parse(Buffer.from(value, "base64url").toString("utf8")) : undefined;

function publicEvent(item) {
  if (!item) return null;
  const { PK, SK, GSI1PK, GSI1SK, entityType, ...event } = item;
  return event;
}

async function listEvents({ category, limit = 25, nextToken }) {
  const key = category ? `CATEGORY#${category.toLowerCase()}` : "EVENTS";
  const output = await dynamo.send(new QueryCommand({
    TableName: tableName,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :key",
    ExpressionAttributeValues: { ":key": key },
    ScanIndexForward: true,
    Limit: Math.min(Math.max(limit, 1), 50),
    ExclusiveStartKey: decodeToken(nextToken),
  }));
  return { items: (output.Items ?? []).map(publicEvent), nextToken: encodeToken(output.LastEvaluatedKey) };
}

async function getEvent({ id }) {
  const output = await dynamo.send(new GetCommand({ TableName: tableName, Key: { PK: `EVENT#${id}`, SK: "EVENT" } }));
  return publicEvent(output.Item);
}

async function createHangout({ input }) {
  const id = randomUUID();
  const createdAt = isoNow();
  const item = {
    PK: `EVENT#${id}`,
    SK: "EVENT",
    GSI1PK: "EVENTS",
    GSI1SK: input.startsAt ?? createdAt,
    entityType: "EVENT",
    id,
    title: input.title,
    time: input.time,
    clock: input.clock,
    startsAt: input.startsAt,
    location: input.location,
    distance: "Nearby",
    category: input.category.toLowerCase(),
    description: input.description || "A spontaneous Hill hangout.",
    people: 1,
    source: "hangout",
    createdAt,
  };
  await dynamo.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: "attribute_not_exists(PK)" }));
  await sns.send(new PublishCommand({ TopicArn: alertsTopicArn, Subject: "New Hill hangout", Message: JSON.stringify(publicEvent(item)) }));
  return publicEvent(item);
}

async function createFlyerUpload({ fileName, contentType }) {
  if (!/^image\/(jpeg|png|webp|heic)$/i.test(contentType)) throw new Error("Only JPEG, PNG, WebP, or HEIC images are supported.");
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  const objectKey = `incoming/${randomUUID()}-${safeName}`;
  const command = new PutObjectCommand({ Bucket: bucketName, Key: objectKey, ContentType: contentType, Metadata: { source: "hill-web" } });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { uploadUrl, objectKey, expiresIn: 300 };
}

async function updatePreferences({ input }) {
  const updatedAt = isoNow();
  const item = { PK: `USER#${input.userId}`, SK: "PREFERENCES", entityType: "PREFERENCES", ...input, updatedAt };
  await dynamo.send(new PutCommand({ TableName: tableName, Item: item }));
  return { userId: item.userId, interests: item.interests, alertsEnabled: item.alertsEnabled, updatedAt };
}

async function askHill({ message }) {
  const { items } = await listEvents({ limit: 12 });
  const eventContext = items.map(({ id, title, clock, location, category, description }) => ({ id, title, clock, location, category, description }));
  const prompt = `You are Hill, a concise UCLA campus-events concierge. Use only the supplied events. Answer in two short sentences and recommend at most two event IDs.\n\nEvents: ${JSON.stringify(eventContext)}\n\nStudent: ${message}`;
  const response = await bedrock.send(new ConverseCommand({
    modelId,
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 240, temperature: 0.3 },
  }));
  const answer = response.output?.message?.content?.map((part) => part.text ?? "").join("").trim() || "I could not find a match right now.";
  const eventIds = eventContext.filter((event) => answer.includes(event.id) || answer.toLowerCase().includes(event.title.toLowerCase())).map((event) => event.id).slice(0, 2);
  return { answer, eventIds };
}

const handlers = { listEvents, getEvent, askHill, createHangout, createFlyerUpload, updatePreferences };

export async function handler(event) {
  const fieldName = event.info?.fieldName;
  const operation = handlers[fieldName];
  if (!operation) throw new Error(`Unsupported GraphQL field: ${fieldName}`);
  try {
    return await operation(event.arguments ?? {});
  } catch (error) {
    console.error(JSON.stringify({ fieldName, errorName: error?.name, message: error?.message }));
    throw error;
  }
}
