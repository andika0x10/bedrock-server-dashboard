module.exports = {
  apps: [
    {
      name: "bedrock-dashboard",
      cwd: __dirname,
      script: "./dist/server/entry.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      kill_timeout: 15000,
      time: true,
      env: { HOST: "0.0.0.0", PORT: "4321" },
    },
  ],
};
