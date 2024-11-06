export type LocationData = {
  time: Date
  lat: number
  lng: number
  alt: number
  type: LocationType
}

export type LocationType = 'GPS' | 'LBS'
