# Factotum 🦫

The official nwPlus Discord bot for hackathon management. Handles mentor tickets, verification, trivia, and reporting.

## Setup

**Requirements:** Node.js 18+, Discord bot token, Firebase service account

```bash
$ git clone https://github.com/nwplus/Factotum.git
$ cd Factotum
$ npm install
```

**Environment variables (.env):**

Copy `.env.example` to `.env` and fill out the fields.
Fields prefixed with `DEV_` will be used when running in development mode and ones without prefix will be used when running in production mode.

**Discord Bot Setup:**

- Enable Server Members Intent and Message Content Intent
- Invite with Administrator permissions

**Run:**

```bash
$ npm run dev
```

or

```bash
$ npm start
```

**Configure:** Use `/init-bot` command to set roles and channels

### Docker

Use the provided Dockerfile and compose file:

```bash
$ docker compose up
$ docker compose down
```

## Development

See [./DEVELOP.md](./DEVELOP.MD)

---

Built by [nwPlus](https://github.com/nwplus) • [Issues](https://github.com/nwplus/Factotum/issues)
