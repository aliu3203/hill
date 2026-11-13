# Hill

A polished, interactive MVP for UCLA Hill events discovery, based on the supplied pitch deck.

## Features

- Personalized event discovery and search
- Live-map event pins
- Event details, saving, RSVPs, and `.ics` calendar downloads
- Casual hangout creation
- UCLA-only accounts: sign up with an `@ucla.edu` or `@g.ucla.edu` email, verified with a 6-digit code
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
- Cognito user pool for UCLA student sign-up and sign-in

## Login (UCLA students only)

Anyone can browse events. Posting a hangout, scanning a flyer, Ask Hill, and alerts need a verified UCLA account.

1. A student signs up with their email, first name, and a password.
2. A **pre sign-up Lambda** (`infra/functions/presignup/`) rejects any email that isn't exactly `@ucla.edu` or `@g.ucla.edu`, before Cognito creates the account.
3. Cognito emails a 6-digit code. The student enters it and is signed in.
4. The app sends the student's Cognito ID token to AppSync. The API Lambda checks the email is a verified UCLA address again on every student-only request, and uses the student's ID instead of a shared demo user.

Signed-out visitors use the API key, which AppSync limits to `listEvents`, `getEvent`, and the live `onEventCreated` subscription (see the `@aws_api_key` directives in `infra/schema.graphql`).

To allow more domains (for example `cs.ucla.edu`), deploy with `--parameter-overrides AllowedEmailDomains=ucla.edu,g.ucla.edu,cs.ucla.edu` and update `allowedEmailDomains` in `scripts/configure-frontend.mjs`.

**Limits to know:** Cognito's built-in email sender allows about 50 verification emails per day, which is fine for a pilot. For more, connect Amazon SES in the user pool's email settings. Codes can land in spam the first time, so tell testers to check there.

## Tests

```bash
npm run check   # syntax-check every JS file
npm test        # unit tests for the UCLA email rule
```

## Deploy the backend

The infrastructure is an AWS SAM/CloudFormation stack. From `infra/`:

```bash
sam build
sam deploy --guided --stack-name hill-dev --region us-east-1 --capabilities CAPABILITY_IAM
```

After deployment, point the frontend at the stack. With the AWS CLI logged in to the same account:

```bash
node scripts/configure-frontend.mjs --stack hill-dev --region us-east-1
```

Or pass the stack outputs by hand, in this order:

```bash
node scripts/configure-frontend.mjs "<GraphQLApiUrl>" "<GraphQLApiKey>" "<Region>" "<UserPoolId>" "<UserPoolClientId>"
```

Redeploy the static site after configuring the frontend.

The user pool is kept (`DeletionPolicy: Retain`) if the stack is deleted, so student accounts aren't lost by accident. Delete it in the Cognito console if you really want it gone.
