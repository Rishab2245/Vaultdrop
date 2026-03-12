export const CREATE_SESSION = `
  mutation CreateSession {
    createSession {
      id
      codename
      credibilityScore
      earnings
      createdAt
    }
  }
`;

export const SUBMIT_SECRET = `
  mutation SubmitSecret($input: SubmitSecretInput!) {
    submitSecret(input: $input) {
      id
      category
      isGhost
      status
      createdAt
      mediaUrl
      mediaType
      linkUrl
      linkTitle
      linkDomain
    }
  }
`;

export const VOTE_SECRET = `
  mutation VoteSecret($id: ID!) {
    voteSecret(id: $id) {
      secretId
      voteCount
      hasVoted
      rankScore
    }
  }
`;

export const UNVOTE_SECRET = `
  mutation RemoveVote($id: ID!) {
    removeVote(id: $id) {
      secretId
      voteCount
      hasVoted
      rankScore
    }
  }
`;

export const REACT_TO_SECRET = `
  mutation ReactToSecret($secretId: ID!, $emoji: String!) {
    addReaction(secretId: $secretId, emoji: $emoji)
  }
`;

export const CONFIRM_PEEK = `
  mutation ConfirmPeek($secretId: ID!, $txId: String!, $type: String!) {
    confirmPeek(secretId: $secretId, txId: $txId, type: $type) {
      id
      hintText
      content
      hasPeeked
      hasUnlocked
      peekCount
    }
  }
`;

export const ADD_COMMENT = `
  mutation AddComment($secretId: ID!, $content: String!, $parentId: ID) {
    addComment(secretId: $secretId, content: $content, parentId: $parentId) {
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

export const REPORT_SECRET = `
  mutation ReportSecret($id: ID!, $reason: String!) {
    reportSecret(id: $id, reason: $reason)
  }
`;

export const JOIN_BOWL = `
  mutation JoinBowl($bowlId: ID!) {
    joinBowl(bowlId: $bowlId) {
      bowlId
      joinedAt
    }
  }
`;
