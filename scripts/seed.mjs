/**
 * Seed the Wall with sample confessions so a fresh install is not an empty room.
 *
 * Run with: npm run db:seed
 * Safe to re-run - it clears previously seeded rows first.
 */

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const SEEDS = [
  ['confession', "I have been pretending to understand my job for two years. Every meeting I nod and then spend the night working out what everyone meant.", 0],
  ['regret', 'My grandmother called three times the week she died and I kept meaning to call back after work. I still have her last voicemail and I have never played it.', 3],
  ['crush', 'We have been friends for nine years. I rehearsed telling her at the wedding, at the airport, at her birthday. I will probably rehearse it forever.', 5],
  ['fear', 'Everyone thinks I am the strong one in my family. I have not slept properly since March and I do not know who I would even tell.', 4],
  ['joy', 'A stranger complimented my jacket on a terrible Tuesday and I have thought about it every week since. That is all it took.', 1],
  ['rage', 'I smiled through eight months of him taking credit for my work. When I finally got the promotion he told people he had mentored me into it.', 2],
  ['confession', 'I am the one who left the anonymous note. I have watched them try to work out who it was for a year and I have said nothing.', 0],
  ['regret', 'I was so busy documenting my son learning to walk that I watched most of it through a screen. I cannot get that afternoon back.', 3],
  ['fear', 'I got the results last Friday. I have not told my partner because the moment I say it out loud, it becomes the thing that is happening to us.', 4],
  ['crush', 'He makes me laugh in a way I have not been able to explain to my therapist without crying, which is probably the whole answer.', 5],
  ['joy', 'I quit on a Tuesday with nothing lined up and no plan. Six months on it is still the best decision I have ever made.', 1],
  ['confession', "I have read every message in the group chat and never replied to any of them. They think I'm busy. I just do not know how to come back after this long.", 0],
  ['rage', 'She told everyone my diagnosis at a dinner party like it was an interesting fact about her.', 2],
  ['regret', 'I was nineteen and I said something unforgivable to protect my own pride. He never spoke to me again and he was right not to.', 3],
  ['fear', 'My whole personality is being the reliable one. I am terrified of what is left if I ever stop.', 4],
  ['confession', 'I go to the cemetery on my lunch break and talk to my dad about work problems. He would have found that hilarious.', 0],
  ['joy', 'Eleven months sober today. Nobody in my life knows there was ever a problem, so nobody knows to say well done. So: well done, me.', 1],
  ['crush', 'I take the later train so I am on the same carriage. We have never spoken. I hope we never do, honestly - I like it better as a possibility.', 5],
  ['rage', 'I did everything they asked, for years, and they made the decision in a ten-minute meeting I was not invited to.', 2],
  ['regret', 'I told her I was fine so convincingly that she stopped asking. That is the part I cannot forgive myself for.', 3],
];

/** Same gravity curve as src/lib/heat.ts, duplicated to keep the seed dependency-free. */
function heat({ reactions, ageHours }) {
  const engagement = 1 + reactions;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

async function main() {
  const existing = await prisma.wallSecret.count();
  console.log(`Wall currently holds ${existing} secrets.`);

  await prisma.report.deleteMany({});
  await prisma.wallSecret.deleteMany({});

  const now = Date.now();

  for (let i = 0; i < SEEDS.length; i++) {
    const [mood, body, palette] = SEEDS[i];

    // Spread across the last five days so the hot/new split is visible.
    const ageHours = 0.5 + i * 5.5;
    const createdAt = new Date(now - ageHours * 3_600_000);

    const reactFelt = Math.floor(Math.random() * 90) + 4;
    const reactHug = Math.floor(Math.random() * 60);
    const reactWhoa = Math.floor(Math.random() * 40);
    const reactSame = Math.floor(Math.random() * 120);
    const viewCount = (reactFelt + reactHug + reactWhoa + reactSame) * (6 + Math.floor(Math.random() * 14));

    const weighted = reactFelt * 1.5 + reactHug * 2 + reactWhoa * 1.2 + reactSame + viewCount * 0.05;

    await prisma.wallSecret.create({
      data: {
        body,
        mood,
        palette,
        authorTokenHash: createHash('sha256').update(randomBytes(32)).digest('base64'),
        reactFelt,
        reactHug,
        reactWhoa,
        reactSame,
        viewCount,
        createdAt,
        heat: heat({ reactions: weighted, ageHours }),
      },
    });
  }

  console.log(`Seeded ${SEEDS.length} secrets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
