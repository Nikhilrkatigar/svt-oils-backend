const isValidCoordinate = (value, min, max) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max
}

const buildAddress = (address = {}) => {
  const parts = [
    address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
    address.neighbourhood || address.suburb || address.village || address.town,
    address.city || address.county || address.state_district,
    address.state,
    address.postcode,
  ]

  return parts.filter(Boolean).join(', ')
}

// GET /api/location/reverse?lat=..&lng=..
export const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query

    if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required' })
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', lat)
    url.searchParams.set('lon', lng)
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('zoom', '18')

    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.GEOCODER_USER_AGENT || 'SVT Oils MERN App',
      },
    })

    if (!response.ok) {
      return res.status(502).json({ message: 'Could not read address for this location' })
    }

    const data = await response.json()
    const address = buildAddress(data.address) || data.display_name || ''

    res.json({
      address,
      displayName: data.display_name || address,
      lat: Number(lat),
      lng: Number(lng),
    })
  } catch (err) {
    next(err)
  }
}
