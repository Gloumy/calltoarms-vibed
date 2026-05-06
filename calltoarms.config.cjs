module.exports = {
  apps: [
    {
      name: 'calltoarms',
      exec_mode: 'fork',
      instances: 1,
      script: './.output/server/index.mjs',
      node_args: '--env-file=.env.production',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3001,
        NITRO_PORT: 3001
      }
    }
  ]
}