# Workflow AI - Visual Workflow Builder

A powerful visual workflow builder for creating AI-powered media processing pipelines. Built with Next.js, React Flow, Trigger.dev, and Gemini AI.

🔗 **Live Demo:** [https://workflow-ai-tau.vercel.app](https://workflow-ai-tau.vercel.app)

## ✨ Features

- 🎨 **Visual Workflow Canvas** - Drag-and-drop interface for building workflows
- 🖼️ **Image Processing** - Upload, crop, and manipulate images
- 🎥 **Video Processing** - Upload videos and extract frames
- 🤖 **AI Integration** - Gemini 2.5 Flash & Pro for intelligent analysis
- 📊 **Workflow History** - Track all executions with detailed logs
- 💾 **Workflow Management** - Save, load, and export workflows as JSON
- ⚡ **Background Tasks** - Powered by Trigger.dev for reliable execution

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Workflow Engine:** React Flow
- **Background Tasks:** Trigger.dev
- **Database:** PostgreSQL (Neon)
- **Authentication:** Clerk
- **AI:** Google Gemini API
- **Media Processing:** Transloadit, FFmpeg
- **Storage:** Cloudflare R2

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon account)
- FFmpeg installed locally
- Accounts for:
  - Clerk (authentication)
  - Trigger.dev (background tasks)
  - Google AI Studio (Gemini API)
  - Transloadit (media processing)
  - Cloudflare R2 (storage)

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tarunsinghofficial/workflow-ai.git
cd workflow-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install FFmpeg

#### Windows:
1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add to PATH or set environment variables (see step 4)

#### macOS:
```bash
brew install ffmpeg
```

#### Linux:
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### 4. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@host/database"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Trigger.dev (for local development)
NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY="tr_dev_..."
TRIGGER_SECRET_KEY="tr_sec_..."

# Transloadit
NEXT_PUBLIC_TRANSLOADIT_KEY="your_key"
NEXT_PUBLIC_TRANSLOADIT_SECRET="your_secret"
TRANSLOADIT_KEY="your_key"
TRANSLOADIT_SECRET="your_secret"
TRANSLOADIT_STORE_CREDENTIALS="your_credentials_id"

# Cloudflare R2
R2_PUBLIC_DOMAIN="https://pub-xxx.r2.dev"
NEXT_PUBLIC_R2_PUBLIC_DOMAIN="https://pub-xxx.r2.dev"

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY="your_gemini_api_key"

# FFmpeg Paths (Windows only - if not in PATH)
FFMPEG_PATH="C:\\ffmpeg\\bin\\ffmpeg.exe"
FFPROBE_PATH="C:\\ffmpeg\\bin\\ffprobe.exe"
```

### 5. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 6. Run Development Servers

You need to run **two** servers:

#### Terminal 1: Next.js Dev Server
```bash
npm run dev
```

#### Terminal 2: Trigger.dev Local Worker
```bash
npx trigger.dev@latest dev
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
workflow-ai/
├── app/
│   ├── api/              # API routes
│   │   ├── gemini/       # Gemini AI integration
│   │   ├── image/        # Image processing
│   │   ├── video/        # Video processing
│   │   └── workflows/    # Workflow management
│   ├── components/       # React components
│   │   ├── nodes/        # Workflow node components
│   │   ├── LeftSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   └── WorkflowCanvas.tsx
│   └── lib/              # Utilities
├── bg-tasks/             # Trigger.dev background tasks
│   ├── crop.trigger.ts
│   ├── extractFrame.trigger.ts
│   └── llm.trigger.ts
├── prisma/
│   └── schema.prisma     # Database schema
└── trigger.config.ts     # Trigger.dev configuration
```

## 🎯 Available Workflow Nodes

1. **Prompt** - Text input node
2. **Image** - Upload images
3. **Video** - Upload videos
4. **Crop** - Crop images with visual selector
5. **Frame** - Extract frames from videos
6. **Any LLM** - Run Gemini AI analysis

## 🔧 Configuration Details

### FFmpeg Setup (Windows)

If FFmpeg is not in your system PATH, set these environment variables:

```bash
FFMPEG_PATH="C:\\ffmpeg\\bin\\ffmpeg.exe"
FFPROBE_PATH="C:\\ffmpeg\\bin\\ffprobe.exe"
```

### Transloadit Credentials

1. Create account at [transloadit.com](https://transloadit.com)
2. Create S3/R2 credentials in dashboard
3. Set `TRANSLOADIT_STORE_CREDENTIALS` to the credentials ID

### Trigger.dev Setup

1. Create account at [trigger.dev](https://trigger.dev)
2. Create a new project
3. Copy API keys from dashboard
4. For local dev: Use development keys
5. For production: Deploy with `npx trigger.dev@latest deploy`

## 🚢 Deployment

### Deploy to Vercel

```bash
# Push to GitHub
git push origin master

# Deploy on Vercel
# 1. Import repository on vercel.com
# 2. Add all environment variables
# 3. Deploy
```

### Deploy Trigger.dev Tasks

```bash
npx trigger.dev@latest deploy
```

## 📝 Usage

1. **Create Workflow:**
   - Drag nodes from left sidebar to canvas
   - Connect nodes by dragging from output to input handles
   - Configure each node with required parameters

2. **Execute Nodes:**
   - Click "Run" button on individual nodes
   - Or execute connected nodes in sequence

3. **View History:**
   - Check right sidebar for execution history
   - Click on runs to see node-level details

4. **Save Workflow:**
   - Click "Save Workflow" in Workflow Manager
   - Export as JSON for backup

## 🐛 Troubleshooting

### FFmpeg Not Found
- Verify FFmpeg is installed: `ffmpeg -version`
- Check PATH or set `FFMPEG_PATH` environment variable

### Trigger.dev Connection Issues
- Ensure both dev servers are running
- Check API keys are correct
- Verify network connectivity

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Run `npx prisma generate`
- Check database is accessible

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Trigger.dev
