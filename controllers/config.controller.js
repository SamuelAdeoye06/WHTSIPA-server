import AdminConfig from '../models/adminConfig.model.js'

export const getConfig = async (req, res) => {
  try {
    let config = await AdminConfig.findOne({ key: 'main' })
    if (!config) {
      config = await AdminConfig.create({ key: 'main' })
    }
    return res.status(200).json(config)
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching configuration', error: error.message })
  }
}

export const updateConfig = async (req, res) => {
  try {
    const config = await AdminConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: req.body },
      { new: true, upsert: true }
    )
    return res.status(200).json(config)
  } catch (error) {
    return res.status(500).json({ message: 'Error updating configuration', error: error.message })
  }
}
