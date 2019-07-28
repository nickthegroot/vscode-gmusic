import {
  window,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  env
} from 'vscode'
import {
  Track,
  Rating,
  GoogleMusicResponse,
  GoogleMusicResultResponse,
  GoogleMusicChannelResponse
} from './types'
import WebSocket = require('ws')
import Cache = require('vscode-cache')

/**
 * Constantly changing class that holds GPMDP data
 */
export default class GoogleMusic {
  private _statusBarItem: StatusBarItem

  private _track: Track
  public get track() {
    return this._track
  }
  private _rating: Rating
  private _playState: boolean
  private _shuffle: string
  private _repeat: string

  private ws: WebSocket

  public constructor(context: ExtensionContext) {
    // Create as needed
    if (!this._statusBarItem) {
      this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left)
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
      let gMusicResult: GoogleMusicResultResponse = gMusicResponse as GoogleMusicResultResponse
      if (gMusicResult.namespace) {
        switch (gMusicResult.requestID) {
          case 'extra.getTrackURL':
            window
              .showInformationMessage(
                `${this._track.title} - ${this._track.artist} \n ${gMusicResult.value}`,
                'Copy URL to clipboard'
              )
              .then(() => {
                env.clipboard.writeText(gMusicResult.value)
                window.showInformationMessage('URL copied to clipboard')
              })
            break
        }
        console.log(gMusicResponse)
      }
      let gMusicChannel: GoogleMusicChannelResponse = gMusicResponse as GoogleMusicChannelResponse
      switch (gMusicChannel.channel) {
        case 'connect':
          if (gMusicChannel.payload === 'CODE_REQUIRED') {
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
            codeCache.put('authCode', gMusicChannel.payload)
          }
          break
        case 'playState':
          this._playState = gMusicChannel.payload
          break
        case 'track':
          this._track = gMusicChannel.payload
          this.refreshStatusBar()
          break
        case 'rating':
          this._rating = gMusicChannel.payload
          break
        case 'shuffle':
          this._shuffle = gMusicChannel.payload
          break
        case 'repeat':
          this._repeat = gMusicChannel.payload
          break
        case 'time':
          break
        default:
          console.log(gMusicChannel.channel)
      }
    })

    this.ws.on('error', err =>
      window.showErrorMessage(
        `GMusic: WebSocket failed to connect ${err.message}`
      )
    )
  }

  public refreshStatusBar() {
    let textItem =
      this._track && this._track.title && this._track.artist
        ? '$(triangle-right) ' + this._track.title + ' - ' + this._track.artist
        : '$(primitive-square)'
    this._statusBarItem.text = textItem
    this._statusBarItem.show()
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
        arguments: mode
      })
    )
  }

  public getTrackURL() {
    this.ws.send(
      JSON.stringify({
        namespace: 'extras',
        method: 'getTrackURL',
        requestID: 'extra.getTrackURL'
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
    this._statusBarItem.dispose()
    this.ws.close()
  }
}
