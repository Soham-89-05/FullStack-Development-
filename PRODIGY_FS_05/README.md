# SocialConnect - Full Stack Social Media Application

## Features
- User registration and login
- Create and edit profile
- Upload profile image
- Create posts with text, image or video
- Add comma-separated tags to posts
- Like and unlike posts
- Comment on posts
- Explore/search users, posts and tags
- Delete your own posts
- SQLite database, so no separate MySQL setup is required

## Tech Stack
- Frontend: HTML, CSS, EJS templates
- Backend: Node.js, Express.js
- Database: SQLite
- Uploads: Multer
- Authentication: Express Session + bcryptjs

## How to Run
1. Install Node.js.
2. Open this folder in VS Code.
3. Open terminal in this folder.
4. Run: npm install
5. Run: npm start
6. Open browser: http://localhost:3000

## Notes
- Uploaded media is stored in public/uploads.
- Database is automatically created in data/social_media.db.
- Register a new account first, then create posts.
