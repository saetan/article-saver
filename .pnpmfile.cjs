module.exports = {
  hooks: {
    updateConfig(config) {
      // Replit may run an older pnpm before the configured publishing build.
      // Bootstrapping inside this workspace makes the child installer discover
      // this project's packageManager pin again and recursively bootstrap.
      if (
        config.managePackageManagerVersions &&
        config.packageManager?.name === 'pnpm' &&
        config.wantedPackageManager?.name === 'pnpm' &&
        config.packageManager.version !== config.wantedPackageManager.version
      ) {
        return { ...config, pnpmHomeDir: '/tmp/article-saver-pnpm-tools' }
      }

      return config
    }
  }
}
