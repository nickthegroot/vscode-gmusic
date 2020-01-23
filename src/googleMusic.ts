import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem
} from 'vscode'
import {
  Track,
  Rating,
  GoogleMusicResponse,
  Button,
  RepeatMode,
  KeyedCollection
} from './types'
import { SimpleDictionary } from './utils'
import WebSocket = require('ws')
import Cache = require('vscode-cache')

/**
 * Constantly changing class that holds GPMDP data
 */
export default class GoogleMusic {
  private _nowPlayingStatusBarItem: StatusBarItem
  private _buttons: KeyedCollection<Button> = new SimpleDictionary<Button>()

  private _track: Track
  private _rating: Rating
  private _playState: boolean
  private _shuffle: string
  private _repeat: string
  private ws: WebSocket

  public constructor(context: ExtensionContext) {
    // Create as needed
    if (!this._nowPlayingStatusBarItem) {
      this._nowPlayingStatusBarItem = window.createStatusBarItem(
        StatusBarAlignment.Left
      )
    }
    if (this._buttons.Count() === 0) {
      this.createControlButtons()
    }

    this.ws = new WebSocket('ws://localhost:5672')
    let codeCache = new Cache(context)

    // Being "polite" and asking GPMDP if we can have control.
    this.ws.on('open', () => {
      if (codeCache.has('authCode')) {
        this.ws.send(
          JSON.stringify({
            namespace: 'connect',
            method: 'connect',
            arguments: ['vscode-gmusic', codeCache.get('authCode')]
          })
        )
      } else {
        this.ws.send(
          JSON.stringify({
            namespace: 'connect',
            method: 'connect',
            arguments: ['vscode-gmusic']
          })
        )
      }
    })

    // Receiving data from GPMDP.
    this.ws.on('message', data => {
      let gMusicResponse: GoogleMusicResponse = JSON.parse(data.toString())
      switch (gMusicResponse.channel) {
        case 'connect':
          if (gMusicResponse.payload === 'CODE_REQUIRED') {
            window
              .showInputBox({
                prompt: 'Please input the number shown on GPMDP'
              })
              .then(code => {
                this.ws.send(
                  JSON.stringify({
                    namespace: 'connect',
                    method: 'connect',
                    arguments: ['vscode-gmusic', code]
                  })
                )
              })
          } else {
            codeCache.put('authCode', gMusicResponse.payload)
          }
          break
        case 'playState':
          this._playState = gMusicResponse.payload
          this.refreshNowPlaying()
          this.updateDynamicButton('playpause', this._playState)
          break
        case 'track':
          this._track = gMusicResponse.payload
          this.refreshNowPlaying()
          break
        case 'rating':
          this._rating = gMusicResponse.payload
          break
        case 'shuffle':
          this._shuffle = gMusicResponse.payload
          break
        case 'repeat':
          this._repeat = gMusicResponse.payload
          this.updateRepeatButtonState()
          break
      }
    })

    this.ws.on('error', err =>
      window.showErrorMessage(
        `GMusic: WebSocket failed to connect ${err.message}`
      )
    )
  }

  private createControlButtons() {
    const buttons = [
      { id: 'rewind', title: 'Previous Song', text: '$(chevron-left)' },
      {
        id: 'playpause',
        title: 'Play / Pause',
        text: '$(triangle-right)',
        dynamicText: (currentlyPlaying: boolean) =>
          currentlyPlaying ? '$(primitive-square)' : '$(triangle-right)'
      },
      { id: 'skip', title: 'Next Song', text: '$(chevron-right)' },
      { id: 'cycleRepeat', title: 'Not Repeating', text: '$(sync)' }
    ]

    buttons.map(button => {
      const command = 'gmusic.' + button.id
      var statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left)
      statusBarItem.text = button.text
      statusBarItem.command = command
      statusBarItem.tooltip = button.title
      this._buttons.Add(
        button.id,
        Object.assign({}, button, { command, statusBarItem, isVisible: true })
      )
      statusBarItem.show()
    })
    this.updateRepeatButtonState() // Set the initial state of the repeat button
  }

  private updateRepeatButtonState() {
    const repeatButton = this._buttons.Item('cycleRepeat')
    if (repeatButton == null) {
      return // Button not created yet
    }
    const statusItem = repeatButton.statusBarItem
    switch (this._repeat) {
      case RepeatMode.None:
        statusItem.text = '$(sync)'
        statusItem.color = 'darkGrey'
        statusItem.tooltip = 'Not Repeating'
        break
      case RepeatMode.Playlist:
        statusItem.text = '$(sync)'
        statusItem.color = 'white'
        statusItem.tooltip = 'Repeating Playlist'
        break
      case RepeatMode.Song:
        statusItem.text = '$(issue-reopened)'
        statusItem.color = 'white'
        statusItem.tooltip = 'Repeating Song'
        break
    }
  }
  private updateDynamicButton(id: string, condition: boolean) {
    const button = this._buttons.Item(id)
    const text = button.dynamicText(condition)
    button.statusBarItem.text = text
  }

  public refreshNowPlaying() {
    let textItem = this.getNowPlayingText(this._track)
    if (textItem == null) {
      this._nowPlayingStatusBarItem.hide()
    }
    this._nowPlayingStatusBarItem.text = textItem
    this._nowPlayingStatusBarItem.show()
  }

  private getNowPlayingText(track: Track): string {
    if (track == null || track.title === null) {
      return null
    }
    return `${track.title} - ${track.artist}`
  }

  public cycleRepeat() {
    switch (this._repeat) {
      case RepeatMode.None:
        this.toggleRepeat(RepeatMode.Playlist)
        break
      case RepeatMode.Playlist:
        this.toggleRepeat(RepeatMode.Song)
        break
      case RepeatMode.Song:
        this.toggleRepeat(RepeatMode.None)
        break
    }
  }

  public togglePlay() {
    this.ws.send(
      JSON.stringify({
        namespace: 'playback',
        method: 'playPause',
        arguments: null
      })
    )
  }

  public forward() {
    this.ws.send(
      JSON.stringify({
        namespace: 'playback',
        method: 'forward',
        arguments: null
      })
    )
  }

  public rewind() {
    this.ws.send(
      JSON.stringify({
        namespace: 'playback',
        method: 'rewind',
        arguments: null
      })
    )
  }

  public toggleShuffle() {
    this.ws.send(
      JSON.stringify({
        namespace: 'playback',
        method: 'toggleShuffle',
        arguments: null
      })
    )
  }

  public toggleRepeat(mode: string) {
    this.ws.send(
      JSON.stringify({
        namespace: 'playback',
        method: 'setRepeat',
        arguments: [mode]
      })
    )
  }

  public thumbsUp() {
    if (!this._rating.liked) {
      this.ws.send(
        JSON.stringify({
          namespace: 'rating',
          method: 'toggleThumbsUp',
          arguments: null
        })
      )
    }
  }

  public thumbsDown() {
    if (!this._rating.disliked) {
      this.ws.send(
        JSON.stringify({
          namespace: 'rating',
          method: 'toggleThumbsDown',
          arguments: null
        })
      )
    }
  }

  public removeThumbs() {
    this.ws.send(
      JSON.stringify({
        namespace: 'rating',
        method: 'resetRating',
        arguments: null
      })
    )
  }

  public dispose() {
    this._nowPlayingStatusBarItem.dispose()
    this._buttons.Values().forEach(button => {
      button.statusBarItem.dispose()
    })
    this.ws.close()
    process.nextTick(() => {
      if ([this.ws.OPEN, this.ws.CLOSING].includes(this.ws.readyState)) {
        // Socket still hangs, hard close
        this.ws.terminate()
      }
    })
  }
}
