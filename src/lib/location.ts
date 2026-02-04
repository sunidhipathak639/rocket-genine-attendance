export async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RocketGenieAttendance/1.0',
        },
      },
    )
    const data = await response.json()
    return data.display_name || 'Address not found'
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return 'Error fetching address'
  }
}
