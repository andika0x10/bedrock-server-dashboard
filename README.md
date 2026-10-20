# Minecraft Bedrock Server Dashboard

![Dashboard](images/dashboard-desktop.png)

## Setup

Requires Node.js >=22.12.0. Extract the official Linux Bedrock Server 1.26.52.3 archive into `bedrock-server/` in the project root and make `bedrock_server` executable. Keep world data and configuration in that directory.

Create `.env` from `.env.example` and set the administrator credentials, then run:

```sh
npm ci
npm install -g pm2
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

The dashboard listens on `http://<server-ip>:4321`. Log in using the credentials in `.env`, then start Bedrock from the dashboard. Bedrock runs as a child of the dashboard so its console and controls remain available. Keep PM2 at one instance because sessions and server state are held in memory.

Bedrock 1.26.52.3 enables its allowlist by default. Add players through the dashboard console:

```text
allowlist add "Gamertag"
```

## Operations

```sh
pm2 status
pm2 logs bedrock-dashboard
```

After changing the web code, stop Bedrock gracefully from the dashboard, then run:

```sh
npm run build
pm2 restart ecosystem.config.cjs --update-env
pm2 save
```

Start Bedrock again from the dashboard. `pm2 save` stores the process list; automatic startup after a machine reboot requires separately installing the service with `pm2 startup` and following its output. Bedrock is started through the dashboard after a web restart.
