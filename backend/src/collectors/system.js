import si from 'systeminformation';
import os from 'os';
import { statfs, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const IS_WINDOWS = process.platform === 'win32';
const HAS_HOSTFS = existsSync('/hostfs');
const HAS_HOSTPROC_NET = existsSync('/hostproc/net');

// Parsed state for rate calculation
let _prevNet = null;
let _prevNetTime = null;

async function getHostNetStats() {
  const raw = await readFile('/hostproc/net/dev', 'utf8');
  const lines = raw.trim().split('\n').slice(2);
  const ifaces = lines.map((line) => {
    // Format: "  eth0:RXBYTES RXPKTS ..." — colon may be glued to the number when counter > 8 digits
    const colonIdx = line.indexOf(':');
    const iface = line.slice(0, colonIdx).trim();
    const parts = line.slice(colonIdx + 1).trim().split(/\s+/);
    // Receive: bytes[0] pkts[1] errs[2] drop[3] fifo[4] frame[5] compressed[6] multicast[7]
    // Transmit: bytes[8] pkts[9] ...
    return {
      iface,
      rx_bytes: parseInt(parts[0], 10),
      tx_bytes: parseInt(parts[8], 10),
    };
  });
  return ifaces.filter(
    (n) =>
      !['lo', 'docker0'].includes(n.iface) &&
      !n.iface.startsWith('br-') &&
      !n.iface.startsWith('veth')
  );
}

async function getNetworkMetrics() {
  if (!IS_WINDOWS && HAS_HOSTPROC_NET) {
    try {
      const ifaces = await getHostNetStats();
      const main = ifaces[0];
      if (!main) return null;

      const now = Date.now();
      const prev = _prevNet?.find((n) => n.iface === main.iface);
      const dt = _prevNetTime ? (now - _prevNetTime) / 1000 : null;

      _prevNet = ifaces;
      _prevNetTime = now;

      if (!prev || !dt || dt <= 0) return { rxSec: 0, txSec: 0, rxTotal: main.rx_bytes, txTotal: main.tx_bytes, iface: main.iface };

      return {
        rxSec: Math.max(0, (main.rx_bytes - prev.rx_bytes) / dt),
        txSec: Math.max(0, (main.tx_bytes - prev.tx_bytes) / dt),
        rxTotal: main.rx_bytes,
        txTotal: main.tx_bytes,
        iface: main.iface,
      };
    } catch {
      // fall through to si
    }
  }

  // Fallback: systeminformation (works on Windows / dev without host mount)
  const netStats = await si.networkStats();
  const mainNet = netStats.find(
    (n) =>
      !['lo', 'docker0'].includes(n.iface) &&
      !n.iface.startsWith('br-') &&
      !n.iface.startsWith('veth')
  );
  return mainNet
    ? { rxSec: mainNet.rx_sec ?? 0, txSec: mainNet.tx_sec ?? 0, rxTotal: mainNet.rx_bytes ?? 0, txTotal: mainNet.tx_bytes ?? 0, iface: mainNet.iface }
    : null;
}

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
  const [load, mem, temp, net, disk] = await Promise.allSettled([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
    getNetworkMetrics(),
    getDisk(),
  ]);

  const cpu = load.status === 'fulfilled' ? load.value : null;
  const memory = mem.status === 'fulfilled' ? mem.value : null;
  const temperature = temp.status === 'fulfilled' ? temp.value : null;
  const netData = net.status === 'fulfilled' ? net.value : null;
  const diskData = disk.status === 'fulfilled' ? disk.value : null;
  const loadAvg = os.loadavg();

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
      rxSec: netData?.rxSec ?? 0,
      txSec: netData?.txSec ?? 0,
      rxTotal: netData?.rxTotal ?? 0,
      txTotal: netData?.txTotal ?? 0,
      iface: netData?.iface ?? 'unknown',
    },
    loadAvg: {
      '1m': loadAvg[0],
      '5m': loadAvg[1],
      '15m': loadAvg[2],
    },
  };
}
