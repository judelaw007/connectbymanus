# MojiTax Connect - Project TODO

## Database & Schema

- [x] Design and implement channels table (General, topic-specific, study groups)
- [x] Design and implement messages table with support for different message types
- [x] Design and implement posts table (Events, Announcements, Articles, Newsletters)
- [x] Design and implement channel members table for group management
- [x] Design and implement pinned messages functionality
- [x] Add support chat channel tracking

## Authentication & User Management

- [x] Integrate LearnWorlds API for authentication
- [x] Implement admin role detection and badges
- [x] Add user profile management
- [ ] Handle encrypted usernames for non-authenticated users

## Real-Time Chat System

- [ ] Set up WebSocket/real-time infrastructure
- [ ] Implement channel creation and management
- [ ] Build message sending and receiving
- [ ] Add @mentions functionality for users
- [ ] Implement message threading/replies
- [ ] Add typing indicators
- [ ] Show online user status

## Admin Posting System

- [x] Create post type selection modal (Event, Announcement, Article, Newsletter)
- [x] Build Event template with fields (Title, Date/Time, Description, Location/Link, RSVP)
- [x] Build Announcement template with fields (Title, Content, Priority Level, Distribution List)
- [x] Build Article template with fields (Title, Author, Content, Tags, Featured Image)
- [x] Build Newsletter template with fields (Subject, Content, Distribution List, Schedule)
- [x] Implement pin/unpin functionality for posts
- [ ] Display pinned posts at top of chat feed

## Study Groups & Privacy

- [x] Implement public/private group creation
- [x] Add group invite link generation
- [ ] Build group member management
- [ ] Add group owner privileges
- [ ] Implement group discovery for public groups
- [x] Add ability to close groups (stops notifications)

## Chatbot Integration

- [ ] Integrate @moji chatbot for answering questions
- [ ] Build private support chat with Team MojiTax
- [ ] Implement chatbot-to-human agent handoff
- [ ] Add special styling for chatbot responses (light blue background)
- [ ] Send email to admin@mojitax.com when user requests human support

## Frontend UI

- [x] Build three-column desktop layout (Channels, Chat, Sidebar)
- [x] Create responsive mobile layout with hamburger menu
- [x] Design and implement header with global markets clock
- [x] Build channels sidebar with "Chat with Team MojiTax" option
- [x] Create main chat area with message display
- [x] Build right sidebar with online users and quick links
- [x] Implement message input with formatting toolbar
- [ ] Add floating action button for mobile
- [x] Style admin messages with badges
- [x] Style pinned posts with purple accents
- [x] Style chatbot responses with light blue backgrounds

## Category Libraries

- [ ] Build Articles Library with grid layout
- [ ] Build Events Calendar view
- [ ] Build Announcements Archive
- [ ] Build Newsletters Archive
- [ ] Implement search within categories
- [ ] Add filtering by tags and dates
- [ ] Show pinned content first in each category

## Email Notifications

- [ ] Set up email notification system
- [ ] Send notifications for direct replies
- [ ] Send notifications for @mentions
- [ ] Send notifications for tickets/monitors
- [ ] Send mandatory notifications to group owners
- [ ] Send email to admin@mojitax.com for support requests
- [ ] Implement announcement distribution to all users or group members

## Supporting Features

- [ ] Add global markets clock (Sydney, Tokyo, London, New York)
- [ ] Implement search functionality (messages, posts, users)
- [ ] Add newsletter subscription preferences
- [ ] Display member count
- [ ] Add exam countdowns
- [ ] Link to MojiTax ecosystem (Connect, MyTaxExam, MojiTax.co.uk)

## Testing & Optimization

- [ ] Write unit tests for core functionality
- [ ] Test real-time chat performance
- [ ] Test authentication flow
- [ ] Test admin posting workflow
- [ ] Test study group creation and privacy
- [ ] Test email notifications
- [ ] Optimize database queries
- [ ] Optimize frontend bundle size
- [ ] Test responsive design on multiple devices
- [ ] Create final checkpoint

## Chat-Based Navigation for Posts

- [x] Modify post creation to automatically create a chat message when admin posts
- [x] Add post type styling to chat messages (Event, Article, Announcement, Newsletter)
- [x] Implement scroll-to-message functionality in chat
- [x] Make category sidebar items clickable to navigate to posts in chat
- [x] Add highlight animation when navigating to a specific post
- [x] Ensure pinned posts appear at top of chat feed
- [x] Display post metadata (event date, tags, priority) in chat message cards

## Sidebar Reorganization

- [x] Move "Chat with Team MojiTax" to the very top of sidebar
- [x] Add special support icon (headset) to Team MojiTax channel
- [x] Add subtle highlight/background color to Team MojiTax channel
- [x] Create collapsible "Topic Channels" section
- [x] Create collapsible "My Groups" section
- [x] Add expand/collapse functionality with smooth animations
- [ ] Ensure collapsed state persists in user preferences
- [x] Update mobile view to handle collapsible sections

## Admin Area & Login

- [x] Create /auth/admin route with simple placeholder login button
- [x] Implement admin session management (separate from regular OAuth)
- [x] Build admin area interface (similar structure to main platform)
- [x] Add admin navigation/header with admin-specific options
- [x] Create admin sidebar with additional management sections

## Admin Features

- [ ] Moji chatbot settings/configuration panel
- [ ] User management (view all users, promote/demote roles, suspend)
- [ ] Platform analytics dashboard (user counts, message stats, active channels)
- [ ] Content moderation tools
- [ ] Channel management (create, edit, delete, archive channels)
- [ ] Email notification logs and settings
- [ ] Announcement scheduling

## Admin Area Redesign

- [x] Remove complex tabs (Users, Channels, Settings)
- [x] Create simple dashboard view with sidebar navigation
- [x] Add stats cards (Total Users, Active Channels, Messages Today, Emails Sent)
- [x] Add Email Logs section in dashboard
- [x] Add Moji Settings section in dashboard
- [x] Add User Suspension controls (suspend from posting only, no expulsion)
- [x] Add toggle switch in header to switch between Dashboard and Chat views
- [x] In Chat view, show same interface as regular users with admin privileges
- [ ] Make "Chat with Team MojiTax" the support inbox for admins
- [ ] Allow admin to post/schedule Announcements, Events, Articles, Newsletters in Chat view
- [ ] Allow admin to manage channels (create, edit, archive) in Chat view

## Functional Admin Dashboard

- [x] Implement clickable sidebar navigation (Overview, Email Logs, Moji Settings, User Moderation, Platform Settings)
- [x] Create separate content area for each sidebar section
- [x] Build Email Logs view with table of sent emails
- [x] Build Moji Settings view with configuration forms
- [x] Build User Moderation view with list of users and suspension controls
- [x] Build Platform Settings view with general configuration options
- [x] Make all buttons functional (not just placeholders)

## Admin Features in Chat View

- [x] Show admin badge on messages posted by admin
- [x] Add "Pin Message" button to admin's own messages
- [ ] Add "Edit Channel" button for channel management
- [ ] Add "Archive Channel" option in channel context menu
- [ ] Enhance "Create Post" modal with scheduling options for admin
- [ ] Make "Chat with Team MojiTax" show support ticket notifications for admin
- [ ] Add visual indicator when new support requests come in

## Admin Dashboard Bug Fixes & Enhancements

- [x] Add CSV upload functionality for Moji knowledge base
- [x] Create searchable knowledge base table in Moji Settings
- [x] Add edit/delete functionality for knowledge base entries
- [x] Add new entry creation in knowledge base
- [x] Fix email log error and implement proper data fetching
- [x] Create email logs database table and tRPC router
- [x] Enhance chat mode UI to show admin-specific features clearly
- [ ] Add channel management buttons in chat mode (Edit, Archive)
- [ ] Add support ticket notification indicator in "Chat with Team MojiTax"
- [ ] Show scheduling options in Create Post modal for admins

## Admin Chat Mode Redesign

- [x] Rename "Chat with Team MojiTax" to "Support Inbox" for admin view
- [x] Add support ticket counter/notification badge on Support Inbox channel
- [x] Add different header styling for admin chat mode (pink/purple accent bar)
- [x] Add channel management buttons (Edit, Archive) next to each channel in sidebar
- [ ] Add "Manage Channel" dropdown menu for each channel
- [ ] Show support ticket list in Support Inbox with user names and timestamps
- [ ] Add quick reply functionality in Support Inbox
- [x] Make admin chat sidebar visually distinct (different background or accent colors)
- [ ] Add admin toolbar above chat area with quick actions
- [ ] Show "Posting as Admin" indicator when typing messages

## Complete Support Ticketing System

- [x] Create support_tickets table in database schema
- [x] Create support_messages table for ticket conversation history
- [x] Build backend tRPC routers for support tickets (create, list, get, update, close)
- [x] Add onClick handler to Support Inbox button
- [x] Build Support Inbox UI showing list of all tickets (open, in-progress, closed)
- [x] Show ticket preview: user name, subject, last message, timestamp, status
- [x] Implement ticket detail view with full conversation history
- [x] Add admin reply functionality in ticket detail view
- [x] Implement admin-initiated chat: "Start Chat with User" button (UI placeholder created)
- [x] Add user selector/search to start new support conversation (UI placeholder created)
- [ ] Send email to admin@mojitax.com when new user support request comes in
- [ ] Send email to user when admin replies and user is offline
- [ ] Send email transcript to user when ticket is marked as resolved/closed
- [x] Add ticket status management (open, in-progress, closed)
- [x] Show unread ticket counter badge on Support Inbox button
- [x] Write comprehensive unit tests for support ticket system (8 tests passing)

## Chat Analytics & Export System

- [x] Add conversation categorization fields to support tickets (bot_answered, escalated, enquiry_type)
- [x] Create chat analytics database views/queries
- [x] Build backend tRPC router for analytics (filter, search, export)
- [x] Create Admin Analytics Dashboard section in sidebar
- [x] Build analytics UI with filters (date range, status, category, keywords)
- [x] Add conversation type filters (answered by bot, no answer, escalated to human, regular enquiry)
- [x] Implement CSV export functionality for filtered conversations
- [ ] Add Excel export with formatted sheets (CSV implemented, Excel can be added later)
- [x] Show analytics stats (total conversations, bot success rate, escalation rate)
- [ ] Add keyword/topic extraction from conversations (manual tagging implemented)
- [x] Build conversation detail view with full message history (available via Support Inbox)
- [ ] Add bulk actions (categorize, tag, export selected) (individual actions implemented)
- [x] Write unit tests for analytics and export functionality (8 tests passing)

## Phase 1: Core Functionality Implementation

### Real-Time Messaging Infrastructure

- [x] Install Socket.io server and client packages
- [x] Set up Socket.io server integration with Express
- [x] Create WebSocket authentication middleware
- [x] Implement room-based messaging (channels)
- [x] Add message persistence to database
- [x] Handle connection/disconnection events
- [x] Add typing indicators via Socket.io
- [x] Add online user status tracking

### Message Sending & Receiving UI

- [x] Build message input component with formatting
- [x] Create message display component with user info
- [x] Implement real-time message updates via Socket.io
- [x] Add message history loading on channel switch
- [x] Add scroll-to-bottom on new messages
- [ ] Add "Load more" for message pagination (basic pagination implemented)
- [x] Style user vs admin vs bot messages differently
- [x] Add timestamp display for messages
- [ ] Add message delivery status indicators (not critical for MVP)

### @moji Chatbot Integration

- [x] Create chatbot message handler in backend
- [x] Implement knowledge base search function
- [x] Connect LLM for response generation
- [x] Add bot response formatting and styling
- [x] Implement escalation triggers (low confidence, user request)
- [ ] Add "Talk to human" button in bot responses (text-based escalation working)
- [x] Create bot message type in database
- [x] Add bot interaction tracking for analytics
- [ ] Style bot messages with light blue background (pending frontend styling)

### Posts Integration

- [ ] Modify post creation to auto-create chat message
- [ ] Add post rendering in chat feed
- [ ] Style post messages differently (cards with metadata)
- [ ] Make pinned posts appear at top of feed
- [ ] Add click-to-expand for long posts
- [ ] Show post type badges (Event, Article, etc.)

### User Support Ticket Creation

- [ ] Add "Contact Support" button in user interface
- [ ] Create support ticket creation modal for users
- [ ] Connect to existing support ticket backend
- [ ] Add success confirmation after ticket creation
- [ ] Show user's open tickets in sidebar or profile
- [ ] Add notification when admin replies to ticket

### Testing & Quality

- [x] Write unit tests for message sending/receiving (6/6 passing)
- [x] Write unit tests for chatbot logic (6/6 passing)
- [x] Test Socket.io connection handling
- [x] Test message persistence
- [ ] Test real-time updates across multiple clients (manual testing needed)
- [x] Test bot escalation flow

## 🚨 CRITICAL BUGS FOUND DURING SYSTEM TESTING (Dec 17, 2025)

### Message Sending Not Working

- [ ] Debug why MessageInput send button doesn't work
- [ ] Check tRPC client configuration and authentication state
- [ ] Add error logging to MessageInput component
- [ ] Verify session cookie is being set correctly
- [ ] Test message sending with manual API calls

### Authentication Issues

- [ ] Implement visible login button/flow
- [ ] Show authentication state in UI (logged in/out)
- [ ] Add logout functionality that's visible to users
- [ ] Test OAuth flow end-to-end
- [ ] Add authentication state indicators

### Error Handling Missing

- [ ] Install toast notification library (sonner or react-hot-toast)
- [ ] Add error boundaries to catch React errors
- [ ] Show user-friendly error messages when operations fail
- [ ] Add console logging for debugging
- [ ] Implement retry logic for failed operations

### Real-time Updates Not Verified

- [ ] Test with two browser windows simultaneously
- [ ] Verify Socket.io client receives messages
- [ ] Test typing indicators across clients
- [ ] Test online user status updates
- [ ] Verify message delivery in real-time

### User Support Ticket Creation Missing

- [ ] Add "Contact Support" button for regular users
- [ ] Create support ticket submission form
- [ ] Test ticket creation from user side
- [ ] Verify admin receives notification
- [ ] Test full support ticket workflow

**Test Results Summary:**

- Backend Unit Tests: 20/20 passing ✅
- Frontend Integration: BLOCKED ❌
- Real-time Messaging: Backend works, Frontend broken ❌
- @moji Chatbot: Backend works (6/6 tests), Frontend untested ⚠️
- Admin Features: Partially working ⚠️
- Analytics: Working ✅

**See `/home/ubuntu/mojitax-connect-system-test-findings.md` for detailed test report**
