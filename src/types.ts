export interface Track {
  title: string
  artist: string
  album: string
  albumArt: string
}

type GoogleMusicChannels =
  | 'connect'
  | 'playState'
  | 'track'
  | 'rating'
  | 'shuffle'
  | 'repeat'

export interface GoogleMusicResponse {
  channel: GoogleMusicChannels
  payload: any
}

export interface Rating {
  liked: boolean
  disliked: boolean
}
