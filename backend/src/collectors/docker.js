import Docker from 'dockerode';

// Auto-detects socket path: Unix socket on Linux, named pipe on Windows
const docker = new Docker();

function calcCpuPercent(stats) {
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const sysDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount =
    stats.cpu_stats.online_cpus ||
    stats.cpu_stats.cpu_usage.percpu_usage?.length ||
    1;
  if (sysDelta <= 0 || cpuDelta < 0) return 0;
  return (cpuDelta / sysDelta) * cpuCount * 100;
}

function getContainerStats(container) {
  return new Promise((resolve) => {
    container.stats({ stream: false }, (err, data) => {
      if (err || !data) return resolve(null);
      try {
        const s = typeof data === 'string' ? JSON.parse(data) : data;
        resolve({
          cpu: calcCpuPercent(s),
          memUsed: s.memory_stats.usage - (s.memory_stats.stats?.cache ?? 0),
          memLimit: s.memory_stats.limit,
        });
      } catch {
        resolve(null);
      }
    });
  });
}

export async function getContainers() {
  try {
    const list = await docker.listContainers({ all: true });
    return Promise.all(
      list.map(async (info) => {
        const container = docker.getContainer(info.Id);
        const stats = info.State === 'running' ? await getContainerStats(container) : null;
        return {
          id: info.Id.slice(0, 12),
          name: info.Names[0]?.replace('/', '') ?? info.Id.slice(0, 12),
          image: info.Image,
          status: info.State,
          statusText: info.Status,
          created: info.Created,
          cpu: stats?.cpu ?? 0,
          memUsed: stats?.memUsed ?? 0,
          memLimit: stats?.memLimit ?? 0,
        };
      })
    );
  } catch (err) {
    console.error('Docker collector error:', err.message);
    return [];
  }
}

export function streamLogs(containerId, onData, onEnd) {
  return new Promise((resolve, reject) => {
    const container = docker.getContainer(containerId);
    container.logs(
      { follow: true, stdout: true, stderr: true, tail: 200, timestamps: true },
      (err, logStream) => {
        if (err) return reject(err);
        const writer = { write: (chunk) => onData(chunk.toString('utf8')) };
        docker.modem.demuxStream(logStream, writer, writer);
        logStream.on('end', onEnd);
        logStream.on('error', (e) => onData(`[error] ${e.message}\n`));
        resolve(logStream);
      }
    );
  });
}
