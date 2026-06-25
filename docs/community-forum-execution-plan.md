# Community Forum Execution Plan

## Objective

Build a proper community forum for GameDoctor with:

- forums managed by admin
- student-created topics and replies
- optional approval flow by forum
- moderation tools for admins
- community-only bans
- image attachments
- rich text content

## Product Scope

### Client side

- top navigation entry: `Comunidade`
- community home with forum listing and search
- forum page with ordered topics, search and pagination
- topic page with rich text content, replies and attachments
- create topic flow
- reply flow
- same community area visible to members and admins
- if current user is admin/editor, show `Gerenciar` button linking to admin area

### Admin side

- create and edit forums
- forum description
- order forums
- activate/deactivate forums
- configure topic approval
- configure reply approval
- moderate pending topics and replies
- remove content
- lock topic
- pin topic
- ban user from community posting

## Recommended Data Model

### Enums

- `CommunityForumStatus`
- `CommunityTopicStatus`
- `CommunityPostStatus`
- `CommunityBanStatus`
- `CommunityModerationActionType`

### Models

- `CommunityForum`
- `CommunityTopic`
- `CommunityPost`
- `CommunityAttachment`
- `CommunityBan`
- `CommunityModerationAction`

## Execution Phases

### Phase 1 - Foundation

- create Prisma models and indexes
- add migration
- add reusable helpers for moderation and ban checks
- add upload support for community images

Status:

- done: Prisma models and indexes
- done: manual migration for existing database flow
- done: reusable slug and ban helper
- done: attachment upload flow for community images

### Phase 2 - Admin

- admin page for forum CRUD
- admin moderation queue
- admin actions:
  - approve
  - reject
  - pin
  - lock
  - remove
  - ban user

Status:

- done: admin forum CRUD
- done: moderation queue for topics and replies
- done: approve, reject, pin, lock and remove topic actions
- done: ban user controls
- done: moderation actions inside the topic view

### Phase 3 - Client

- `/comunidade` page
- `/comunidade/[forumSlug]` page
- `/comunidade/topico/[topicSlug]` page
- topic creation modal/page
- reply composer

Status:

- done: `/comunidade` page
- done: `/comunidade/[forumSlug]` with search and pagination
- done: topic creation flow
- done: `/comunidade/topico/[topicSlug]`
- done: reply composer
- done: relative date formatting across community pages
- done: ban-state blocking for topic/reply creation
- done: image attachments in topic and reply flow

### Phase 4 - Polish

- counters
- pagination
- loading states
- empty states
- permission messages
- audit log display

Status:

- done: counters
- done: pagination
- done: loading and empty states
- done: permission messages for banned users
- done: audit log display

## Rules

- no subcategories in v1
- banned users can read, but cannot create topics or replies
- pending items are hidden from public until approved
- admin/editor content can be auto-approved
- only images in v1 attachments
- forum ordering controlled by admin

## Suggested First Deliverable

The best first vertical slice is:

1. forum schema and migration
2. admin forum CRUD
3. client forum list
4. topic creation
5. topic moderation

This gives a working forum earlier and avoids building UI on unstable data structures.
