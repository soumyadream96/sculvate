module.exports = {
  baseUrl: '/glance',
  work: './build-tmp',
  config: {
    title: 'Glance',
    description: '"The Web Viewer for your data"',
    subtitle: '"Enable visualization on any computer."',
    author: 'Kitware Inc.',
    timezone: 'UTC',
    url: 'https://kitware.github.io/glance',
    root: '/glance/',
    github: 'kitware/glance',
  },
  copy: [
    {
      src: '../dist/*',
      dest: './build-tmp/public/app',
    },
    {
      src: '../dist/redirect-app.html',
      dest: './build-tmp/public/nightly/index.html',
      destIsTarget: true,
    },
    {
      src: '../dist/index-ga.html',
      dest: './build-tmp/public/app/index.html',
      destIsTarget: true,
    },
  ],
};
