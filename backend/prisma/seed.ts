import { PrismaClient, SecretCategory, SecretStatus, PayoutMethod, PayoutStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database...');

  // Clean up existing data in order
  await prisma.hallOfFameEntry.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.poolEntry.deleteMany();
  await prisma.dailyPool.deleteMany();
  await prisma.report.deleteMany();
  await prisma.peek.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.bowlMembership.deleteMany();
  await prisma.secret.deleteMany();
  await prisma.bowl.deleteMany();
  await prisma.anonSession.deleteMany();

  // Create 5 sessions
  const sessionData = [
    { codename: 'GHOST-1337-X', token: generateToken() },
    { codename: 'GHOST-4242-Z', token: generateToken() },
    { codename: 'GHOST-7777-Q', token: generateToken() },
    { codename: 'GHOST-2048-M', token: generateToken() },
    { codename: 'GHOST-9001-R', token: generateToken() },
  ];

  const sessions = await Promise.all(
    sessionData.map((s, i) =>
      prisma.anonSession.create({
        data: {
          codename: s.codename,
          tokenHash: hashToken(s.token),
          credibilityScore: 80 + i * 5,
          earnings: i === 0 ? 142.5 : i === 1 ? 89.0 : 0,
          ipRegion: ['US-CA', 'US-NY', 'GB-LND', 'DE-BER', 'JP-TKY'][i],
        },
      })
    )
  );

  console.log(`Created ${sessions.length} sessions`);

  // Create 3 bowls
  const bowls = await Promise.all([
    prisma.bowl.create({
      data: {
        slug: 'tech-leaks-abc123',
        name: 'Tech Leaks',
        description: 'Secrets from the world of technology and startups',
        coverEmoji: '💻',
        isPrivate: false,
        creatorSessionId: sessions[0].id,
        memberCount: 3,
        secretCount: 0,
      },
    }),
    prisma.bowl.create({
      data: {
        slug: 'dc-whispers-def456',
        name: 'DC Whispers',
        description: 'Political secrets and government leaks',
        coverEmoji: '🏛️',
        isPrivate: false,
        entryFee: 4.99,
        creatorSessionId: sessions[1].id,
        memberCount: 2,
        secretCount: 0,
      },
    }),
    prisma.bowl.create({
      data: {
        slug: 'celebrity-vault-ghi789',
        name: 'Celebrity Vault',
        description: 'What really happens behind closed doors',
        coverEmoji: '⭐',
        isPrivate: true,
        entryFee: 9.99,
        creatorSessionId: sessions[2].id,
        memberCount: 1,
        secretCount: 0,
      },
    }),
  ]);

  console.log(`Created ${bowls.length} bowls`);

  // Create bowl memberships
  await prisma.bowlMembership.createMany({
    data: [
      { bowlId: bowls[0].id, sessionId: sessions[0].id },
      { bowlId: bowls[0].id, sessionId: sessions[1].id },
      { bowlId: bowls[0].id, sessionId: sessions[2].id },
      { bowlId: bowls[1].id, sessionId: sessions[1].id },
      { bowlId: bowls[1].id, sessionId: sessions[3].id },
      { bowlId: bowls[2].id, sessionId: sessions[2].id },
    ],
    skipDuplicates: true,
  });

  // Create daily pools
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = daysAgo(1);
  const twoDaysAgo = daysAgo(2);

  const [poolToday, poolYesterday, poolTwoDaysAgo] = await Promise.all([
    prisma.dailyPool.create({
      data: {
        poolDate: today,
        totalAmount: 0,
        status: 'OPEN',
      },
    }),
    prisma.dailyPool.create({
      data: {
        poolDate: yesterday,
        totalAmount: 247.5,
        status: 'SETTLED',
        settledAt: new Date(yesterday.getTime() + 23 * 60 * 60 * 1000 + 58 * 60 * 1000),
      },
    }),
    prisma.dailyPool.create({
      data: {
        poolDate: twoDaysAgo,
        totalAmount: 189.0,
        status: 'SETTLED',
        settledAt: new Date(twoDaysAgo.getTime() + 23 * 60 * 60 * 1000 + 58 * 60 * 1000),
      },
    }),
  ]);

  console.log('Created daily pools');

  // Create 20 secrets across categories
  const secretsData = [
    // Today's secrets
    {
      sessionId: sessions[0].id,
      category: SecretCategory.CORPORATE,
      content: 'A major tech giant is planning to lay off 15% of its workforce next quarter but has been telling investors everything is fine. The internal memo was sent to executives only.',
      hintText: 'Think FAANG. Think layoffs. Think Q1 2026.',
      isGhost: false,
      peekPrice: 0.99,
      unlockPrice: 4.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 85.5,
      aiModerationScore: 92.0,
      rankScore: 42.3,
      voteCount: 89,
      reactionCount: 45,
      commentCount: 12,
      peekCount: 34,
      unlockCount: 8,
      shareCount: 23,
      bowlId: bowls[0].id,
    },
    {
      sessionId: sessions[1].id,
      category: SecretCategory.POLITICAL,
      content: 'A sitting senator has been secretly meeting with foreign lobbyists for months. The meetings are not disclosed and payments are routed through shell companies in three different countries.',
      hintText: 'Follow the money. Three countries. Two initials.',
      isGhost: false,
      peekPrice: 1.99,
      unlockPrice: 9.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 91.2,
      aiModerationScore: 88.5,
      rankScore: 38.7,
      voteCount: 76,
      reactionCount: 38,
      commentCount: 19,
      peekCount: 28,
      unlockCount: 5,
      shareCount: 41,
      bowlId: bowls[1].id,
    },
    {
      sessionId: sessions[2].id,
      category: SecretCategory.CELEBRITY,
      content: 'A beloved Hollywood A-lister has been using a body double for red carpet events for the past two years due to a serious health condition their publicist has been hiding.',
      hintText: 'Red carpets. Body double. Major awards circuit regular.',
      isGhost: true,
      peekPrice: 2.49,
      unlockPrice: 12.99,
      status: SecretStatus.GHOST_LOCKED,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 78.9,
      aiModerationScore: 95.0,
      rankScore: 31.2,
      voteCount: 54,
      reactionCount: 67,
      commentCount: 8,
      peekCount: 41,
      unlockCount: 12,
      shareCount: 18,
      bowlId: bowls[2].id,
    },
    {
      sessionId: sessions[3].id,
      category: SecretCategory.INDUSTRY,
      content: 'A pharmaceutical giant buried clinical trial data showing their blockbuster drug has significantly worse side effects than disclosed to the FDA. Three researchers resigned over this.',
      hintText: 'Big Pharma. Buried data. Three resignations.',
      isGhost: false,
      peekPrice: 2.99,
      unlockPrice: 14.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 94.7,
      aiModerationScore: 85.0,
      rankScore: 28.9,
      voteCount: 43,
      reactionCount: 29,
      commentCount: 7,
      peekCount: 19,
      unlockCount: 3,
      shareCount: 15,
    },
    {
      sessionId: sessions[4].id,
      category: SecretCategory.PARANORMAL,
      content: 'I work at a national laboratory and we have confirmed anomalous aerial phenomena that defy known physics. The cover story given to us is weather balloons but that explanation does not hold up.',
      hintText: 'National lab. Not weather balloons. Physics breaking.',
      isGhost: false,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 72.3,
      aiModerationScore: 90.0,
      rankScore: 22.1,
      voteCount: 31,
      reactionCount: 52,
      commentCount: 21,
      peekCount: 9,
      unlockCount: 1,
      shareCount: 34,
    },
    {
      sessionId: sessions[0].id,
      category: SecretCategory.ZERO_DAY,
      content: 'I discovered a critical vulnerability in widely-used authentication middleware that affects millions of applications. The vendor has been notified but has not patched it in over 90 days.',
      hintText: 'Auth middleware. 90 day disclosure. Millions affected.',
      isGhost: false,
      peekPrice: 4.99,
      unlockPrice: 24.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 97.1,
      aiModerationScore: 82.0,
      rankScore: 25.6,
      voteCount: 38,
      reactionCount: 41,
      commentCount: 15,
      peekCount: 22,
      unlockCount: 4,
      shareCount: 27,
    },
    {
      sessionId: sessions[1].id,
      category: SecretCategory.PERSONAL,
      content: 'My CEO faked his Harvard degree on his resume. HR discovered it three years ago and was paid off to stay quiet. His real credentials are from an unaccredited online college.',
      hintText: 'CEO. Fake degree. HR knows.',
      isGhost: false,
      peekPrice: 0.99,
      unlockPrice: 4.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 68.4,
      aiModerationScore: 93.0,
      rankScore: 19.8,
      voteCount: 27,
      reactionCount: 18,
      commentCount: 4,
      peekCount: 14,
      unlockCount: 2,
      shareCount: 9,
    },
    // Yesterday's secrets (settled pool)
    {
      sessionId: sessions[2].id,
      category: SecretCategory.CORPORATE,
      content: 'A unicorn startup has been artificially inflating user metrics for their Series C pitch. The actual DAU is 40% of what they are telling investors. The CFO knows and is looking for an exit.',
      hintText: 'Unicorn. Series C. Inflated DAU.',
      isGhost: false,
      peekPrice: 1.49,
      unlockPrice: 7.99,
      status: SecretStatus.WINNER,
      poolDate: yesterday,
      entryFeePaid: 1.99,
      aiExplosiveScore: 88.6,
      aiModerationScore: 91.0,
      rankScore: 67.4,
      voteCount: 234,
      reactionCount: 178,
      commentCount: 47,
      peekCount: 89,
      unlockCount: 23,
      shareCount: 112,
    },
    {
      sessionId: sessions[3].id,
      category: SecretCategory.POLITICAL,
      content: 'A city mayor has been steering municipal contracts to companies owned by family members through intermediaries. The audit team flagged it but the report was quietly shelved.',
      hintText: 'City mayor. Family contracts. Shelved audit.',
      isGhost: false,
      status: SecretStatus.ARCHIVED,
      poolDate: yesterday,
      entryFeePaid: 1.99,
      aiExplosiveScore: 82.3,
      aiModerationScore: 87.0,
      rankScore: 44.1,
      voteCount: 156,
      reactionCount: 89,
      commentCount: 31,
      peekCount: 42,
      unlockCount: 7,
      shareCount: 67,
    },
    {
      sessionId: sessions[4].id,
      category: SecretCategory.INDUSTRY,
      content: 'Multiple food safety violations at a major fast food chain have been covered up through aggressive legal settlements with former employees who tried to go public.',
      isGhost: false,
      status: SecretStatus.ARCHIVED,
      poolDate: yesterday,
      entryFeePaid: 1.99,
      aiExplosiveScore: 76.8,
      aiModerationScore: 94.0,
      rankScore: 35.7,
      voteCount: 112,
      reactionCount: 67,
      commentCount: 18,
      shareCount: 45,
    },
    {
      sessionId: sessions[0].id,
      category: SecretCategory.CELEBRITY,
      content: 'A Grammy-winning artist has been using AI-generated vocals mixed with live performance for their last two world tours. Sound engineers are under NDA.',
      hintText: 'Grammy winner. AI vocals. World tour.',
      isGhost: true,
      peekPrice: 1.99,
      unlockPrice: 9.99,
      status: SecretStatus.ARCHIVED,
      poolDate: yesterday,
      entryFeePaid: 1.99,
      aiExplosiveScore: 81.5,
      aiModerationScore: 96.0,
      rankScore: 29.3,
      voteCount: 88,
      reactionCount: 134,
      commentCount: 22,
      peekCount: 56,
      unlockCount: 18,
      shareCount: 73,
    },
    // Two days ago secrets
    {
      sessionId: sessions[1].id,
      category: SecretCategory.CORPORATE,
      content: 'A major bank is quietly stress-testing a bankruptcy scenario. The board knows about significant exposure to a foreign real estate collapse that regulators have not yet discovered.',
      isGhost: false,
      peekPrice: 3.99,
      unlockPrice: 19.99,
      status: SecretStatus.WINNER,
      poolDate: twoDaysAgo,
      entryFeePaid: 1.99,
      aiExplosiveScore: 96.3,
      aiModerationScore: 83.0,
      rankScore: 71.8,
      voteCount: 312,
      reactionCount: 201,
      commentCount: 67,
      peekCount: 134,
      unlockCount: 41,
      shareCount: 189,
    },
    {
      sessionId: sessions[2].id,
      category: SecretCategory.PARANORMAL,
      content: 'I was part of a classified project studying recovered materials of unknown origin. The metallurgical analysis showed isotope ratios incompatible with any known manufacturing process on Earth.',
      hintText: 'Classified project. Unknown metallurgy. Off-world ratios.',
      isGhost: false,
      peekPrice: 2.49,
      unlockPrice: 12.99,
      status: SecretStatus.ARCHIVED,
      poolDate: twoDaysAgo,
      entryFeePaid: 1.99,
      aiExplosiveScore: 89.7,
      aiModerationScore: 88.0,
      rankScore: 52.4,
      voteCount: 198,
      reactionCount: 245,
      commentCount: 54,
      peekCount: 78,
      unlockCount: 19,
      shareCount: 143,
    },
    {
      sessionId: sessions[3].id,
      category: SecretCategory.ZERO_DAY,
      content: 'There is an unpatched RCE vulnerability in a popular open-source database used by most Fortune 500 companies. The researcher who found it was offered a quiet acquisition deal to stay silent.',
      isGhost: false,
      peekPrice: 5.99,
      unlockPrice: 29.99,
      status: SecretStatus.ARCHIVED,
      poolDate: twoDaysAgo,
      entryFeePaid: 1.99,
      aiExplosiveScore: 95.1,
      aiModerationScore: 80.0,
      rankScore: 41.9,
      voteCount: 143,
      reactionCount: 89,
      commentCount: 28,
      peekCount: 67,
      unlockCount: 14,
      shareCount: 91,
    },
    {
      sessionId: sessions[4].id,
      category: SecretCategory.PERSONAL,
      content: 'A well-known venture capitalist has been operating a shadow fund investing in competitors of their portfolio companies. The LPs have no idea this conflict of interest exists.',
      isGhost: false,
      status: SecretStatus.ARCHIVED,
      poolDate: twoDaysAgo,
      entryFeePaid: 1.99,
      aiExplosiveScore: 73.9,
      aiModerationScore: 90.0,
      rankScore: 28.6,
      voteCount: 89,
      reactionCount: 45,
      commentCount: 13,
      shareCount: 34,
    },
    // Additional active secrets today with no votes yet
    {
      sessionId: sessions[0].id,
      category: SecretCategory.INDUSTRY,
      content: 'An electric vehicle manufacturer is hiding battery degradation data that shows their flagship model loses significantly more range over time than advertised. The warranty claims are being quietly settled.',
      isGhost: false,
      peekPrice: 1.99,
      unlockPrice: 8.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 82.4,
      aiModerationScore: 91.0,
      rankScore: 12.3,
      voteCount: 14,
      reactionCount: 8,
      commentCount: 2,
      shareCount: 5,
    },
    {
      sessionId: sessions[1].id,
      category: SecretCategory.POLITICAL,
      content: 'A regulatory agency chief has been meeting privately with the CEOs of the companies they are supposed to regulate before issuing any enforcement actions, giving them advance warning.',
      isGhost: false,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 86.1,
      aiModerationScore: 89.0,
      rankScore: 8.7,
      voteCount: 8,
      reactionCount: 11,
      commentCount: 1,
      shareCount: 3,
    },
    {
      sessionId: sessions[2].id,
      category: SecretCategory.CORPORATE,
      content: 'A social media platform is secretly boosting engagement metrics by including bot interactions in their reported numbers. Advertisers are paying for reach that is 30% artificial.',
      hintText: 'Social media. Bots. Advertiser fraud.',
      isGhost: false,
      peekPrice: 0.99,
      unlockPrice: 4.99,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 79.6,
      aiModerationScore: 93.0,
      rankScore: 6.4,
      voteCount: 6,
      reactionCount: 4,
      commentCount: 0,
      shareCount: 2,
    },
    {
      sessionId: sessions[3].id,
      category: SecretCategory.CELEBRITY,
      content: 'Two of the biggest feuding celebrities have actually been secretly dating for eighteen months. The feud is entirely manufactured by their shared PR agency to keep both of them in the headlines.',
      hintText: 'Fake feud. Shared PR agency. Actually dating.',
      isGhost: false,
      status: SecretStatus.ACTIVE,
      poolDate: today,
      entryFeePaid: 1.99,
      aiExplosiveScore: 69.8,
      aiModerationScore: 97.0,
      rankScore: 4.2,
      voteCount: 4,
      reactionCount: 9,
      commentCount: 0,
      shareCount: 1,
    },
    {
      sessionId: sessions[4].id,
      category: SecretCategory.PERSONAL,
      content: 'I found evidence my company has been systematically underpaying women by routing compensation data through a subsidiary to obscure the pay gap from auditors and the media.',
      isGhost: false,
      status: SecretStatus.PENDING,
      poolDate: today,
      entryFeePaid: 1.99,
      rankScore: 0,
      voteCount: 0,
    },
  ];

  const secrets = await Promise.all(
    secretsData.map((s) =>
      prisma.secret.create({
        data: s as any,
      })
    )
  );

  console.log(`Created ${secrets.length} secrets`);

  // Update bowl secret counts
  await prisma.bowl.update({ where: { id: bowls[0].id }, data: { secretCount: 2 } });
  await prisma.bowl.update({ where: { id: bowls[1].id }, data: { secretCount: 2 } });
  await prisma.bowl.update({ where: { id: bowls[2].id }, data: { secretCount: 1 } });

  // Create pool entries for today's active secrets
  const todayActiveSecrets = secrets.filter(
    (s) =>
      s.status === SecretStatus.ACTIVE &&
      s.poolDate?.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  );

  let todayPoolTotal = 0;
  for (const secret of todayActiveSecrets) {
    await prisma.poolEntry.create({
      data: {
        poolId: poolToday.id,
        secretId: secret.id,
        entryFee: Number(secret.entryFeePaid),
        peekFees: secret.peekCount > 0 ? Number(secret.peekPrice ?? 0) * Math.floor(secret.peekCount / 2) : 0,
      },
    });
    todayPoolTotal += Number(secret.entryFeePaid);
  }

  await prisma.dailyPool.update({
    where: { id: poolToday.id },
    data: { totalAmount: todayPoolTotal },
  });

  // Pool entries for yesterday
  const yesterdaySecrets = secrets.filter(
    (s) =>
      s.poolDate?.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]
  );

  const winnerYesterday = yesterdaySecrets.find((s) => s.status === SecretStatus.WINNER);

  for (const secret of yesterdaySecrets) {
    await prisma.poolEntry.create({
      data: {
        poolId: poolYesterday.id,
        secretId: secret.id,
        entryFee: 1.99,
        peekFees: 0,
      },
    });
  }

  if (winnerYesterday) {
    await prisma.dailyPool.update({
      where: { id: poolYesterday.id },
      data: {
        winnerSecretId: winnerYesterday.id,
        winnerPayout: 247.5 * 0.7,
      },
    });
  }

  // Pool entries for two days ago
  const twoDaysAgoSecrets = secrets.filter(
    (s) =>
      s.poolDate?.toISOString().split('T')[0] === twoDaysAgo.toISOString().split('T')[0]
  );

  const winnerTwoDaysAgo = twoDaysAgoSecrets.find((s) => s.status === SecretStatus.WINNER);

  for (const secret of twoDaysAgoSecrets) {
    await prisma.poolEntry.create({
      data: {
        poolId: poolTwoDaysAgo.id,
        secretId: secret.id,
        entryFee: 1.99,
        peekFees: 0,
      },
    });
  }

  if (winnerTwoDaysAgo) {
    await prisma.dailyPool.update({
      where: { id: poolTwoDaysAgo.id },
      data: {
        winnerSecretId: winnerTwoDaysAgo.id,
        winnerPayout: 189.0 * 0.7,
      },
    });
  }

  console.log('Created pool entries');

  // Create votes for today's top secret
  const topSecret = secrets[0]; // Corporate secret with most votes
  const voteSessionIds = [sessions[1].id, sessions[2].id, sessions[3].id, sessions[4].id];

  await prisma.vote.createMany({
    data: voteSessionIds.map((sessionId) => ({
      secretId: topSecret.id,
      sessionId,
    })),
    skipDuplicates: true,
  });

  // Votes for second secret
  await prisma.vote.createMany({
    data: [sessions[0].id, sessions[2].id, sessions[4].id].map((sessionId) => ({
      secretId: secrets[1].id,
      sessionId,
    })),
    skipDuplicates: true,
  });

  // Reactions for top secret
  await prisma.reaction.createMany({
    data: [
      { secretId: topSecret.id, sessionId: sessions[1].id, emoji: '🔥' },
      { secretId: topSecret.id, sessionId: sessions[2].id, emoji: '🤯' },
      { secretId: topSecret.id, sessionId: sessions[3].id, emoji: '💀' },
      { secretId: topSecret.id, sessionId: sessions[4].id, emoji: '👀' },
      { secretId: secrets[1].id, sessionId: sessions[0].id, emoji: '🔥' },
      { secretId: secrets[1].id, sessionId: sessions[2].id, emoji: '😱' },
    ],
    skipDuplicates: true,
  });

  // Comments
  await prisma.comment.createMany({
    data: [
      {
        secretId: topSecret.id,
        sessionId: sessions[1].id,
        content: 'This is massive if true. I work in the industry and this lines up.',
      },
      {
        secretId: topSecret.id,
        sessionId: sessions[2].id,
        content: 'I heard whispers about this six months ago. Someone is going to regret not acting sooner.',
      },
      {
        secretId: topSecret.id,
        sessionId: sessions[3].id,
        content: 'The stock already moved slightly yesterday. Insiders know.',
      },
      {
        secretId: secrets[1].id,
        sessionId: sessions[0].id,
        content: 'The paper trail on this one is going to be devastating when it surfaces.',
      },
    ],
  });

  console.log('Created votes, reactions, and comments');

  // Hall of Fame entries for settled pools
  const hallOfFameData = [
    {
      secretId: winnerYesterday?.id ?? secrets[7].id,
      codename: sessions[2].codename,
      winDate: yesterday,
      prizeAmount: 247.5 * 0.7,
      rankScore: 67.4,
      snippet: 'A unicorn startup has been artificially inflating user metrics for their Series C pitch...',
      category: SecretCategory.CORPORATE,
    },
    {
      secretId: winnerTwoDaysAgo?.id ?? secrets[11].id,
      codename: sessions[1].codename,
      winDate: twoDaysAgo,
      prizeAmount: 189.0 * 0.7,
      rankScore: 71.8,
      snippet: 'A major bank is quietly stress-testing a bankruptcy scenario...',
      category: SecretCategory.CORPORATE,
    },
  ];

  await prisma.hallOfFameEntry.createMany({ data: hallOfFameData });

  console.log('Created Hall of Fame entries');

  // Create a payout for winner
  if (winnerYesterday) {
    await prisma.payout.create({
      data: {
        sessionId: sessions[2].id,
        amount: 247.5 * 0.7,
        currency: 'USD',
        method: PayoutMethod.PLATFORM_CREDIT,
        destination: `platform:${sessions[2].id}`,
        status: PayoutStatus.COMPLETED,
        settledAt: new Date(),
      },
    });

    // Update earnings
    await prisma.anonSession.update({
      where: { id: sessions[2].id },
      data: { earnings: { increment: 247.5 * 0.7 } },
    });
  }

  console.log('\n✅ Seed complete!');
  console.log(`   Sessions: ${sessions.length}`);
  console.log(`   Secrets:  ${secrets.length}`);
  console.log(`   Bowls:    ${bowls.length}`);
  console.log(`   Pools:    3 (today, yesterday, 2 days ago)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
