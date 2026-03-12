export const GET_SECRETS_FEED = `
  query GetSecretsFeed($limit: Int, $cursor: String, $category: SecretCategory, $sort: String, $ghostOnly: Boolean, $bowlSlug: String) {
    feed(limit: $limit, cursor: $cursor, category: $category, sort: $sort, ghostOnly: $ghostOnly, bowlSlug: $bowlSlug) {
      items {
        id
        category
        content
        hintText
        isGhost
        peekPrice
        unlockPrice
        status
        rankScore
        voteCount
        reactionCount
        shareCount
        peekCount
        commentCount
        aiExplosiveScore
        poolDate
        createdAt
        hasVoted
        hasPeeked
        hasUnlocked
        codename
        mediaUrl
        mediaType
        linkUrl
        linkTitle
        linkDomain
        bowl {
          id
          slug
          name
          coverEmoji
        }
      }
      nextCursor
      total
    }
  }
`;

export const GET_SECRET_BY_ID = `
  query GetSecretById($id: ID!) {
    secret(id: $id) {
      id
      category
      content
      hintText
      isGhost
      peekPrice
      unlockPrice
      status
      rankScore
      voteCount
      reactionCount
      shareCount
      peekCount
      commentCount
      aiExplosiveScore
      poolDate
      createdAt
      hasVoted
      hasPeeked
      hasUnlocked
      codename
      mediaUrl
      mediaType
      linkUrl
      linkTitle
      linkDomain
      bowl {
        id
        slug
        name
        coverEmoji
        description
      }
    }
  }
`;

export const GET_DAILY_POOL = `
  query GetDailyPool {
    dailyPool {
      id
      poolDate
      totalAmount
      status
      entryCount
      timeUntilDrawMs
    }
  }
`;

export const GET_CURRENT_POOL = GET_DAILY_POOL;

export const GET_LEADERBOARD = `
  query GetLeaderboard($date: String, $limit: Int) {
    leaderboard(date: $date, limit: $limit) {
      rank
      score
      secret {
        id
        category
        content
        hintText
        isGhost
        voteCount
        rankScore
        createdAt
        codename
        status
      }
    }
  }
`;

export const GET_HALL_OF_FAME = `
  query GetHallOfFame($cursor: String, $limit: Int) {
    hallOfFame(cursor: $cursor, limit: $limit) {
      items {
        id
        codename
        winDate
        prizeAmount
        rankScore
        snippet
        category
      }
      nextCursor
    }
  }
`;

export const GET_BOWLS = `
  query GetBowls {
    bowls(limit: 50) {
      items {
        id
        slug
        name
        description
        coverEmoji
        isPrivate
        entryFee
        memberCount
        secretCount
        createdAt
        isMember
      }
      nextCursor
    }
  }
`;

export const GET_BOWL_BY_SLUG = `
  query GetBowlBySlug($slug: String!) {
    bowl(slug: $slug) {
      id
      slug
      name
      description
      coverEmoji
      isPrivate
      entryFee
      memberCount
      secretCount
      createdAt
      isMember
    }
  }
`;

export const GET_MY_VAULT = `
  query GetMyVault {
    me {
      id
      codename
      credibilityScore
      earnings
      createdAt
    }
    mySecrets(limit: 50) {
      items {
        id
        category
        content
        hintText
        isGhost
        status
        rankScore
        voteCount
        reactionCount
        peekCount
        commentCount
        createdAt
        poolDate
        peekPrice
        unlockPrice
      }
      total
    }
  }
`;

export const GET_COMMENTS = `
  query GetComments($secretId: ID!, $limit: Int, $cursor: String) {
    comments(secretId: $secretId, limit: $limit, cursor: $cursor) {
      id
      codename
      content
      createdAt
      parentId
      replies {
        id
        codename
        content
        createdAt
        parentId
        replies { id }
      }
    }
  }
`;
