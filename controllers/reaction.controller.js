import Reaction from '../models/reaction.model.js'

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

export const DEFAULT_ENTITIES = [
  // About WHTSIPA Page
  {
    entityId: 'ftc',
    page: 'about',
    name: 'Federal Trade Commission',
    abbr: 'FTC',
    role: 'Consumer Protection & Fraud Enforcement',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'uspis',
    page: 'about',
    name: 'US Postal Inspection Service',
    abbr: 'USPIS',
    role: 'Mail Fraud & Parcel Scam Investigation',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'interpol',
    page: 'about',
    name: 'INTERPOL',
    abbr: 'INTERPOL',
    role: 'International Cross-Border Cybercrime',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'cisa',
    page: 'about',
    name: 'Cybersecurity & Infrastructure Security Agency',
    abbr: 'CISA',
    role: 'National Cyber Infrastructure Protection',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'dhs',
    page: 'about',
    name: 'Department of Homeland Security',
    abbr: 'DHS',
    role: 'Counter Intelligence of Threats',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'fbi',
    page: 'about',
    name: 'FBI / Department of Justice',
    abbr: 'FBI',
    role: 'Cybercrime Investigation & IC3',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'usss',
    page: 'about',
    name: 'United States Secret Service',
    abbr: 'USSS',
    role: 'Financial Cybercrime & Access Device Fraud',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'irs',
    page: 'about',
    name: 'Internal Revenue Service',
    abbr: 'IRS',
    role: 'Tax Fraud & Financial Crime Investigation',
    boostLikes: 0,
    boostDislikes: 0,
  },
  // About Officials Page
  {
    entityId: 'equation',
    page: 'about-officials',
    name: 'The Equation Group',
    abbr: 'EQUATION',
    role: 'Nation-State Threat Actor',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'lazarus',
    page: 'about-officials',
    name: 'Lazarus Group',
    abbr: 'LAZARUS',
    role: 'Nation-State APT',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'apt29',
    page: 'about-officials',
    name: 'APT29 (Cozy Bear)',
    abbr: 'APT29',
    role: 'Nation-State APT',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'shadow-brokers',
    page: 'about-officials',
    name: 'The Shadow Brokers',
    abbr: 'SHADOW BROKERS',
    role: 'Exploit Broker / Threat Actor',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'virus',
    page: 'about-officials',
    name: 'Virus',
    abbr: 'VIRUS',
    role: 'Malware Development Group',
    boostLikes: 0,
    boostDislikes: 0,
  },
  {
    entityId: 'anonymous',
    page: 'about-officials',
    name: 'Anonymous',
    abbr: 'ANONYMOUS',
    role: 'Hacktivist Collective',
    boostLikes: 0,
    boostDislikes: 0,
  },
]

/**
 * Seed reactions collection with initial entities if empty or missing any entity.
 */
export async function seedReactionsIfEmpty() {
  try {
    for (const item of DEFAULT_ENTITIES) {
      const existing = await Reaction.findOne({ entityId: item.entityId })
      if (!existing) {
        await Reaction.create(item)
      }
    }
  } catch (err) {
    console.error('Error seeding reactions:', err)
  }
}

/**
 * Helper to process 2-week queued dislikes on a reaction doc
 */
function processDislikeQueue(doc) {
  if (!doc.queuedDislikes || doc.queuedDislikes <= 0) return false

  const now = Date.now()
  let modified = false

  if (!doc.lastDislikeReflectedAt) {
    doc.userDislikes = (doc.userDislikes || 0) + 1
    doc.queuedDislikes -= 1
    doc.lastDislikeReflectedAt = new Date(now)
    modified = true
  } else {
    const elapsed = now - new Date(doc.lastDislikeReflectedAt).getTime()
    if (elapsed >= TWO_WEEKS_MS) {
      const intervals = Math.floor(elapsed / TWO_WEEKS_MS)
      const toRelease = Math.min(intervals, doc.queuedDislikes)
      if (toRelease > 0) {
        doc.userDislikes = (doc.userDislikes || 0) + toRelease
        doc.queuedDislikes -= toRelease
        doc.lastDislikeReflectedAt = new Date(new Date(doc.lastDislikeReflectedAt).getTime() + (toRelease * TWO_WEEKS_MS))
        modified = true
      }
    }
  }

  return modified
}

/**
 * GET /api/reactions
 * Returns public likes and dislikes for all entities, plus the calling client's user reaction.
 */
export async function getReactions(req, res) {
  try {
    const clientKey = req.query.clientId || req.ip || 'anonymous'
    const reactions = await Reaction.find({})

    const response = {}

    for (const r of reactions) {
      if (processDislikeQueue(r)) {
        await r.save()
      }

      const userRec = (r.userRecords || []).find(rec => rec.clientKey === clientKey)

      response[r.entityId] = {
        entityId: r.entityId,
        page: r.page,
        name: r.name,
        abbr: r.abbr,
        totalLikes: r.totalLikes,
        totalDislikes: r.totalDislikes,
        userReaction: userRec ? userRec.action : null,
      }
    }

    return res.json(response)
  } catch (err) {
    console.error('Error fetching reactions:', err)
    return res.status(500).json({ message: 'Error retrieving reactions.' })
  }
}

/**
 * POST /api/reactions/:entityId
 * Body: { action: 'like' | 'dislike', clientId: string }
 */
export async function toggleReaction(req, res) {
  try {
    const { entityId } = req.params
    const { action, clientId } = req.body

    if (!action || !['like', 'dislike'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be like or dislike.' })
    }

    const clientKey = clientId || req.ip || 'anonymous'

    let reaction = await Reaction.findOne({ entityId: entityId.toLowerCase() })
    if (!reaction) {
      // Find template or create fallback
      const defaultEntity = DEFAULT_ENTITIES.find(e => e.entityId === entityId.toLowerCase())
      reaction = await Reaction.create({
        entityId: entityId.toLowerCase(),
        page: defaultEntity?.page || 'about',
        name: defaultEntity?.name || entityId,
        abbr: defaultEntity?.abbr || entityId.toUpperCase(),
        role: defaultEntity?.role || '',
        boostLikes: 0,
        boostDislikes: 0,
      })
    }

    processDislikeQueue(reaction)

    if (!reaction.userRecords) {
      reaction.userRecords = []
    }

    const existingIndex = reaction.userRecords.findIndex(r => r.clientKey === clientKey)
    const existingRec = existingIndex !== -1 ? reaction.userRecords[existingIndex] : null

    let finalUserReaction = null

    if (existingRec) {
      if (existingRec.action === action) {
        // Toggle OFF (User clicked the same button again)
        reaction.userRecords.splice(existingIndex, 1)

        if (action === 'like') {
          reaction.userLikes = Math.max(0, (reaction.userLikes || 0) - 1)
        } else if (action === 'dislike') {
          if (reaction.queuedDislikes > 0) {
            reaction.queuedDislikes -= 1
          } else {
            reaction.userDislikes = Math.max(0, (reaction.userDislikes || 0) - 1)
          }
        }
        finalUserReaction = null
      } else {
        // Switch reaction (e.g. from dislike to like, or like to dislike)
        const prevAction = existingRec.action
        reaction.userRecords[existingIndex].action = action
        reaction.userRecords[existingIndex].createdAt = new Date()

        // Remove previous action count
        if (prevAction === 'like') {
          reaction.userLikes = Math.max(0, (reaction.userLikes || 0) - 1)
        } else if (prevAction === 'dislike') {
          if (reaction.queuedDislikes > 0) {
            reaction.queuedDislikes -= 1
          } else {
            reaction.userDislikes = Math.max(0, (reaction.userDislikes || 0) - 1)
          }
        }

        // Apply new action count
        if (action === 'like') {
          reaction.userLikes = (reaction.userLikes || 0) + 1
        } else if (action === 'dislike') {
          const now = Date.now()
          const canReflect = !reaction.lastDislikeReflectedAt || (now - new Date(reaction.lastDislikeReflectedAt).getTime() >= TWO_WEEKS_MS)
          if (canReflect) {
            reaction.userDislikes = (reaction.userDislikes || 0) + 1
            reaction.lastDislikeReflectedAt = new Date(now)
          } else {
            reaction.queuedDislikes = (reaction.queuedDislikes || 0) + 1
          }
        }
        finalUserReaction = action
      }
    } else {
      // First time reacting
      reaction.userRecords.push({ clientKey, action, createdAt: new Date() })

      if (action === 'like') {
        reaction.userLikes = (reaction.userLikes || 0) + 1
      } else if (action === 'dislike') {
        const now = Date.now()
        const canReflect = !reaction.lastDislikeReflectedAt || (now - new Date(reaction.lastDislikeReflectedAt).getTime() >= TWO_WEEKS_MS)
        if (canReflect) {
          reaction.userDislikes = (reaction.userDislikes || 0) + 1
          reaction.lastDislikeReflectedAt = new Date(now)
        } else {
          reaction.queuedDislikes = (reaction.queuedDislikes || 0) + 1
        }
      }
      finalUserReaction = action
    }

    await reaction.save()

    return res.json({
      entityId: reaction.entityId,
      totalLikes: reaction.totalLikes,
      totalDislikes: reaction.totalDislikes,
      userReaction: finalUserReaction,
    })
  } catch (err) {
    console.error('Error toggling reaction:', err)
    return res.status(500).json({ message: 'Error processing reaction.' })
  }
}

/**
 * GET /api/admin/reactions
 * Admin full listing with boost amounts and queued stats
 */
export async function getAdminReactions(req, res) {
  try {
    const reactions = await Reaction.find({}).sort({ page: 1, entityId: 1 })

    for (const r of reactions) {
      if (processDislikeQueue(r)) {
        await r.save()
      }
    }

    const data = reactions.map(r => ({
      entityId: r.entityId,
      page: r.page,
      name: r.name,
      abbr: r.abbr,
      role: r.role,
      boostLikes: r.boostLikes || 0,
      userLikes: r.userLikes || 0,
      totalLikes: r.totalLikes,
      boostDislikes: r.boostDislikes || 0,
      userDislikes: r.userDislikes || 0,
      totalDislikes: r.totalDislikes,
      queuedDislikes: r.queuedDislikes || 0,
      lastDislikeReflectedAt: r.lastDislikeReflectedAt,
    }))

    return res.json(data)
  } catch (err) {
    console.error('Error in getAdminReactions:', err)
    return res.status(500).json({ message: 'Failed to fetch admin reactions.' })
  }
}

/**
 * PATCH /api/admin/reactions/:entityId
 * Admin edit boosts, manual counts, or queue reset
 */
export async function updateAdminReaction(req, res) {
  try {
    const { entityId } = req.params
    const { boostLikes, boostDislikes, userLikes, userDislikes, resetQueue } = req.body

    const reaction = await Reaction.findOne({ entityId: entityId.toLowerCase() })
    if (!reaction) {
      return res.status(404).json({ message: 'Entity reaction not found.' })
    }

    if (boostLikes !== undefined) reaction.boostLikes = Math.max(0, parseInt(boostLikes, 10) || 0)
    if (boostDislikes !== undefined) reaction.boostDislikes = Math.max(0, parseInt(boostDislikes, 10) || 0)
    if (userLikes !== undefined) reaction.userLikes = Math.max(0, parseInt(userLikes, 10) || 0)
    if (userDislikes !== undefined) reaction.userDislikes = Math.max(0, parseInt(userDislikes, 10) || 0)
    if (resetQueue === true) reaction.queuedDislikes = 0

    await reaction.save()

    return res.json({
      message: 'Reaction settings updated successfully.',
      data: {
        entityId: reaction.entityId,
        page: reaction.page,
        name: reaction.name,
        abbr: reaction.abbr,
        role: reaction.role,
        boostLikes: reaction.boostLikes,
        userLikes: reaction.userLikes,
        totalLikes: reaction.totalLikes,
        boostDislikes: reaction.boostDislikes,
        userDislikes: reaction.userDislikes,
        totalDislikes: reaction.totalDislikes,
        queuedDislikes: reaction.queuedDislikes,
        lastDislikeReflectedAt: reaction.lastDislikeReflectedAt,
      }
    })
  } catch (err) {
    console.error('Error updating reaction:', err)
    return res.status(500).json({ message: 'Failed to update reaction.' })
  }
}

