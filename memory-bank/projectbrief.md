# Project Brief: Text Mate Frontend

## Project Overview
Text Mate is a modern web application for advanced text editing, correction, and document validation. This repository contains the frontend code built with Nuxt.js and TypeScript, while the backend is a separate Python FastAPI application.

## Core Requirements & Goals
- **Grammar Correction**: Real-time identification and suggestion of fixes for grammar and spelling issues
- **Text Rewriting**: Alternative phrasings with customizable style, audience, and intent parameters
- **Document Advisor**: Text validation against selected reference documents with PDF preview capabilities
- **Quick Actions**: Text transformation tools including summarization and format conversion
- **User Dictionary**: Personal dictionary for storing specialized vocabulary
- **Multilingual Support**: Full internationalization for English and German languages

## Technical Scope
- Single-page application with split-view interface (editor + tools panel)
- Real-time text correction with sentence-level processing
- PDF document viewing and validation system
- Integration with external LLM and language tool services
- Responsive design with mobile/tablet/desktop support

## Target Users
- Content creators and writers requiring advanced text editing capabilities
- Professionals needing document validation against reference materials
- Users requiring multilingual text correction and rewriting
- Organizations needing specialized vocabulary management

## Success Criteria
- Seamless real-time text correction without disrupting writing flow
- Intuitive split-view interface for efficient workflow
- Reliable integration with backend services
- Fast performance with proper error handling and user feedback
- Accessible design following modern web standards

## Constraints & Considerations
- Frontend-only repository with separate backend dependency
- Requires Docker environment for full development setup
- Authentication integration with DCC-BS authentication system
- Must maintain compatibility with DCC-BS common UI components
- Support for both development and production deployment scenarios
