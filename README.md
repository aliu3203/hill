# Hill

A polished, interactive MVP for UCLA Hill events discovery, based on the supplied pitch deck.

## Features

- Personalized event discovery and search
- Live-map event pins
- Event details, saving, RSVPs, and `.ics` calendar downloads
- Casual hangout creation
- Flyer-to-event AI flow (prototype simulation)
- Ask Hill conversational recommendations (prototype simulation)
- Responsive mobile navigation and accessible dialogs

## Run locally

Serve the `dist` directory with any static server, for example:

```bash
python3 -m http.server 4173 --directory dist
```

The browser keeps realistic sample data as an offline fallback. When `dist/config.js` contains an AppSync URL and API key, the app uses the AWS backend in `infra/`:

- AppSync GraphQL API with Lambda resolvers and subscriptions
- DynamoDB single-table event and preference storage
- S3 presigned flyer uploads
- Bedrock event recommendations and multimodal flyer extraction
- SNS notifications for new hangouts and flyer-derived events

## Deploy the backend

The infrastructure is an AWS SAM/CloudFormation stack. From `infra/`:

```bash
sam build
sam deploy --guided --stack-name hill-dev --region us-east-1 --capabilities CAPABILITY_IAM
```

After deployment, copy the `GraphQLApiUrl` and `GraphQLApiKey` stack outputs into the frontend:

```bash
node scripts/configure-frontend.mjs "<GraphQLApiUrl>" "<GraphQLApiKey>"
```

Redeploy the static site after configuring the frontend. The API key authentication mode is for this demo only; switch AppSync to Cognito user-pool authorization before storing private user data.
