/**
 * Every behavioural threshold in one place (spec LR-10). Domain functions take
 * a `Tuning` argument so tests can vary these without touching globals.
 */
export const tuning = {
  swipe: {
    /** Fraction of card width a horizontal drag must pass to commit. */
    commitX: 0.3,
    /** Fraction of card height an upward drag must pass to commit. */
    commitUp: 0.25,
    /** Fraction of screen width a left drag must pass to become Never. */
    neverX: 0.6,
    /** Flick speed (px/s) that commits a swipe short of the threshold. */
    flickVelocity: 600,
    /** Movement (px) under which a pointer gesture counts as a tap. */
    tapSlop: 8,
    /** Hold time (ms) on the Nah button that records Never. */
    longPressMs: 550,
  },
  session: {
    /** Idle time after which opening the app starts a new session. */
    idleMs: 3 * 60 * 60 * 1000,
  },
  learning: {
    /** Nahs (in distinct sessions) with no likes before a dish retires. */
    retireAfterNahSessions: 2,
    /** Sessions with a like (and no Nah since) before a dish is a staple. */
    stapleAfterLikedSessions: 2,
    /** Max share of a session's cards that may be re-shows. */
    maxReshowShare: 0.2,
  },
  batches: {
    initialAngles: [
      'beloved classics people make again and again',
      'bold global flavours from a mix of cuisines',
      'quick and easy, ready in 30 minutes or less',
      'seasonal dishes that suit this time of year',
      'a few unexpected ideas worth discovering',
    ],
    initialPerAngle: 10,
    /**
     * A small extra batch sent with the initial burst. Generation time scales
     * with output, so 4 dishes arrive in about half the time of 10.
     */
    quickStart: { angle: 'crowd-pleasing favourites almost everyone enjoys', count: 4 },
    followUpSize: 10,
    followUpParallel: 2,
    /** Verdicts in a meal after which a follow-up batch is requested. */
    refetchAfterVerdicts: 10,
    /** Queue length under which a follow-up batch is requested. */
    lowWater: 8,
    /** Share of a follow-up batch that should be close to known likes. */
    exploitShare: 0.7,
    requestTimeoutMs: 120_000,
  },
  brief: {
    maxSignals: 12,
    maxAvoidTitles: 60,
  },
  image: {
    loadTimeoutMs: 4000,
  },
} as const;

export type Tuning = typeof tuning;
