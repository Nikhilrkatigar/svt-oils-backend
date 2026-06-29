import Settings from '../models/Settings.js'

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create({ bulkOrderPhone: '', supportPhone: '' })
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' })
  }
}

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  try {
    const { bulkOrderPhone, supportPhone } = req.body

    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }

    settings.bulkOrderPhone = bulkOrderPhone != null ? bulkOrderPhone.trim() : settings.bulkOrderPhone
    settings.supportPhone = supportPhone != null ? supportPhone.trim() : settings.supportPhone

    await settings.save()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' })
  }
}
