# Hill — specifications

Hill puts everything happening on the UCLA Hill in one app so students can find their people. These documents turn the pitch ([HillPitch.pdf](HillPitch.pdf)) into something four people can build in three weeks.

| Document | What it answers |
|---|---|
| [Product spec](product-spec.md) | Who it is for, what v1 does, what is left out |
| [Architecture](architecture.md) | The stack, every AWS service and why, alternatives considered |
| [Data and API](data-and-api.md) | Data models, access rules, API operations |
| [AI features](ai-features.md) | Snap a flyer, Ask Hill, For-you alerts: pipelines, prompts, cost controls |
| [Build plan](build-plan.md) | Three-week schedule, who owns what, risks, open questions |

## The stack in one paragraph

A React + TypeScript web app (installable as a PWA, so it works on phones without an app store), hosted on AWS Amplify. The backend is defined in TypeScript with Amplify Gen 2: Cognito for `@ucla.edu` sign-in, AppSync for a real-time GraphQL API, DynamoDB for data, S3 for flyer photos, and Node.js Lambda functions for everything custom. The Lambdas call Claude on Amazon Bedrock for the three AI features. Amazon Location Service draws the map, SES sends email, and EventBridge Scheduler runs reminders and digests.

## Where this differs from the pitch deck

| Pitch | Spec | Why |
|---|---|---|
| OpenSearch for plain-English search | No search cluster. Ask Hill sends the upcoming events straight to Claude | The Hill has at most a few hundred upcoming events, which fits in one prompt. OpenSearch has an always-on cost floor that would eat the credits. Details in [architecture](architecture.md#search-why-there-is-no-opensearch) |
| Bedrock matches each event to each user | Bedrock tags each event once; matching users is a database lookup | One model call per event instead of one per event per user. Same result, a fraction of the cost |
| SNS for push alerts | In-app alerts and SES email in v1; web push as a stretch goal | SNS mobile push targets native apps. A web app needs the Web Push standard instead |
| "Phone or web" | One responsive web app, installable to the home screen | A separate native app does not fit in three weeks |
| Node.js backend | Node.js Lambda functions behind AppSync, rather than an Express server | Keeps the "fully serverless" pitch, and real-time updates and auth come built in. The Express alternative is costed in [architecture](architecture.md#alternatives-considered) |

Everything else in the deck (Amplify, AppSync + Lambda, DynamoDB + Streams, S3, SQS, Bedrock, Location Service, SES, .ics calendar files) is kept as pitched.
