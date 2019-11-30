import { StatusBarItem } from 'vscode'

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

export enum RepeatMode {
  None = 'NO_REPEAT',
  Playlist = 'LIST_REPEAT',
  Song = 'SINGLE_REPEAT'
}

export interface Button {
  id: string
  title: string
  command: string
  text: string
  dynamicText?: (cond: boolean) => string
  statusBarItem: StatusBarItem
  isVisible: boolean
}

export interface KeyedCollection<T> {
  Add(key: string, value: T)
  ContainsKey(key: string): boolean
  Count(): number
  Item(key: string): T | null | undefined
  Keys(): string[]
  Remove(key: string): void
  Values(): T[]
}
