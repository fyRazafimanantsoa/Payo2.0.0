module.exports = {
  apps: [
    {
      name: "payo",
      script: ".next/standalone/server.js",
      cwd: ".",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      args: "-p 3000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      min_uptime: "5s",
      max_restarts: 10,
      restart_delay: 1000,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true,
    },
  ],
};
