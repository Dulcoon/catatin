module.exports = {
  apps: [
    {
      name: 'catatin',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        PORT: 7878
      }
    }
  ]
};
