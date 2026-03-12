const ADJECTIVES = [
  'SHADOW', 'GHOST', 'SILENT', 'DARK', 'NEON', 'PIXEL', 'CYBER', 'VOID',
  'STORM', 'IRON', 'STEEL', 'FROST', 'BLAZE', 'NIGHT', 'LUNAR', 'SOLAR',
  'ACID', 'NOVA', 'ROGUE', 'PHANTOM', 'VIPER', 'BLADE', 'TOXIC', 'ALPHA',
];

const NOUNS = [
  'WOLF', 'HAWK', 'SNAKE', 'RAVEN', 'VIPER', 'LYNX', 'BEAR', 'EAGLE',
  'TIGER', 'SHARK', 'HORNET', 'COBRA', 'PANTHER', 'FALCON', 'JACKAL', 'FOX',
  'SPIDER', 'MANTIS', 'DRAGON', 'HYDRA', 'KRAKEN', 'PHOENIX', 'SPECTER', 'WRAITH',
];

export function generateCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${adj}-${noun}-${num}-${suffix}`;
}

export function formatCodename(codename: string): string {
  return codename.toUpperCase();
}

export function getCodenameColor(codename: string): string {
  const hash = codename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#ffd700', '#00ffff', '#b44fff', '#44ff44', '#ff9944'];
  return colors[hash % colors.length];
}
