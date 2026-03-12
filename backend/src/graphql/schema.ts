export const typeDefs = `#graphql
  type AnonSession {
    id: ID!
    codename: String!
    credibilityScore: Int!
    earnings: Float!
    createdAt: String!
  }

  type Secret {
    id: ID!
    category: SecretCategory!
    content: String
    hintText: String
    isGhost: Boolean!
    peekPrice: Float
    unlockPrice: Float
    status: SecretStatus!
    rankScore: Float!
    voteCount: Int!
    reactionCount: Int!
    shareCount: Int!
    peekCount: Int!
    reportCount: Int!
    commentCount: Int!
    aiExplosiveScore: Float
    poolDate: String
    createdAt: String!
    hasVoted: Boolean!
    hasPeeked: Boolean!
    hasUnlocked: Boolean!
    codename: String
    bowl: Bowl
    mediaUrl: String
    mediaType: String
    linkUrl: String
    linkTitle: String
    linkDomain: String
  }

  type Bowl {
    id: ID!
    slug: String!
    name: String!
    description: String
    coverEmoji: String!
    isPrivate: Boolean!
    entryFee: Float
    memberCount: Int!
    secretCount: Int!
    createdAt: String!
    isMember: Boolean!
  }

  type DailyPool {
    id: ID!
    poolDate: String!
    totalAmount: Float!
    status: PoolStatus!
    entryCount: Int!
    timeUntilDrawMs: Float!
  }

  type Comment {
    id: ID!
    content: String!
    codename: String!
    createdAt: String!
    parentId: ID
    replies: [Comment!]!
  }

  type HallOfFameEntry {
    id: ID!
    codename: String!
    winDate: String!
    prizeAmount: Float!
    rankScore: Float!
    snippet: String!
    category: SecretCategory!
  }

  type VotePayload {
    secretId: ID!
    voteCount: Int!
    rankScore: Float!
    hasVoted: Boolean!
  }

  type PaymentIntentPayload {
    clientSecret: String!
    amount: Int!
    currency: String!
  }

  type SecretConnection {
    items: [Secret!]!
    nextCursor: String
    total: Int
  }

  type BowlConnection {
    items: [Bowl!]!
    nextCursor: String
  }

  type HallOfFameConnection {
    items: [HallOfFameEntry!]!
    nextCursor: String
  }

  type Payout {
    id: ID!
    amount: Float!
    method: String!
    status: String!
    createdAt: String!
  }

  enum SecretCategory {
    CORPORATE
    POLITICAL
    CELEBRITY
    PERSONAL
    INDUSTRY
    PARANORMAL
    ZERO_DAY
  }

  enum SecretStatus {
    PENDING
    ACTIVE
    GHOST_LOCKED
    REJECTED
    WINNER
    ARCHIVED
  }

  enum PoolStatus {
    OPEN
    CALCULATING
    SETTLED
  }

  input SubmitSecretInput {
    category: SecretCategory!
    content: String!
    hintText: String
    isGhost: Boolean!
    peekPrice: Float
    unlockPrice: Float
    bowlId: String
    bowlSlug: String
    paymentIntentId: String!
    mediaUrl: String
    mediaType: String
    linkUrl: String
    linkTitle: String
    linkDomain: String
  }

  input CreateBowlInput {
    name: String!
    description: String
    coverEmoji: String
    isPrivate: Boolean
    entryFee: Float
  }

  type LeaderboardEntry {
    rank: Int!
    secret: Secret!
    score: Float!
  }

  type Query {
    me: AnonSession
    feed(date: String, category: SecretCategory, sort: String, cursor: String, limit: Int, ghostOnly: Boolean, bowlSlug: String): SecretConnection!
    secret(id: ID!): Secret
    mySecrets(cursor: String, limit: Int): SecretConnection!
    leaderboard(date: String, limit: Int): [LeaderboardEntry!]!
    hallOfFame(cursor: String, limit: Int): HallOfFameConnection!
    currentPool: DailyPool!
    dailyPool: DailyPool!
    poolHistory(limit: Int): [DailyPool!]!
    bowls(cursor: String, limit: Int, isPrivate: Boolean): BowlConnection!
    bowl(slug: String!): Bowl
    comments(secretId: ID!, cursor: String, limit: Int): [Comment!]!
    myPayouts: [Payout!]!
  }

  type Mutation {
    createSession: AnonSession!
    submitSecret(input: SubmitSecretInput!): Secret!
    voteSecret(id: ID!): VotePayload!
    removeVote(id: ID!): VotePayload!
    addReaction(secretId: ID!, emoji: String!): Boolean!
    reportSecret(id: ID!, reason: String!): Boolean!
    shareSecret(id: ID!): Boolean!
    addComment(secretId: ID!, content: String!, parentId: ID): Comment!
    initiatePeek(secretId: ID!, type: String!): PaymentIntentPayload!
    confirmPeek(secretId: ID!, txId: String!, type: String!): Secret!
    createBowl(input: CreateBowlInput!): Bowl!
    joinBowl(bowlId: ID!, txId: String): BowlMembership!
    requestPayout(amount: Float!, method: String!, destination: String!): Payout!
  }

  type BowlMembership {
    bowlId: ID!
    joinedAt: String!
  }
`;
