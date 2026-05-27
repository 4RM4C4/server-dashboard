import si from 'systeminformation';
import os from 'os';
import { statfs } from 'fs/promises';
import { existsSync } from 'fs';

const IS_WINDOWS = process.platform === 'win32';
// /hostfs mounted → running in Docker with host filesystem access
// /.dockerenv present but no /hostfs → running in Docker without host mount (dev)
const HAS_HOSTFS = existsSync('/hostfs');

async function getDisk() {
  // Windows or dev without host mount: use si.fsSize() (reads native OS)
  if (IS_WINDOWS || !HAS_HOSTFS) {
    try {
      const disks = await si.fsSize();
      const relevant = disks.filter(
        (d) => !['tmpfs', 'squashfs', 'overlay', 'devtmpfs'].includes(d.type)
      );
      const total = relevant.reduce((a, d) => a + d.size, 0);
      const used = relevant.reduce((a, d) => a + d.used, 0);
      return { total, used, mount: relevant[0]?.mount ?? '/' };
    } catch {
      return null;
    }
  }

  // Linux in Docker with /:/hostfs:ro → read real host disk
  try {
    const stats = await statfs('/hostfs');
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    return { total, used: total - free, mount: '/' };
  } catch {
    return null;
  }
}

export async function getSystemMetrics() {
  const [load, mem, temp, netStats, disk] = await Promise.allSettled([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
    si.networkStats(),
    getDisk(),
  ]);

  const cpu = load.status === 'fulfilled' ? load.value : null;
  const memory = mem.status === 'fulfilled' ? mem.value : null;
  const temperature = temp.status === 'fulfilled' ? temp.value : null;
  const net = netStats.status === 'fulfilled' ? netStats.value : [];
  const diskData = disk.status === 'fulfilled' ? disk.value : null;
  const loadAvg = os.loadavg();

  const mainNet = net.find(
    (n) =>
      !['lo', 'docker0'].includes(n.iface) &&
      !n.iface.startsWith('br-') &&
      !n.iface.startsWith('veth')
  );

  return {
    uptime: os.uptime(),
    cpu: {
      percent: cpu?.currentLoad ?? 0,
      cores: cpu?.cpus?.map((c) => c.load) ?? [],
    },
    memory: {
      used: memory?.used ?? 0,
      total: memory?.total ?? 0,
      free: memory?.available ?? 0,
    },
    temperature: temperature?.main ?? null,
    disk: {
      used: diskData?.used ?? 0,
      total: diskData?.total ?? 0,
      mounts: diskData
        ? [{ mount: diskData.mount, used: diskData.used, total: diskData.total, percent: (diskData.used / diskData.total) * 100 }]
        : [],
    },
    network: {
      rxSec: mainNet?.rx_sec ?? 0,
      txSec: mainNet?.tx_sec ?? 0,
      rxTotal: mainNet?.rx_bytes ?? 0,
      txTotal: mainNet?.tx_bytes ?? 0,
      iface: mainNet?.iface ?? 'unknown',
    },
    loadAvg: {
      '1m': loadAvg[0],
      '5m': loadAvg[1],
      '15m': loadAvg[2],
    },
  };
}
