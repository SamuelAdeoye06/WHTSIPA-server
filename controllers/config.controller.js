import AdminConfig from '../models/adminConfig.model.js'

// One-time seed values — these are the exact numbers/handles that were
// hardcoded in Threats.jsx and Contact.jsx before Batch 4. Only used to
// backfill a worker list that's still empty, so existing deployments don't
// go blank the moment this ships. Once an admin adds/edits workers through
// the panel, this seed is never touched again.
const THREATS_SEED_WORKER = {
  name: 'WHTSIPA Threats Team',
  whatsapp: '16502814251',
  telegramHandle: 'WHTSIPA_DigitalTools',
  email: 'wehelptrackscammersipaddress@mail.com',
}

const CONTACT_SEED_WORKER = {
  name: 'WHTSIPA Support',
  whatsapp: '16502184673',
  telegramHandle: 'Wehelptrackscammersipaddress',
  email: 'wehelptrackscammersipaddress@mail.com',
}

// Was hardcoded in WhatsipModal.jsx's "Connect With Our Experts" /
// "Reach Us Instantly" quick-connect menu before Batch 4.
const HIRE_SEED_WORKER = {
  name: 'WHTSIPA Experts Team',
  whatsapp: '19293816441',
  telegramHandle: 'WHTSIPA_DigitalTools',
  email: 'support@whtsipa.com',
}

export const getConfig = async (req, res) => {
  try {
    let config = await AdminConfig.findOne({ key: 'main' })
    if (!config) {
      config = await AdminConfig.create({ key: 'main' })
    }

    // Backfill empty worker lists once, so the public pages never render
    // blank contact channels just because this feature is new.
    let needsSave = false
    if (config.threatsPageWorkers.length === 0) {
      config.threatsPageWorkers.push(THREATS_SEED_WORKER)
      config.activeThreatsWorkerId = config.threatsPageWorkers[0]._id.toString()
      needsSave = true
    }
    if (config.contactPageWorkers.length === 0) {
      config.contactPageWorkers.push(CONTACT_SEED_WORKER)
      config.activeContactWorkerId = config.contactPageWorkers[0]._id.toString()
      needsSave = true
    }
    if (config.hirePageWorkers.length === 0) {
      config.hirePageWorkers.push(HIRE_SEED_WORKER)
      config.activeHirePageWorkerId = config.hirePageWorkers[0]._id.toString()
      needsSave = true
    }
    if (needsSave) await config.save()

    return res.status(200).json(config)
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching configuration', error: error.message })
  }
}

export const updateConfig = async (req, res) => {
  try {
    // Worker lists and their "active" pointers are managed through the
    // dedicated /api/admin/config/:context/... endpoints (admin.controller.js)
    // so list mutations stay atomic. Strip them here so a generic settings
    // save can never accidentally wipe or desync a worker list.
    const {
      threatsPageWorkers, activeThreatsWorkerId,
      contactPageWorkers, activeContactWorkerId,
      hirePageWorkers, activeHirePageWorkerId,
      ...safeUpdates
    } = req.body

    const config = await AdminConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: safeUpdates },
      { new: true, upsert: true }
    )
    return res.status(200).json(config)
  } catch (error) {
    return res.status(500).json({ message: 'Error updating configuration', error: error.message })
  }
}
