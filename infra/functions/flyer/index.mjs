import { randomUUID } from "node:crypto";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const region = process.env.AWS_REGION;
const tableName = process.env.EVENTS_TABLE;
const topicArn = process.env.ALERTS_TOPIC_ARN;
const modelId = process.env.BEDROCK_MODEL_ID;
const s3 = new S3Client({ region, maxAttempts: 5 });
const sns = new SNSClient({ region, maxAttempts: 5 });
const bedrock = new BedrockRuntimeClient({ region, maxAttempts: 5 });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), { marshallOptions: { removeUndefinedValues: true } });

function parseModelJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Bedrock did not return an event object.");
  const value = JSON.parse(match[0]);
  for (const key of ["title", "clock", "location", "category", "description"]) {
    if (typeof value[key] !== "string" || !value[key].trim()) throw new Error(`Flyer extraction missing ${key}.`);
  }
  return value;
}

export async function handler(event) {
  for (const record of event.Records ?? []) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await object.Body.transformToByteArray();
    const format = (object.ContentType || "image/jpeg").split("/")[1].replace("jpg", "jpeg");
    const response = await bedrock.send(new ConverseCommand({
      modelId,
      messages: [{
        role: "user",
        content: [
          { image: { format, source: { bytes } } },
          { text: "Extract this campus flyer into strict JSON with title, clock, startsAt (ISO 8601 or null), location, category, and description. Return only JSON." },
        ],
      }],
      inferenceConfig: { maxTokens: 420, temperature: 0.1 },
    }));
    const text = response.output?.message?.content?.map((part) => part.text ?? "").join("") ?? "";
    const extracted = parseModelJson(text);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const item = {
      PK: `EVENT#${id}`,
      SK: "EVENT",
      GSI1PK: "EVENTS",
      GSI1SK: extracted.startsAt || createdAt,
      entityType: "EVENT",
      id,
      title: extracted.title,
      time: "From flyer",
      clock: extracted.clock,
      startsAt: extracted.startsAt || undefined,
      location: extracted.location,
      distance: "On the Hill",
      category: extracted.category.toLowerCase(),
      description: extracted.description,
      imageKey: key,
      people: 0,
      source: "flyer",
      createdAt,
    };
    await dynamo.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: "attribute_not_exists(PK)" }));
    await sns.send(new PublishCommand({ TopicArn: topicArn, Subject: "New Hill event from flyer", Message: JSON.stringify({ id, title: item.title, category: item.category, startsAt: item.startsAt }) }));
  }
}
