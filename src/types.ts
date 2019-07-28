export interface Track {
  title: string
  artist: string
  album: string
  albumArt: string
  id: string // Unique ID for this song
  index: number // The index position (starting at 1) of the track in the playlist
  duration: number // Duration of song in milliseconds
  playCount: number // Number of times the user has played this song
}

type GoogleMusicChannels =
  | 'connect'
  | 'playState'
  | 'track'
  | 'rating'
  | 'shuffle'
  | 'repeat'
  | 'playlists'
  | 'queue'
  | 'time'

export type GoogleMusicResponse =
  | GoogleMusicResultResponse
  | GoogleMusicChannelResponse

export interface GoogleMusicResultResponse {
  namespace: GoogleMusicChannels
  requestID: string
  value: string
}

export interface GoogleMusicChannelResponse {
  channel: GoogleMusicChannels
  payload: any
}

export interface Rating {
  liked: boolean
  disliked: boolean
}
