import tls from 'tls';

function checkSSL(hostname, port = 443) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port, servername: hostname, rejectUnauthorized: false },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          const expiresAt = new Date(cert.valid_to);
          const daysRemaining = Math.floor((expiresAt - Date.now()) / 86400000);
          socket.destroy();
          resolve({ hostname, expiresAt: expiresAt.toISOString(), daysRemaining, valid: socket.authorized });
        } catch (err) {
          socket.destroy();
          resolve({ hostname, expiresAt: null, daysRemaining: null, valid: false, error: err.message });
        }
      }
    );
    socket.setTimeout(8000, () => {
      socket.destroy();
      resolve({ hostname, expiresAt: null, daysRemaining: null, valid: false, error: 'timeout' });
    });
    socket.on('error', (err) => {
      resolve({ hostname, expiresAt: null, daysRemaining: null, valid: false, error: err.message });
    });
  });
}

export async function checkAllSSL(services) {
  return Promise.all(
    services.filter((s) => s.domain).map((s) => checkSSL(s.domain))
  );
}
