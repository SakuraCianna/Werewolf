import { spawn } from 'node:child_process';
import process from 'node:process';

console.log('🚀 Starting Voice Werewolf Server & Client...');

// 在 Node 24 (Windows) 下直接以 shell: false 执行 .cmd 会触发 EINVAL 错误 (CVE-2024-27980 防护)
// 若传入 args 数组且 shell: true 则会触发 DEP0190 弃用警告
// 因此将完整命令作为单一字符串传入 spawn 并启用 shell: true (不传 args)，既兼容 Windows/Linux 又彻底消除 DEP0190 与 EINVAL
// stdio 第一项设为 'ignore'，避免子进程争抢 stdin 导致退出码 4294967295
const server = spawn('npm run dev:server', {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
});

const client = spawn('npm run dev:client', {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
});

function cleanup() {
  console.log('\n🛑 Shutting down Voice Werewolf...');
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
