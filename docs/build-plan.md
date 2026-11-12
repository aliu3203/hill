# Build plan

Three weeks, four people. The plan front-loads the parts with outside dependencies and gets a deployed, usable app by the end of week one, so the last week is polish and not integration.

## Roles

| Role | Owns |
|---|---|
| **Frontend A** | Map, feed, filters, event detail, PWA setup |
| **Frontend B** | Sign-up and onboarding, posting forms, flyer camera and review form, chat screen, notifications |
| **Cloud** | AWS account, Amplify backend, data models and access rules, deployment pipeline, monitoring, budgets |
| **AI** | The three Bedrock pipelines, prompts, evaluation sets, cost limits |

## Repository layout

```
amplify/
  auth/            Cognito config and the preSignUp function
  data/            Schema, access rules, places.json
  storage/         S3 bucket config
  functions/       flyerExtract, askHill, matchAndNotify, icsExport
  backend.ts       Wires it together; SQS, stream triggers, and IAM in CDK
src/
  components/
  pages/
  lib/             API client, date helpers
evals/             Test sets and the scoring script
docs/
```

## Schedule

### Day one, before any code

| Task | Owner | Why it cannot wait |
|---|---|---|
| Create budget alerts on the club account | Cloud | Protects the credits from the first deploy onward |
| Request SES production access and verify a sending domain or address | Cloud | Approval can take a day or more; without it email reaches only pre-verified addresses |
| Confirm Bedrock model access and quotas in `us-west-2` | AI | Quota increases take days |
| Give each member their own sign-in via IAM Identity Center | Cloud | No shared credentials |
| Start collecting flyer photos for the evaluation set | AI | Needs 30 real ones |
| Compile the places list with coordinates | Frontend A | The map and flyer extraction both depend on it |

### Week 1: a working app without AI

| Deliverable | Owner |
|---|---|
| Amplify project, hosting connected to the repo, preview deploys per pull request | Cloud |
| Cognito sign-up restricted to UCLA addresses | Cloud |
| Data models and access rules for UserProfile, Place, Event, Rsvp | Cloud |
| Sign-up, confirmation, and onboarding screens | Frontend B |
| Map with place pins and time filters | Frontend A |
| Feed and event detail | Frontend A |
| Post a hangout and post an event forms | Frontend B |
| Real-time updates on map and feed | Frontend A |
| Flyer extraction prompt working in a script against the evaluation set | AI |
| Ask Hill prompt working in a script against a fixed event list | AI |

**End of week 1:** the team can sign in on their phones, post a hangout, and watch it appear on each other's maps.

### Week 2: the AI features

| Deliverable | Owner |
|---|---|
| S3 upload, SQS queue, `flyerExtract` deployed | AI + Cloud |
| Camera capture, upload, and review form | Frontend B |
| `askHill` deployed; chat screen | AI + Frontend B |
| Tagging and screening inside `publishEvent` | AI |
| "I'm in" and attendee list | Frontend A |
| `.ics` export | Cloud |
| Notification model, `matchAndNotify`, in-app alert list | Cloud + Frontend B |
| Model comparison on the evaluation sets; model decision made | AI |

**End of week 2:** all twelve v1 features work end to end in production, roughly.

### Week 3: pilot-ready

| Deliverable | Owner |
|---|---|
| Email alerts through SES | Cloud |
| Report button and moderator screen | Frontend A + Cloud |
| Per-user limits and cost alarm | AI |
| Dead-letter queue alarm, error alarms, a dashboard | Cloud |
| Empty states, loading states, error messages, install-to-home-screen prompt | Frontend A + B |
| Testing on real iPhones and Android phones | Everyone |
| Seed the app with real events for launch week | Everyone |
| Feature freeze on day 3; remaining days are fixes only | Everyone |
| Demo script and a two-minute walkthrough | Everyone |

**Stretch, in this order if time allows:** web push, weekly digest, calendar feed subscription.

## What to cut if behind

Cut from the bottom:

1. Email alerts (keep in-app)
2. Moderator screen (moderate from the AWS console during the pilot)
3. Ask Hill conversation history (single question and answer only)
4. For-you alerts (replace with a "For you" filter on the feed)
5. Ask Hill

Snap a flyer stays. It is the feature that fills the map with content, and the most memorable part of the demo.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Sign-up emails do not arrive.** Cognito's built-in sender is capped at a small number of emails per day, and SES starts in a sandbox that only delivers to verified addresses | High if ignored | Request SES production access on day one and point Cognito at SES. Until approved, verify each team member's address manually |
| **UCLA mail filters the emails as spam** | Medium | Send from a verified domain with DKIM set up, not a Gmail address. Test with real `@ucla.edu` and `@g.ucla.edu` inboxes in week one |
| **Bedrock access or quota is not ready** | Medium | Check on day one. The AI role can develop prompts in scripts while waiting |
| **GraphQL and Amplify are unfamiliar** | High | The Cloud role builds one complete vertical slice (model, access rule, list, create, subscribe) in the first two days as a pattern for everyone to copy |
| **An empty map at launch** | High | Scan every flyer on the Hill the weekend before the pilot. An empty app does not get opened twice |
| **Flyer dates read wrongly** | Medium | Mandatory review form; highlighted uncertain fields; evaluation set |
| **Inappropriate posts** | Low to medium | Verified accounts, visible host names, model screening, report button, moderators |
| **Credits run out** | Low | No always-on services, per-user limits, budget alerts |
| **iPhone users expect push notifications** | Medium | Set expectations: v1 has in-app and email alerts. Web push is a stretch goal and needs the app installed to the home screen |

## Open questions

Decisions for the team. The spec assumes the first option in each case.

| Question | Options | Assumed |
|---|---|---|
| Who can sign up? | Any UCLA email; or Hill residents only (no simple way to verify) | Any UCLA email |
| Which model? | `claude-opus-5-5`; or `claude-haiku-5-5` if it passes the evaluation sets | Decide in week 2 from the evaluation results |
| Amplify with GraphQL, or Express with REST? | See [architecture](architecture.md#alternatives-considered) | Amplify |
| Who moderates during the pilot, and how fast must they respond? | | The four team members, within a day |
| Which sending address for email? | A domain the club owns; or a single verified address | A club-owned domain |
| Does the pilot need sign-off from UCLA Residential Life or use of UCLA's name need approval? | | Ask the club's faculty advisor before launch |
| Pilot scope | One building; or the whole Hill | One building, then widen |
