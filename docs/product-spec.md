# Product spec

## Problem

Students living on the Hill want to meet people, but events are advertised on elevator flyers and in group chats they are not in. There is no single place to see what is happening tonight, and no low-effort way to say "I'm getting boba at 8, come along."

## Users

| User | What they want |
|---|---|
| **Resident** (primary) | See what is on right now and tonight, near their building, that fits their interests |
| **Host** | An RA, club officer, or any student who wants people to show up to something |
| **Moderator** | A project team member who can remove posts and suspend accounts |

Everyone signs in with a UCLA email. There are no anonymous or public users.

## Concepts

- **Event**: something organised, with a title, start and end time, and a place. Usually comes from a flyer or a host.
- **Hangout**: something casual and short-lived ("Boba at 8 in Rieber lobby"). Same shape as an event, but quick to post and it disappears on its own after it ends.
- **Place**: a named Hill location from a fixed list (Rieber Hall, De Neve Plaza, Covel Commons and so on). Posts point at a place rather than a free-typed address, which keeps the map accurate.
- **Interest**: a tag from a fixed list (food, gaming, music, sports, study, arts, outdoors, faith, career, culture, wellness, parties). Users pick theirs; every post gets some.

## Features

### v1: must ship

| # | Feature | Acceptance criteria |
|---|---|---|
| 1 | **UCLA sign-in** | Sign up with an `@ucla.edu` or `@g.ucla.edu` address, confirm with an emailed code. Any other domain is refused at sign-up |
| 2 | **Onboarding** | Pick a display name, home building, and at least three interests |
| 3 | **Live map** | Map of the Hill with a pin per place that has something on. Filter by Now / Tonight / This week and by interest. Tapping a pin lists what is there |
| 4 | **Feed** | The same posts as a time-ordered list, for people who prefer a list |
| 5 | **Post a hangout** | Title, place, start time (defaults to now), optional note. Three taps from the home screen. Appears on other users' maps within a couple of seconds without a refresh |
| 6 | **Post an event** | As above plus end time, description, optional flyer image |
| 7 | **Snap a flyer** | Photograph a flyer; the app pre-fills title, time, place, and tags; the user checks them and taps Publish. See [AI features](ai-features.md#1-snap-a-flyer) |
| 8 | **I'm in** | One tap to say you are going. Posts show a count, and hosts see who |
| 9 | **Save to calendar** | Download an `.ics` file for any event; it opens in Google, Apple, or Outlook calendar with a 30-minute reminder built in |
| 10 | **Ask Hill** | Chat box: "Anything chill tonight near De Neve?" returns a short reply and matching event cards. See [AI features](ai-features.md#2-ask-hill) |
| 11 | **For-you alerts** | When a new post matches your interests you get an in-app notification, and optionally an email. See [AI features](ai-features.md#3-for-you-alerts) |
| 12 | **Report and remove** | Any user can report a post. Moderators can hide posts and suspend users |

### Stretch: only if v1 is solid

- Web push notifications to the phone's lock screen
- Weekly email digest ("This week on the Hill")
- Personal calendar feed URL to subscribe to once, so saved events sync automatically
- Semantic search over past and future events
- Native iOS and Android apps

### Out of scope

- Direct messages or group chat. Hill gets people to the same place; conversation happens in person
- Showing where other users are. The "live map" shows events, never people
- Ticketing, payments, capacity limits
- Anything beyond the Hill (Westwood, main campus) for the pilot

## Key flows

**Posting a hangout.** Home → "+" → type "Boba run" → pick "Rieber Hall" → Post. Everyone with the map open sees a new pin. Users who chose the *food* interest get an alert. Two hours after the start time the hangout drops off the map.

**Snapping a flyer.** Home → camera → take photo → wait a few seconds → review the pre-filled form (fix anything wrong) → Publish. If the same event is already listed, the app says so and offers "I'm in" instead of creating a duplicate.

**Asking Hill.** Chat tab → type a question → get a two-sentence answer with up to five event cards → tap a card to open the event.

## Safety and privacy

- **Verified students only.** Posts are visible only to signed-in UCLA accounts.
- **No location tracking.** The browser's location is used on the device to centre the map and is never sent to the server.
- **Minimal personal data.** Stored: email, display name, home building, interests. Nothing else.
- **Every post has an owner.** Hosts' display names are shown, which discourages abuse.
- **Automatic screening.** Text and flyer content are checked by the model at posting time; anything flagged is held for a moderator instead of published.
- **Deletion.** A user can delete their account and everything they posted.

## Success measures for the pilot

| Measure | Target for a one-floor or one-building pilot |
|---|---|
| Sign-ups | 100 verified students |
| Posts per week | 30, at least half of them hangouts |
| Flyer scans published without edits | 70% |
| Users who open the app on three or more days a week | 25% |

These targets are starting guesses for the team to revise.
