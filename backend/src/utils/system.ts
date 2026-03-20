import os from 'os';

let previousCpus = os.cpus();

export function getCpuUsagePercentage(): number {
  const currentCpus = os.cpus();
  
  let totalIdle = 0;
  let totalTick = 0;
  
  for (let i = 0; i < currentCpus.length; i++) {
    const cpu = currentCpus[i];
    const prevCpu = previousCpus[i];
    
    for (const type in cpu.times) {
      const times = cpu.times as any;
      const prevTimes = prevCpu.times as any;
      totalTick += times[type] - prevTimes[type];
    }
    
    totalIdle += cpu.times.idle - prevCpu.times.idle;
  }
  
  previousCpus = currentCpus;
  
  if (totalTick === 0) return 0;
  const percentage = 100 - (100 * totalIdle) / totalTick;
  return Math.max(0, Math.min(100, percentage));
}
