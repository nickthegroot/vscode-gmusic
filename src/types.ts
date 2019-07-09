export interface Track {
  title: string
  artist: string
  album: string
  albumArt: string
}

export interface GoogleMusicResponse {
  channel: string
  payload: any
}

export interface Rating {
  liked: boolean
  disliked: boolean
}
