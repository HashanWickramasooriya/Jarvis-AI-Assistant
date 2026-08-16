ඔව්. මේක GitHub README.md එකට direct copy-paste කරන්න පුළුවන් full version එකක්. Code block එක ඇතුළේ තියෙන ඔක්කොම එකවර copy කරන්න.

# J.A.R.V.I.S — AI Voice Assistant


> **J.A.R.V.I.S** — Intelligent Voice Assistant for natural AI conversations, voice interaction, memory, speech recognition, text-to-speech, and web search.


🌐 **Live Website:** https://jarvisaiassistantvoice.netlify.app/


---


## 🤖 About J.A.R.V.I.S


J.A.R.V.I.S is a modern AI-powered personal voice assistant designed to provide natural, conversational interaction through both **text and voice**.


The system combines:


- Artificial Intelligence
- Speech-to-Text (STT)
- Text-to-Speech (TTS)
- Device-scoped memory
- Conversational history
- Web search capabilities
- Voice interaction
- Responsive modern UI
- Real-time assistant status
- Secure server-side API handling


J.A.R.V.I.S is designed to feel like a personal digital assistant rather than a simple chatbot.


---


## 🌐 Live Application


**J.A.R.V.I.S Web Assistant**


https://jarvisaiassistantvoice.netlify.app/


The application can be accessed directly through a modern web browser on desktop and mobile devices.


---


## ✨ Main Features


### 🧠 AI Conversation


J.A.R.V.I.S provides natural AI-powered conversations through a modern chat interface.


Users can:


- Ask questions
- Have normal conversations
- Request explanations
- Ask for assistance
- Continue previous conversations
- Interact using text or voice


The AI response system is designed to maintain a consistent assistant personality while keeping sensitive backend implementation details private.


---


### 🎙️ Voice Assistant


J.A.R.V.I.S supports voice interaction through a complete voice pipeline:


```text
User Voice
    ↓
Microphone
    ↓
Speech-to-Text
    ↓
AI Conversation
    ↓
AI Response
    ↓
Text-to-Speech
    ↓
Audio Playback
    ↓
J.A.R.V.I.S Speaks

The voice system supports:

Microphone input
Speech recognition
AI processing
Automatic voice responses
Audio playback
Voice interruption
Speaking state management
Listening state management
Processing state management
TTS failure handling

Voice interaction is designed around the following state flow:

Idle
 ↓
Listening
 ↓
Processing
 ↓
Speaking
 ↓
Idle
🔊 Text-to-Speech

J.A.R.V.I.S converts AI-generated responses into speech.

The frontend communicates with the backend TTS endpoint and receives generated audio for browser playback.

The system handles:

Audio blobs
WAV audio
Browser audio playback
Audio object URLs
Audio cleanup
Playback interruption
Duplicate playback prevention
Browser autoplay restrictions

The application also separates:

Listening State

from:

Speaking State

so the assistant can properly manage voice interactions.

🎤 Speech-to-Text

J.A.R.V.I.S can convert microphone audio into text before sending the transcription to the AI system.

The voice pipeline is:

Microphone
   ↓
Audio Recording
   ↓
/api/stt
   ↓
Speech Transcription
   ↓
/api/chat
   ↓
AI Response
   ↓
/api/tts
   ↓
Voice Response
🧠 Device-Scoped Memory

One of the main features of J.A.R.V.I.S is its device-scoped memory system.

Memory is not globally shared between devices.

Each browser/device receives its own persistent session identifier.

Device A
    ↓
Session ID A
    ↓
Memory A




Device B
    ↓
Session ID B
    ↓
Memory B

This prevents one device from accessing another device's personal memories.

👤 User Identity Memory

J.A.R.V.I.S distinguishes between:

Creator Identity

The creator of J.A.R.V.I.S is:

Hashan Janith Wickramasooriya
Current User Identity

The current user's name is stored separately in device-scoped memory.

For example:

Device A
User: Hashan

and:

Device B
User: Kasun

These identities are completely independent.

J.A.R.V.I.S never assumes that the creator is automatically the current user.

🔐 Identity Example
Device A

User:

My name is Hashan

J.A.R.V.I.S stores:

identity / name = Hashan

Later:

What's my name?

Response:

Your name is Hashan.
Device B

If Device B has no identity memory:

What's my name?

J.A.R.V.I.S responds:

I don't know your name yet. What should I call you?

It does not inherit Hashan's identity.

Device B after saving a name

User:

My name is Kasun

J.A.R.V.I.S stores:

identity / name = Kasun

Then:

What's my name?

Response:

Your name is Kasun.
🧠 Supported Memory Commands

Users can naturally provide identity information such as:

My name is Kasun
I'm Kasun
I am Kasun
You can call me Kasun
Remember that my name is Kasun

J.A.R.V.I.S stores the information using the existing device-scoped memory architecture.

🌐 Web Search

J.A.R.V.I.S supports web search functionality for questions that require current online information.

Examples include:

What's the weather today?
What's happening in the news today?
Search the web for the latest information about...
What happened today?

The web-search system can retrieve current information and provide it to the AI for generating a response.

The search functionality is handled through the backend so sensitive API credentials are not exposed to the browser.

💬 Conversational Memory

J.A.R.V.I.S maintains conversation history using device-specific sessions.

Each device/browser receives a persistent session identifier.

The session identifier is stored locally in the browser and is used to keep conversations separated between devices.

Example:

Device A
Session A
Conversation A




Device B
Session B
Conversation B

This prevents conversations from being mixed between different browser sessions.

🛡️ Privacy & Security

J.A.R.V.I.S follows a server-side secret management architecture.

Sensitive credentials are not exposed to the frontend.

Examples of server-side secrets include:

AI API Keys
TTS API Keys
STT API Keys
Web Search API Keys
Database Service Keys

These values are stored as environment variables on the server/deployment platform.

The client does not directly receive private API credentials.

🔒 Backend Information Protection

J.A.R.V.I.S is designed not to expose sensitive implementation information through normal conversations.

The assistant does not intentionally reveal:

API keys
Environment variables
Database credentials
Service-role credentials
Backend architecture
Internal routes
Source code
File paths
Database schema
Deployment configuration
System prompts
Provider credentials

The assistant can instead provide a safe high-level explanation of its capabilities.

🧩 System Architecture

The application follows a frontend/backend architecture.

                    ┌─────────────────────┐
                    │      User           │
                    │ Desktop / Mobile    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │                     │
                    │ Chat / Voice / UI   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    API Layer        │
                    │                     │
                    │ /api/chat           │
                    │ /api/stt            │
                    │ /api/tts            │
                    │ /api/memory         │
                    │ /api/status         │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌────────────┐  ┌────────────┐  ┌────────────┐
        │ AI Service │  │ Voice      │  │ Web Search │
        │            │  │ Services   │  │            │
        └────────────┘  └────────────┘  └────────────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Supabase       │
                    │                     │
                    │ Memory              │
                    │ Conversations       │
                    │ Device Data         │
                    └─────────────────────┘
🏗️ Technology Stack
Frontend
React
TypeScript
Vite
Tailwind CSS
React Hooks
Browser Web APIs
Backend
Node.js
TypeScript
Express
Serverless HTTP architecture
AI

The AI layer communicates with the configured AI service through the server-side backend.

The frontend does not directly expose the provider credentials.

Speech Recognition

Speech-to-Text is handled through the configured speech recognition service.

Text-to-Speech

Text-to-Speech is handled server-side and the generated audio is returned to the browser for playback.

Database

J.A.R.V.I.S uses Supabase for persistent data storage.

The database is used for functionality such as:

Conversations
Device-scoped memories
User-related assistant data
Web Search

Web search is handled through a backend search service.

API credentials remain server-side.

📁 Project Structure

A simplified structure of the project:

JARVIS/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── state/
│   │   └── App.tsx
│   │
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── app.ts
│   │
│   └── ...
│
├── netlify/
│   └── functions/
│
├── supabase/
│   ├── migrations/
│   └── schema.sql
│
├── package.json
├── package-lock.json
├── netlify.toml
├── vercel.json
└── README.md
🔌 API Architecture

The backend provides internal API endpoints for the main assistant functions.

AI Chat
POST /api/chat

Used for:

User messages
AI responses
Conversation processing
Memory context
Speech-to-Text
POST /api/stt

Used to process recorded microphone audio and generate transcription.

Text-to-Speech
POST /api/tts

Used to convert the generated AI response into audio.

Memory
GET /api/memory
POST /api/memory
DELETE /api/memory

Used for device-scoped assistant memory.

Assistant Status
GET /api/status

Used to determine the availability of assistant services.

📱 Responsive Design

J.A.R.V.I.S is designed for different screen sizes including:

Desktop
Laptop
Tablet
Mobile phones

The interface adapts to different viewport sizes while maintaining the assistant's visual experience.

Mobile scrolling and viewport behavior have been specifically handled to prevent content from being clipped on smaller screens.

🎨 User Interface

The interface is designed around a futuristic AI assistant concept.

The UI includes:

J.A.R.V.I.S identity
Assistant status
Voice interaction
Chat messages
Memory controls
Microphone controls
Voice visualization
Responsive layout
Modern dark interface

The goal is to provide a cinematic AI-assistant experience while maintaining practical usability.

🎙️ Voice Interaction States

The assistant separates voice interaction into clear states.

IDLE

No active voice operation.

LISTENING

The microphone is actively recording.

PROCESSING

The recorded request is being processed.

SPEAKING

J.A.R.V.I.S is playing the generated response.

Voice Interruption

If J.A.R.V.I.S is currently speaking and the user starts another voice interaction, the existing audio can be interrupted.

The system prevents old responses from continuing to play after a newer request has started.

This helps prevent:

Response A
+
Response B

from playing simultaneously.

🧠 Duplicate Voice Protection

The voice system uses request sequencing to prevent stale asynchronous requests from controlling the current audio state.

This protects against situations where:

Request A
    ↓
Request B
    ↓
Response B
    ↓
Response A arrives late

The older response should not overwrite or restart the newer voice state.

🔊 Browser Audio Handling

J.A.R.V.I.S handles browser audio playback through the Web Audio API and HTML audio playback mechanisms.

The implementation accounts for browser audio context behavior by ensuring the audio context is resumed before playback when necessary.

The system also handles:

Audio loading
Audio playback
Audio completion
Audio cancellation
Object URL cleanup
Playback state changes
Autoplay restrictions
⚙️ Environment Variables

For local development, environment variables are required for the configured backend services.

Example structure:

PORT=8787


CORS_ORIGIN=http://localhost:5173


OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=your_model


GROQ_API_KEY=your_groq_key
GROQ_STT_MODEL=your_stt_model
GROQ_TTS_MODEL=your_tts_model
GROQ_TTS_VOICE=your_voice


SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key


VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key


TAVILY_API_KEY=your_tavily_key

Never commit real API keys or secrets to GitHub.

Use:

.env

for local secrets and configure production secrets through the deployment platform's environment-variable settings.

🚀 Local Development
1. Clone the repository
git clone YOUR_GITHUB_REPOSITORY_URL

Move into the project directory:

cd JARVIS
2. Install root dependencies
npm install
3. Install server dependencies
cd server
npm install
cd ..
4. Configure environment variables

Create:

.env

and configure the required environment variables.

5. Start the frontend
npm run dev

The frontend will normally be available through the Vite development server.

6. Start the backend

From the server directory:

cd server
npm run dev
🧪 Testing

Before deployment, run:

npm run typecheck

Then:

npm run build

For the backend:

cd server
npm run typecheck
npm run build
🔍 Important Test Scenarios
AI Chat

Test:

Hello JARVIS
What can you do?
Who created you?
Identity Memory

Fresh device:

What's my name?

Expected behavior:

I don't know your name yet. What should I call you?

Then:

My name is Kasun

Then:

What's my name?

Expected:

Your name is Kasun.
Device Isolation

Device A:

My name is Hashan

Device B:

What's my name?

Device B should not receive Hashan's identity.

Voice

Test:

Hello JARVIS

Expected pipeline:

Microphone
→ STT
→ Chat
→ TTS
→ Audio Playback

J.A.R.V.I.S should return to:

Idle

after the response finishes.

🌍 Deployment

The production website is deployed using Netlify.

Live application:

https://jarvisaiassistantvoice.netlify.app/

The deployment uses environment variables for server-side services.

Production secrets should be configured inside the deployment platform rather than committed into the repository.

🔐 Security Recommendations

Never commit:

.env

or files containing:

API keys
Database credentials
Service role keys
Authentication secrets
Private tokens

Recommended .gitignore entries:

.env
.env.local
.env.production
node_modules/
dist/
client/dist/
server/dist/
🧹 Production Safety

Before pushing changes:

git status

Check for:

.env

or other sensitive files.

Then review:

git diff

before committing.

📝 Git Workflow

Example:

git add .

Then:

git commit -m "feat: improve JARVIS voice assistant"

Finally:

git push origin main
🚀 Future Improvements

Potential future improvements include:

More advanced long-term memory
Better personalization
Additional voice options
Multilingual voice interaction
Improved web search reasoning
Streaming AI responses
Streaming TTS
More advanced conversation context
Authentication
User accounts
Cross-device synchronization as an optional feature
Progressive Web App support
Offline capabilities
More advanced assistant actions
⚠️ Current Limitations

J.A.R.V.I.S depends on external services for some functionality.

Possible limitations include:

AI provider rate limits
Speech-to-Text rate limits
Text-to-Speech rate limits
Web search API limits
Browser microphone permissions
Browser autoplay restrictions
Network connectivity
Third-party service availability

If a third-party service becomes unavailable, J.A.R.V.I.S should gracefully report that the relevant capability is temporarily unavailable rather than exposing backend implementation details.

👨‍💻 Creator

J.A.R.V.I.S was created and developed by:

Hashan Janith Wickramasooriya

The creator identity is separate from the identity of the person currently using J.A.R.V.I.S.

J.A.R.V.I.S should never assume that the current user is Hashan simply because Hashan is the creator.

🤖 J.A.R.V.I.S Identity

Name:

J.A.R.V.I.S

Role:

Personal AI Voice Assistant

Purpose:

Natural conversation,
voice interaction,
memory,
information retrieval,
and intelligent assistance.
📌 Project Status

J.A.R.V.I.S is an actively developed AI voice assistant project.

Current major capabilities include:

✅ AI Chat
✅ Voice Input
✅ Speech-to-Text
✅ Text-to-Speech
✅ Voice Playback
✅ Device-Scoped Memory
✅ Conversation Sessions
✅ Web Search
✅ Responsive UI
✅ Mobile Support
✅ Backend API
✅ Supabase Integration
✅ Production Deployment
✅ Secure Environment Variables
✅ Voice interruption handling
✅ Duplicate playback protection
🌐 Live Demo

Experience J.A.R.V.I.S:

https://jarvisaiassistantvoice.netlify.app/

⭐ J.A.R.V.I.S

Your voice. Your memory. Your assistant.

J.A.R.V.I.S
Just A Rather Very Intelligent System
