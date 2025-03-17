if ('serviceWorker' in navigator && document.location.protocol !== 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./serviceWorker.js')
      .then((registration) => {
        console.log(
          'Workbox service worker successful with scope:',
          registration.scope
        );
      })
      .catch((error) => {
        console.error('Workbox service worker failed to register', error);
      });
  });
}
