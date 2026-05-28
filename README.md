# DevProfile AI

AI-powered developer intelligence platform that analyzes GitHub profiles, repositories, resumes, and LinkedIn profiles to generate recruiter-style engineering insights and career feedback.

---

## Live Demo

Frontend: https://github-evaluator.jainparichay.in

---

## Overview

DevProfile AI is a full-stack AI platform designed to evaluate developer profiles using structured scoring systems, AI-generated feedback, and profile analytics.

The platform combines GitHub analysis, resume evaluation, LinkedIn scoring, recruiter-style AI insights, radar-chart visualization, and role-based engineering assessment into a unified developer intelligence workflow.

It focuses on turning raw developer activity into understandable career insights and engineering signals.

---

## Features

* GitHub repository analysis
* GitHub profile evaluation
* Resume ATS analysis
* LinkedIn profile scoring
* AI-generated recruiter feedback
* Radar-chart visualizations
* GitHub OAuth authentication
* Context-aware AI chat assistant
* Role-based scoring systems
* Score calibration and validation
* Razorpay payment integration
* Full-stack React + Express architecture

---

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend

* Node.js
* Express.js

### AI / Analysis

* Groq API
* NLP scoring pipelines
* Rule-based evaluation systems

### Authentication

* GitHub OAuth

### Payments

* Razorpay

### Deployment

* Docker
* Render

---

## System Flow

```text id="d4pj8z"
GitHub / Resume / LinkedIn Input
                ↓
Data Extraction
                ↓
Signal Analysis
                ↓
AI Evaluation
                ↓
Score Calibration
                ↓
Radar Charts + Insights
                ↓
Developer Intelligence Dashboard
```

---

## Core Capabilities

### GitHub Repository Analyzer

Evaluates repository quality using documentation quality, testing presence, structure, security practices, and project organization signals.

### GitHub Profile Analyzer

Analyzes contribution activity, engineering consistency, tech diversity, and developer impact indicators.

### Resume Analyzer

Generates ATS-focused resume feedback with role-based improvement recommendations.

### LinkedIn Analyzer

Scores recruiter readability, keyword alignment, and professional profile structure.

### AI Career Assistant

Provides context-aware AI feedback and follow-up guidance based on analyzed developer data.

---

## Why This Project?

Most developer evaluation tools focus only on code or only on resumes.

DevProfile AI combines:

* engineering signals
* profile quality
* project structure
* resume optimization
* AI-generated insights

to create a more complete developer evaluation workflow.

---

## Project Structure

```text id="3go2xp"
devprofile-ai/
├── server.js
├── prompts.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── scripts/
├── tests/
├── .env.example
├── Dockerfile
├── vite.config.js
├── package.json
└── README.md
```

---

## Authentication & Payments

### GitHub OAuth

Used for authenticated GitHub profile analysis and private repository access.

### Razorpay Integration

Implements payment-gated workflows and server-side payment verification.

---

## Local Setup

### Clone Repository

```bash id="2e0x2q"
git clone https://github.com/mokshijain22/devprofile-ai.git
cd devprofile-ai
```

---

### Install Dependencies

```bash id="aqw90o"
npm install
```

---

### Configure Environment Variables

Create a `.env` file:

```env id="1dj0ep"
GROQ_API_KEY=your_groq_api_key

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

SESSION_SECRET=your_session_secret
```

---

### Run Development Server

```bash id="ujmjlwm"
npm run dev
```

Frontend:

```text id="50f10v"
http://localhost:5173
```

Backend:

```text id="owtjlwm"
http://localhost:3001
```

---

## Key Learnings

* Developer evaluation requires combining deterministic scoring with AI reasoning
* OAuth workflows introduce important authentication and session-handling considerations
* AI-generated feedback becomes more useful when grounded in measurable engineering signals
* Product engineering involves UX, backend orchestration, APIs, authentication, and payments together

---

## Future Improvements

* Persistent user database
* Multi-session analytics history
* Better score explainability
* Organization/team-level analysis
* GitHub contribution visual analytics
* Improved AI chat memory
* Role-specific benchmark comparisons

---

## Notes

* Works in development mode without Razorpay keys
* GitHub OAuth is required for private repository access
* Payment gating is currently session-based
* Production version can use Redis/PostgreSQL for persistence

---

## Author

Mokshi Jain
AI/ML Engineering Student

GitHub: https://github.com/mokshijain22
Portfolio: https://jainparichay.in

---

