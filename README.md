# Factotum 🦫

The official nwPlus Discord bot for hackathon management. Handles mentor tickets, verification, trivia, and reporting.

## Setup

**Requirements:** Node.js 18+, Discord bot token, Firebase service account

```bash
git clone https://github.com/nwplus/Factotum.git
cd Factotum
npm install
```

**Environment variables (.env):**

Copy `.env.example` to `.env` and fill out the fields.
Fields prefixed with `DEV_` will be used when running in development mode and ones without prefix will be used when running in production mode.

**Discord Bot Setup:**

- Enable Server Members Intent and Message Content Intent
- Invite with Administrator permissions

**Run:**

```bash
npm run dev  # Development
npm start    # Production
```

**Configure:** Use `/init-bot` command to set roles and channels

## Development

Use the Sapphire CLI to add new commands with the provided template:

```bash
npx sapphire generate slashcommand MyCommand
```

This will create a new file `src/commands/MyCommand.ts` with a barebones template for a new command.a

**Docker:** `docker-compose up -d`

---

Built by [nwPlus](https://github.com/nwplus) • [Issues](https://github.com/nwplus/Factotum/issues)
